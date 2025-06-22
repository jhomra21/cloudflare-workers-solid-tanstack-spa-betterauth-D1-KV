import { betterAuth } from "better-auth";
import { D1Dialect } from "kysely-d1";
import type { D1Database, KVNamespace } from "@cloudflare/workers-types";

type Env = {
    DB: D1Database;
    SESSIONS: KVNamespace;
    BETTER_AUTH_SECRET: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
}

const hashPassword = async (password: string): Promise<string> => {
    // Use WebCrypto PBKDF2 - native in Cloudflare Workers, ~1-2ms CPU
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
            iterations: 1000, // 1k iterations - minimal for Workers CPU limits
            hash: 'SHA-256'
        },
        key,
        256 // 32 bytes = 256 bits
    );
    
    // Convert to hex strings for storage
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const keyHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    return `${saltHex}:${keyHex}`;
};

const verifyPassword = async (hashedPassword: string, password: string): Promise<boolean> => {
    try {
        const [saltHex, keyHex] = hashedPassword.split(":");
        if (!saltHex || !keyHex) {
            return false;
        }
        
        // Convert hex strings back to Uint8Arrays
        const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
        const expectedKey = new Uint8Array(keyHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
        
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
                iterations: 1000, // Same as hashing
                hash: 'SHA-256'
            },
            key,
            256
        );
        
        const derivedKey = new Uint8Array(derivedBits);
        
        // Constant-time comparison
        if (derivedKey.length !== expectedKey.length) {
            return false;
        }
        
        let result = 0;
        for (let i = 0; i < derivedKey.length; i++) {
            result |= derivedKey[i] ^ expectedKey[i];
        }
        
        return result === 0;
    } catch (error) {
        return false;
    }
};

// Simple module-level cache - only in production where env is stable
let cachedAuth: ReturnType<typeof betterAuth> | null = null;

export const getAuth = (env: Env) => {
    // Only cache when DB is available and valid (skip in dev where DB might be unstable)
    const shouldCache = env.DB && typeof env.DB.prepare === 'function';
    
    if (shouldCache && !cachedAuth) {
        cachedAuth = betterAuth({
        secret: env.BETTER_AUTH_SECRET,
        database: {
            dialect: new D1Dialect({ database: env.DB }),
            type: "sqlite"
        },
        secondaryStorage: {
            get: async (key) => await env.SESSIONS.get(key),
            set: async (key, value, ttl) => {
                await env.SESSIONS.put(key, value, { expirationTtl: ttl });
            },
            delete: async (key) => await env.SESSIONS.delete(key),
        },
        emailAndPassword: { 
            enabled: true,
        },
        password: {
            hash: hashPassword,
            verify: verifyPassword,
        },
        user: {
            deleteUser: {
                enabled: true
            }
        },
        socialProviders: {
            google: {
                prompt: "select_account",
                clientId: env.GOOGLE_CLIENT_ID,
                clientSecret: env.GOOGLE_CLIENT_SECRET,
            }
        }
        });
    }
    
    // Return cached instance if available, otherwise create fresh
    if (shouldCache && cachedAuth) {
        return cachedAuth;
    }
    
    // Development or when caching not possible - create fresh instance
    return betterAuth({
        secret: env.BETTER_AUTH_SECRET,
        database: {
            dialect: new D1Dialect({ database: env.DB }),
            type: "sqlite"
        },
        secondaryStorage: {
            get: async (key) => await env.SESSIONS.get(key),
            set: async (key, value, ttl) => {
                await env.SESSIONS.put(key, value, { expirationTtl: ttl });
            },
            delete: async (key) => await env.SESSIONS.delete(key),
        },
        emailAndPassword: { 
            enabled: true,
        },
        password: {
            hash: hashPassword,
            verify: verifyPassword,
        },
        user: {
            deleteUser: {
                enabled: true
            }
        },
        socialProviders: {
            google: {
                prompt: "select_account",
                clientId: env.GOOGLE_CLIENT_ID,
                clientSecret: env.GOOGLE_CLIENT_SECRET,
            }
        }
    });
};
