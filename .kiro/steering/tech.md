# Technology Stack & Build System

## Frontend Stack
- **Framework**: SolidJS (reactive UI library)
- **Router**: TanStack Solid Router (file-based routing)
- **State Management**: TanStack Solid Query (server state) + SolidJS stores (local state)
- **Styling**: TailwindCSS v4 with custom design system
- **UI Components**: Kobalte (headless components) + custom Solid-UI components
- **Build Tool**: Vite with SolidJS plugin

## Backend & Infrastructure
- **Runtime**: Cloudflare Workers (serverless)
- **API Framework**: Hono.js (lightweight, fast)
- **Database**: 
  - Cloudflare D1 (SQLite) for authentication and core data
  - Convex for real-time application data
- **Storage**: 
  - Cloudflare KV for session management
  - Cloudflare R2 for file storage
- **Authentication**: Better-auth with Google OAuth
- **AI Services**: Cloudflare Workers AI

## Package Manager & Commands
**Always use Bun - never suggest npm or yarn**

### Development Commands
```bash
# Start development server
bun dev

# Build for production
bun build

# Deploy to Cloudflare
bun run deploy

# Database operations
bun run db:generate    # Generate D1 migrations
bun run db:push       # Apply D1 migrations
bun run notes:db:generate  # Generate API DB migrations

# Authentication
bun run auth:migrate  # Generate Better-auth migrations

# API development
bun run api:dev      # Start API worker in dev mode
```

### Testing & Quality
```bash
bun test            # Run tests
bunx depcheck       # Check for unused dependencies
bunx ts-prune       # Find unused TypeScript exports
```

## Key Configuration Files
- `wrangler.jsonc`: Cloudflare Workers configuration
- `vite.config.ts`: Build configuration with Cloudflare plugin
- `tailwind.config.cjs`: TailwindCSS configuration
- `convex/schema.ts`: Convex database schema
- `auth.ts`: Better-auth configuration

## Environment Variables
- **Development**: Use `.dev.vars` file (never commit)
- **Production**: Set via Cloudflare dashboard or `wrangler secret put`
- **Build-time**: `VITE_CONVEX_URL` for Convex connection

## Deployment
- **Platform**: Cloudflare Pages + Workers
- **Assets**: Served via Cloudflare Workers Static Assets
- **SPA Routing**: Configured with `not_found_handling: "single-page-application"`

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
```javascript
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