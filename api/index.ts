import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getAuth } from '../auth'
import type { D1Database, KVNamespace, DurableObjectNamespace, Fetcher, DurableObject } from '@cloudflare/workers-types';


// This is a common pattern to get types from a factory function without executing it.
const authForTypes = getAuth({} as any);

type Env = {
    ASSETS: Fetcher;
    DB: D1Database;
    SESSIONS: KVNamespace;
    BETTER_AUTH_SECRET: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    FAL_KEY: string;
    NODE_ENV?: string;
};

type HonoVariables = {
    user: typeof authForTypes.$Infer.Session.user | null;
    session: typeof authForTypes.$Infer.Session.session | null;
}

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>()

app.use('/api/*', cors({
  origin: (origin) => {
    const allowedOrigins = [
        'http://localhost:3000', 
        'http://localhost:3001',
        'http://localhost:4173', 
        'http://localhost:5173', 
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
    ];
    if (!origin || allowedOrigins.includes(origin)) {
        return origin || '*';
    }
    return null; 
  },
  allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE', 'HEAD', 'PATCH'],
}));

// Middleware to get user session, must be defined before routes that need it.
app.use('/api/*', async (c, next) => {
  // We don't want to run this on the auth routes themselves.
  if (c.req.path.startsWith('/api/auth')) {
    return await next();
  }

  const auth = getAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  
  if (!session) {
    c.set("user", null);
    c.set("session", null);
  } else {
    c.set('user', session.user);
    c.set('session', session.session);
  }
  await next();
});

app.get('/api/', (c) => {
  return c.json({
    name: 'Hono + Cloudflare Workers',
  });
});

app.all('/api/auth/*', (c) => {
  return getAuth(c.env).handler(c.req.raw);
});



export default app;