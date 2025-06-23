import { betterAuth } from "better-auth";
import { D1Dialect } from "kysely-d1";
import type { D1Database, KVNamespace } from "@cloudflare/workers-types";

// Define the environment variables required by the application
type Env = {
    DB: D1Database;
    SESSIONS: KVNamespace; // Kept in type in case other parts of the app use it, but auth won't.
    BETTER_AUTH_SECRET: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
}

const hashPassword = async (password: string): Promise<string> => {
    // Use WebCrypto PBKDF2 - native in Cloudflare Workers. Faster but less secure than scrypt/argon2.
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const passwordBuffer = new TextEncoder().encode(password);
    
    const key = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveBits']
    );
    
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            // WARNING: Iterations are dangerously low for security. This is a temporary
            // workaround for free-tier CPU limits. Increase for production.
            iterations: 100, 
            hash: 'SHA-256'
        },
        key,
        256 // 32 bytes = 256 bits
    );
    
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const keyHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    return `${saltHex}:${keyHex}`;
};

const verifyPassword = async (hashedPassword: string, password: string): Promise<boolean> => {
    try {
        const [saltHex, keyHex] = hashedPassword.split(":");
        if (!saltHex || !keyHex) return false;
        
        const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
        const expectedKey = new Uint8Array(keyHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
        
        const passwordBuffer = new TextEncoder().encode(password);
        
        const key = await crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, ['deriveBits']);
        
        const derivedBits = await crypto.subtle.deriveBits(
            // Ensure iterations match the hashing function
            { name: 'PBKDF2', salt, iterations: 100, hash: 'SHA-256' },
            key,
            256
        );
        
        const derivedKey = new Uint8Array(derivedBits);
        
        if (derivedKey.length !== expectedKey.length) return false;
        
        let result = 0;
        for (let i = 0; i < derivedKey.length; i++) {
            result |= derivedKey[i] ^ expectedKey[i];
        }
        
        return result === 0;
    } catch (error) {
        return false;
    }
};

// Cache the auth instance to avoid re-initialization on every request in a warm worker
let cachedAuth: ReturnType<typeof betterAuth> | null = null;

export const getAuth = (env: Env) => {
    // In local dev, env bindings can be undefined on initial server startup.
    // We only cache the auth instance if it's created with a valid environment.
    const isEnvValid = env.DB && typeof env.DB.prepare === 'function' && env.SESSIONS;

    // If the environment is valid and we have a cached instance, return it.
    if (isEnvValid && cachedAuth) {
        return cachedAuth;
    }

    // Create a new instance.
    const authInstance = betterAuth({
        secret: env.BETTER_AUTH_SECRET,
        database: {
            dialect: new D1Dialect({ database: env.DB }),
            type: "sqlite"
        },
        password: {
            hash: hashPassword,
            verify: verifyPassword,
        },
        emailAndPassword: { 
            enabled: true,
        },
        user: {
            deleteUser: {
                enabled: true
            }
        },
        secondaryStorage: {
            get: async (key) => await env.SESSIONS.get(key),
            set: async (key, value, ttl) => {
                await env.SESSIONS.put(key, value, { expirationTtl: ttl });
            },
            delete: async (key) => await env.SESSIONS.delete(key),
        },
        socialProviders: {
            google: {
                prompt: "select_account",
                clientId: env.GOOGLE_CLIENT_ID,
                clientSecret: env.GOOGLE_CLIENT_SECRET,
            }
        }
    });

    // If the environment was valid, cache this new instance for subsequent requests.
    if (isEnvValid) {
        cachedAuth = authInstance;
    }

    return authInstance;
};
