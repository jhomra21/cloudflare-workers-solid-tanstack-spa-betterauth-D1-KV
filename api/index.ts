import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getAuth } from '../auth'
import type { Env, HonoVariables } from './types'
import notesApi from './notes'

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

// Mount the notes API routes
app.route('/api/notes/', notesApi);

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