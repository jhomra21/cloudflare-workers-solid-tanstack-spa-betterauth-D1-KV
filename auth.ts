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

// Helper function to convert ArrayBuffer to hex string
const bufferToHex = (buffer: ArrayBuffer): string => {
    return [...new Uint8Array(buffer)]
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
};

// Helper function to convert hex string to ArrayBuffer
const hexToBuffer = (hex: string): ArrayBuffer => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes.buffer;
};

// Configuration for PBKDF2 hashing. These values are a good balance of security and performance for a serverless environment.
const PBKDF2_ITERATIONS = 25000;
const PBKDF2_SALT_LENGTH = 16; // 128 bits
const PBKDF2_HASH_LENGTH = 32; // 256 bits
const PBKDF2_ALGORITHM = 'PBKDF2';
const HASH_ALGORITHM = 'SHA-256';

/**
 * Hashes a password using PBKDF2 with SHA-256.
 * The salt and iteration count are stored with the hash for future verification.
 * Format: algorithm$iterations$salt$hash
 */
const hashPassword = async (password: string): Promise<string> => {
    const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_LENGTH));

    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        { name: PBKDF2_ALGORITHM },
        false,
        ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: PBKDF2_ALGORITHM,
            salt: salt,
            iterations: PBKDF2_ITERATIONS,
            hash: HASH_ALGORITHM,
        },
        keyMaterial,
        PBKDF2_HASH_LENGTH * 8 // length in bits
    );

    const saltHex = bufferToHex(salt.buffer);
    const hashHex = bufferToHex(derivedBits);

    return `${PBKDF2_ALGORITHM}$${PBKDF2_ITERATIONS}$${saltHex}$${hashHex}`;
};

/**
 * Verifies a password against a stored PBKDF2 hash.
 * It uses a constant-time comparison to prevent timing attacks.
 */
const verifyPassword = async (hashString: string, password: string): Promise<boolean> => {
    try {
        const parts = hashString.split('$');
        if (parts.length !== 4) {
            console.error("Invalid hash string format");
            return false;
        }
        const [algorithm, iterationsStr, saltHex, storedHashHex] = parts;
        
        if (algorithm !== PBKDF2_ALGORITHM) {
            console.error("Unsupported hash algorithm");
            return false;
        }

        const iterations = parseInt(iterationsStr, 10);
        const salt = hexToBuffer(saltHex);
        const storedHash = hexToBuffer(storedHashHex);

        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(password),
            { name: PBKDF2_ALGORITHM },
            false,
            ['deriveBits']
        );

        const derivedBits = await crypto.subtle.deriveBits(
            {
                name: PBKDF2_ALGORITHM,
                salt: salt,
                iterations: iterations,
                hash: HASH_ALGORITHM,
            },
            keyMaterial,
            PBKDF2_HASH_LENGTH * 8
        );

        // It's crucial to use a constant-time comparison to prevent timing attacks.
        // `crypto.subtle.timingSafeEqual` is designed for this. We explicitly create
        // Uint8Array views to ensure type compatibility and resolve potential linting issues.
        const storedHashView = new Uint8Array(storedHash);
        const derivedBitsView = new Uint8Array(derivedBits);

        if (storedHashView.byteLength !== derivedBitsView.byteLength) {
            return false;
        }

        return await crypto.subtle.timingSafeEqual(storedHashView, derivedBitsView);

    } catch (e) {
        console.error("Error during password verification:", e);
        return false;
    }
};

export const getAuth = (env: Env) => {
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
        socialProviders: {
            google: {
                prompt: "select_account",
                clientId: env.GOOGLE_CLIENT_ID,
                clientSecret: env.GOOGLE_CLIENT_SECRET,
            }
        }
    });
};