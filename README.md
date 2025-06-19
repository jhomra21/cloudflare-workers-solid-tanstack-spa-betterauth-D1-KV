# SolidJS + Tanstack Router + Better Auth + Cloudflare + Vite

This template should help get you started developing with SolidJS and TypeScript in Vite.

The template uses [Vite](https://vitejs.dev/), [Solid-js](https://www.solidjs.com/), [Tanstack Solid Router](https://tanstack.com/router/v1/docs/adapters/solid-router), [Better-auth](https://better-auth.dev/), and [Cloudflare](https://www.cloudflare.com/).

## Getting Started

# SolidJS & Cloudflare Full-Stack Template

A comprehensive template for building modern web applications using SolidJS on the frontend and a Cloudflare-powered backend. This template integrates Better Auth for authentication, Cloudflare D1 for database storage, Cloudflare Workers for serverless APIs, and client hosting, and Cloudflare KV for session management.

## 🌟 Core Features

### 🔐 **Robust Authentication**
- **Better Auth Integration**: Secure authentication system with support for Google OAuth and email/password.
- **Cloudflare D1**: Stores user and authentication data.
- **Cloudflare KV**: Used for fast session validation at the edge.

### 🏗️ **Modern Architecture**
- **SolidJS Frontend**: Reactive UI with TanStack Router for file-based routing and TanStack Query for server state management.
- **Hono.js API**: Lightweight, fast API layer running on Cloudflare Workers.
- **Cloudflare Stack**: Leverages Cloudflare D1, KV, Workers for a scalable and performant infrastructure.

## 🚀 Technical Implementation

### **Database Architecture**
This project uses a Cloudflare-centric database strategy:

- **Cloudflare D1** (SQLite): Centralized storage for authentication data (users, accounts, etc.) and application data.
- **Cloudflare KV**: Utilized for session storage, enabling fast edge validation of user sessions.

### Client-Side Authentication & State Management

User authentication state on the client is managed by TanStack Query, providing a robust, cacheable, and reactive "source of truth" for the user's session.

-   **Session Caching**: A global query with the key `['session']` is responsible for fetching and caching the user's session data. This is defined in `src/lib/auth-guard.ts` within `sessionQueryOptions`.
-   **API Client**: The `better-auth/client` library, initialized in `src/lib/auth-client.ts`, handles the low-level communication with the backend authentication API (e.g., fetching the session, signing out).
-   **Route Protection**: TanStack Router's `loader` functions are used to protect routes. The `protectedLoader` in `src/lib/auth-guard.ts` ensures that a valid session exists before rendering a protected route, redirecting to `/auth` if not.
-   **Sign-Out**: The `useSignOut` hook in `src/lib/auth-actions.ts` orchestrates the sign-out process by calling the auth client, manually clearing the `['session']` from the query cache for immediate UI updates, and redirecting the user.

This setup decouples the UI components from the authentication logic, allowing components to simply use the data from the `['session']` query to render user-specific content.

## 🛠 Tech Stack

### **Backend**
- **Hono.js**: Fast, lightweight API framework running on Cloudflare Workers.
- **Better Auth**: Authentication system utilizing Cloudflare D1 for user data storage.
- **Cloudflare D1**: Primary database for application and authentication data.
- **Cloudflare KV**: Key-value store for session management.

### **Frontend**
- **SolidJS**: Reactive UI framework.
- **TanStack Router**: File-based routing with loaders and type safety.
- **TanStack Query**: Server state management with features like optimistic updates.
- **TailwindCSS + solid-ui (shadcn for solidjs)**: Modern, accessible component library.

### **Infrastructure**
- **Cloudflare Workers**: Frontend Client and Serverless API deployment.
- **Cloudflare D1**: SQL database for persistent data storage.
- **Cloudflare KV**: Edge key-value storage.
- **Durable Objects**: Voice chat rooms


## 📁 Project Structure

## Database Migrations (D1)

To apply schema changes to the remote Cloudflare D1 database, we use migrations.

### Initial Setup & Local Development

To set up your local D1 database for the first time, you need to apply the initial migration. This command executes the SQL files in the `migrations/` folder (starting with `0000_initial.sql`) to create the required tables for `better-auth`.

Run the following command in your terminal:
```bash
wrangler d1 migrations apply <D1 database_name> --local
```
This ensures your local database schema is in sync with the application's requirements. 
For remote databases, you would use the `--remote` flag instead, like this:
```bash
wrangler d1 migrations apply <D1 database_name> --remote
```

### Workflow for DB Changes

1.  **Create a New Migration File**:
    -   In the `migrations` directory, create a new SQL file.
    -   The filename must start with a number that is higher than the previous one (e.g., `migrations/0001_add_new_field.sql`).

2.  **Add SQL Commands**:
    -   In the new file, write the `ALTER TABLE`, `CREATE TABLE`, or other SQL commands needed for the change.
    -   Example: `ALTER TABLE "user" ADD COLUMN bio TEXT;`

3.  **Apply the Migration**:
    -   Run the following command in your terminal. Wrangler is smart enough to only apply new, unapplied migrations.
    -   `wrangler d1 migrations apply <YOUR_DB_NAME> --remote`

## Environment Variables & Secrets

> [!IMPORTANT]
> **Client-Side Build Variables in Cloudflare Workers**
> Due to the Cloudflare Vite plugin integration, frontend environment variables (e.g., `VITE_...`) are *not* sourced from your Worker's main variables and secrets. They **must** be defined in the Cloudflare Workers *build* settings. Navigate to your worker's **Settings > Build > Variables and Secrets** to add them.

> [!NOTE]
> **Managing Backend Secrets**
> Only non-sensitive configuration values should be stored in the `vars` section of `wrangler.jsonc`. All sensitive keys (like API tokens) should be added to your Cloudflare Worker using the `wrangler secret put <KEY_NAME>` command. This practice ensures that secrets are not committed to your version control history.

## Development Notes

### OAuth Callback Handling in Development

> [!NOTE]
> **OAuth Callback**
> When using a Single-Page Application (SPA) framework like SolidJS with Cloudflare Workers and the Cloudflare Vite plugin, a specific challenge arises with OAuth callbacks (e.g., from Google Sign-In) in the local development environment.

**The Problem:**

Cloudflare's SPA configuration (`"not_found_handling": "single-page-application"`) is designed to serve your `index.html` for any "navigation" request that doesn't match a static file. An OAuth redirect from a provider like Google is a navigation request.

In development, this means the Vite server, mimicking production behavior, intercepts the callback to `/api/auth/callback/google` and serves the main SolidJS application instead of passing the request to your backend Hono worker. This prevents the authentication code from being processed, so no session is created.

**The Solution:**

The solution is to embrace this SPA behavior by creating a dedicated client-side route to handle the callback.

1.  **Create a specific route** in your client-side router (e.g., TanStack Router) that matches the callback path, such as `/api/auth/callback/google`.
2.  **The component for this route** has a single responsibility: to immediately make a `fetch` request to the *exact same URL* it's currently on (`window.location.href`).
3.  **This `fetch` request is the key.** Unlike the initial redirect, a `fetch` is an API request, not a navigation request. The Vite server and the Cloudflare plugin correctly route this `fetch` request to your backend Hono worker.
4.  The backend worker then processes the OAuth code, creates a session, and responds to the `fetch` call.
5.  Upon receiving a successful response, the component uses the client-side router's `navigate` function to redirect the user to their intended destination (e.g., `/dashboard`).

This approach creates a seamless "shim" within your client application that correctly bridges the OAuth redirect and your backend API, working in harmony with the SPA development server.
