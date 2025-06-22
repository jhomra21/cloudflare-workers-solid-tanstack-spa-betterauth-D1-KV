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

// Warmup endpoint - pre-initializes betterAuth and critical paths
app.get('/api/warmup', async (c) => {
  try {
    // Trigger betterAuth initialization
    const auth = getAuth(c.env);
    
    // Pre-warm critical auth paths (without actual auth)
    // This forces DB connection, query compilation, etc.
    await auth.api.getSession({ headers: new Headers() }).catch(() => {});
    
    return c.text('warm', 200);
  } catch (error) {
    // Silent fail - warmup is optional
    return c.text('cold', 200);
  }
});

app.all('/api/auth/*', (c) => {
  return getAuth(c.env).handler(c.req.raw);
});

// Update password endpoint - following Better Auth server-side pattern
app.put('/api/update-password', async (c) => {
  try {
    // Use session from middleware context (Better Auth Hono pattern)
    const user = c.get('user');
    const session = c.get('session');
    
    if (!user || !session) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { currentPassword, newPassword } = await c.req.json();
    
    if (!currentPassword || !newPassword) {
      return c.json({ error: 'Current password and new password are required' }, 400);
    }

    const auth = getAuth(c.env);
    
    // Verify current password by attempting sign-in (Better Auth way)
    try {
      await auth.api.signInEmail({
        body: { email: user.email, password: currentPassword }
      });
    } catch (signInError) {
      return c.json({ error: 'Current password is incorrect' }, 400);
    }

    // Use Better Auth's server-side password update pattern
    const ctx = await auth.$context;
    const hashedPassword = await ctx.password.hash(newPassword);
    await ctx.internalAdapter.updatePassword(user.id, hashedPassword);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Password update error:', error);
    return c.json({ error: 'Failed to update password' }, 500);
  }
});

export default app;