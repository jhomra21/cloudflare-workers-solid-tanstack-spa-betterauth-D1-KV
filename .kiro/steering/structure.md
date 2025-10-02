# Project Structure & Organization

## Root Directory Structure
```
├── .kiro/              # Kiro IDE configuration and steering
├── api/                # Cloudflare Workers API (Hono.js)
├── convex/             # Convex backend functions and schema
├── migrations/         # D1 database migrations
├── public/             # Static assets
├── src/                # Frontend source code
├── auth.ts             # Better-auth configuration
├── wrangler.jsonc      # Cloudflare Workers config
└── vite.config.ts      # Vite build configuration
```

## Frontend Structure (`src/`)
```
src/
├── components/         # Reusable UI components
│   ├── ui/            # Base UI components (buttons, inputs, etc.)
│   ├── *Agent.tsx     # AI agent components (Image, Video, Voice)
│   ├── *Canvas*.tsx   # Canvas-related components
│   └── nav-user.tsx   # Navigation and user components
├── lib/               # Utility libraries and hooks
│   ├── hooks/         # Custom SolidJS hooks
│   ├── utils/         # Utility functions
│   ├── auth-*.ts      # Authentication utilities
│   ├── convex.ts      # Convex client setup
│   └── *-actions.ts   # TanStack Query mutations
├── routes/            # File-based routing (TanStack Router)
│   ├── api/           # API route handlers for OAuth callbacks
│   ├── dashboard/     # Protected dashboard routes
│   ├── __root.tsx     # Root layout component
│   └── *.tsx          # Page components
├── types/             # TypeScript type definitions
└── main.tsx           # Application entry point
```

## Backend Structure
```
api/                   # Cloudflare Workers API
├── index.ts          # Main API entry point (Hono.js)
└── drizzle.config.ts # Database configuration

convex/               # Convex real-time backend
├── _generated/       # Auto-generated Convex files
├── schema.ts         # Database schema definitions
└── *.ts             # Convex functions (queries, mutations, actions)
```

## Key Architectural Patterns

### Component Organization
- **UI Components**: Base components in `src/components/ui/`
- **Feature Components**: Domain-specific components at root of `src/components/`
- **Memoized Components**: Performance-optimized versions prefixed with `Memoized*`

### State Management
- **Server State**: TanStack Query for API data and caching
- **Local State**: SolidJS stores and signals
- **Authentication**: Centralized session management via TanStack Query

### Routing Structure
- **File-based**: Routes mirror file structure in `src/routes/`
- **Layouts**: Nested layouts using TanStack Router
- **Protection**: Route-level authentication guards

### Data Layer
- **Convex**: Real-time data (tasks, canvases, agents)
- **D1**: Authentication and user data
- **KV**: Session storage and caching

## Naming Conventions
- **Components**: PascalCase (e.g., `ImageAgent.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAgentManagement`)
- **Actions**: camelCase with descriptive suffix (e.g., `auth-actions.ts`)
- **Types**: PascalCase interfaces (e.g., `AgentData`)
- **Files**: kebab-case for utilities, PascalCase for components

## Import Patterns
- **Relative imports**: For local files
- **Alias imports**: `~/` for src root (configured in tsconfig)
- **External libraries**: Direct imports from node_modules
- **Convex**: Import from generated API (`../../convex/_generated/api`)