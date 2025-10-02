# AGENT GUIDE

## Commands
- **Development**: `bun dev` (runs on port 3000 with Cloudflare Vite Plugin)
- **Build**: `bun run build`
- **Testing**: `bun run test` (Vitest)
- **Backend**: `bun run api:dev` (Hono API worker)
- **Auth Migration**: `bunx @better-auth/cli generate`
- **DB Migration**: `wrangler d1 migrations apply <DB_NAME> --remote`
- **Deploy**: `wrangler deploy`

## Architecture
- **Frontend**: SolidJS SPA with TanStack Router/Query, Tailwind, solid-ui components
- **Backend**: Hono server on Cloudflare Workers with BetterAuth
- **Database**: D1 SQLite for auth data, KV for sessions
- **Auth**: Google OAuth + email/password, session caching via TanStack Query
- **Entry points**: `src/main.tsx` (frontend), `api/index.ts` (backend), `auth.ts` (auth config)

## Code Style
- **Package manager**: Always use Bun, never npm
- **TypeScript**: Strict mode, explicit return types for complex functions
- **Imports**: Multi-line format, external libs first, path alias `~/` for src
- **Components**: PascalCase, function components, destructured props with `splitProps()`
- **SolidJS**: Use `createMemo()`, `Show`, `For`, `children()` helper, `class` not `className`
- **File naming**: kebab-case (auth-client.ts), descriptive with context
- **Styling**: Tailwind + `cn()` utility (clsx + tailwind-merge), solid-ui library
- **Auth**: Client-side OAuth callbacks via fetch shim to handle SPA routing

## SolidJS Reactivity Guidelines ⚠️

**AVOID CIRCULAR DEPENDENCIES** - These cause "too much recursion" errors:

### ❌ Dangerous Patterns:
```javascript
// DON'T: Effect that reads query data and updates state affecting same query
createEffect(() => {
  const data = someQuery.data(); 
  setSomeState(data.map(...)); // Can trigger infinite re-renders
});

// DON'T: Memos for simple calculations
const size = createMemo(() => props.size || { width: 320, height: 384 });

// DON'T: Creating memos inside render loops
<For each={items}>
  {(item) => {
    const computed = createMemo(() => item.data); // Created on every render!
    return <div>{computed()}</div>;
  }}
</For>

// DON'T: Using function as its own default context
const context = contextObject || myFunction; // Self-reference
```

### ✅ Safe Patterns:
```javascriptbbb
// DO: Guard effects with change detection
createEffect(() => {
  const data = someQuery.data();
  if (!data || !hasActuallyChanged(data)) return;
  
  batch(() => { // Group state updates
    setSomeState(newValue);
    setOtherState(otherValue);
  });
});

// DO: Simple functions for basic calculations  
const size = () => props.size || { width: 320, height: 384 };

// DO: Create memos outside render loops
const computed = createMemo(() => items().map(item => transform(item)));

// DO: Use stable default contexts
const defaultContext = {};
const context = contextObject || defaultContext;
```

### Key Rules:
1. **Effects should not update state that affects their own dependencies**
2. **Use `batch()` to group related state updates**  
3. **Add guards to prevent unnecessary effect runs**
4. **Create memos at component level, not inside loops**
5. **Avoid self-referential contexts/defaults**
