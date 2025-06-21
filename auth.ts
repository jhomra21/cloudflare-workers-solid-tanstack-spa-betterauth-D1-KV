import { betterAuth } from "better-auth";
import { D1Dialect } from "kysely-d1";
import type { D1Database, KVNamespace } from "@cloudflare/workers-types";
import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";

type Env = {
    DB: D1Database;
    SESSIONS: KVNamespace;
    BETTER_AUTH_SECRET: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
}

const hashPassword = (password: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const salt = randomBytes(16).toString("hex");
        // N: 16384 is the recommended cost factor for scrypt.
        // This is too high for CF workers free plan.
        // We are tuning it down to 1024 to avoid CPU limits.
        scrypt(password, salt, 64, { N: 1024 }, (err, derivedKey) => {
            if (err) reject(err);
            else resolve(`${salt}:${derivedKey.toString("hex")}`);
        });
    });
};

const verifyPassword = (hashedPassword: string, password: string): Promise<boolean> => {
    return new Promise((resolve) => {
        const [salt, key] = hashedPassword.split(":");
        if (!salt || !key) {
            return resolve(false);
        }
        const keyBuffer = Buffer.from(key, "hex");
        scrypt(password, salt, 64, { N: 1024 }, (err, derivedKey) => {
            if (err) {
                return resolve(false);
            }
            if (derivedKey.length !== keyBuffer.length) {
                return resolve(false);
            }
            resolve(timingSafeEqual(derivedKey, keyBuffer));
        });
    });
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