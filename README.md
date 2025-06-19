# SolidJS + Tanstack Router + Better Auth + Cloudflare + Vite

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jhomra21/cloudflare-workers-solid-tanstack-spa-betterauth-D1-KV.git)
> [!IMPORTANT]
> After deploying, you **must** update the `BETTER_AUTH_URL` variable in the `[vars]` section of your `wrangler.jsonc` file to your deployed worker's public URL and then push to git or deploy the worker again. 
> This ensures that authentication callbacks and other auth features work correctly in the production environment.

> [!NOTE]
> Using the deploy button will get your project running, but you must add secrets for full authentication features to work. In your Cloudflare dashboard, navigate to your new worker's **Settings > Variables** and add the following as ** secrets **:
> - `BETTER_AUTH_SECRET`
> If you have [Google Cloud](https://console.cloud.google.com/apis/credentials) account set up 
> - `GOOGLE_CLIENT_ID`
> - `GOOGLE_CLIENT_SECRET`

A comprehensive template for building modern web applications using SolidJS on the frontend and a Cloudflare-powered backend. This template integrates Better Auth for authentication, Cloudflare D1 for database storage, Cloudflare Workers for serverless APIs, and Cloudflare KV for session management.

The template uses [Vite](https://vitejs.dev/), [Solid-js](https://www.solidjs.com/), [Tanstack Solid Router](https://tanstack.com/router/v1/docs/adapters/solid-router), [Better-auth](https://better-auth.dev/), [Cloudflare Vite Plugin](https://developers.cloudflare.com/workers/vite-plugin/) and [Cloudflare](https://www.cloudflare.com/).

## 🌟 Core Features

### 🔐 **Robust Authentication**
- **Better Auth Integration**: Secure authentication system with support for Google OAuth and email/password.
- **Cloudflare D1**: Stores user and authentication data.
- **Cloudflare KV**: Used for fast session validation at the edge.

### 🏗️ **Modern Architecture**
- **SolidJS Frontend**: Reactive UI with TanStack Router for file-based routing and TanStack Query for query management.
- **Hono.js API**: Lightweight, fast API layer running on Cloudflare Workers.
- **Cloudflare Stack**: Leverages Cloudflare Vite Plugin, D1, KV, Workers for a scalable and performant infrastructure.

## 🚀 Getting Started

Follow these steps to set up your project for local development and production.

### 1. Initial Cloudflare Setup
[Cloudflare Wrangler D1 Commands Documentation](https://developers.cloudflare.com/workers/wrangler/commands/#d1)

Before you can run the application, you need to create a Cloudflare D1 database and a KV namespace. These will be used by `better-auth` to store user data and session information.

#### Create the D1 Database
Run the following command to create your D1 database. Replace `<YOUR_DB_NAME>` with a name of your choice (e.g., `my-app-db`).

```bash
wrangler d1 create <YOUR_DB_NAME>
```

Cloudflare will return a configuration block. Copy this and add it to the `d1_databases` array in your `wrangler.jsonc` file. It will look like this:

```jsonc
// wrangler.jsonc
{
  // ... other configurations
  "d1_databases": [
    {
      "binding": "DB", 
      "database_name": "<YOUR_DB_NAME>",
      "database_id": "<your-database-id>"
    }
  ]
}
```

> [!IMPORTANT]
> The `binding` name must be `"DB"` as this is what the application code expects.

#### Create the KV Namespace
Run the following command to create the KV namespace for session storage.

```bash
wrangler kv namespace create "SESSION_KV"
```

This command will also return a configuration block. Add it to the `kv_namespaces` array in `wrangler.jsonc`.

```jsonc
// wrangler.jsonc
{
  // ... other configurations
  "kv_namespaces": [
    {
      "binding": "SESSIONS", 
      "id": "<your-namespace-id>",
      "preview_id": "<your-namespace-preview-id>"
    }
  ]
}
```
> [!IMPORTANT]
> The `binding` name must be `"SESSIONS"` as this is what the application code expects.

### 2. Environment Variables & Secrets
[Cloudflare Wrangler: Managing Secrets](https://developers.cloudflare.com/workers/wrangler/commands/#secret)

#### Local Development

This project includes an `example.dev.vars` file to show what environment variables are needed. To set up your local environment:

1.  Rename `example.dev.vars` to `.dev.vars`.
2.  Fill in the required secret values in your new `.dev.vars` file. The file is already ignored by git to prevent accidental secret leaks.

> [!WARNING]
> **Never commit `.dev.vars` to version control.**  
> Double-check that `.dev.vars` is listed in your `.gitignore` to prevent accidental leaks.

Wrangler automatically loads variables from `.dev.vars` when running the development server.

#### Production
For sensitive values (API keys, secrets, etc.), use the Wrangler CLI to securely add them to your Cloudflare Worker environment. These secrets are never stored in your repository and are only accessible to your deployed Worker.
```bash
wrangler secret put <SECRET_NAME>
```


> [!NOTE]
> **Managing Backend Secrets**
> Only non-sensitive configuration values should be stored in the `vars` section of `wrangler.jsonc`. All sensitive keys (like API tokens) should be added to your Cloudflare Worker using the `wrangler secret put <KEY_NAME>` command.

> [!IMPORTANT]
> **Client-Side Build Variables in Cloudflare Workers**
> Due to the Cloudflare Vite plugin integration, frontend environment variables (e.g., `VITE_...`) are *not* sourced from your Worker's main variables and secrets. They **must** be defined in the Cloudflare Workers *build* settings. > In the Cloudflare Dashboard, navigate to your deployed worker's **Settings > Build & deployments > Environment variables** to add them.


### 3. Database Migrations (D1)

#### Initial Setup & Local Development
To set up your local D1 database for the first time, you need to apply the initial migration. This command executes the SQL files in the `migrations/` folder (starting with `0000_initial.sql`) to create the required tables for `better-auth`.

Run the following command in your terminal:
```bash
wrangler d1 migrations apply <D1 database_name> --local
```
This ensures your local database schema is in sync with the application's requirements. For remote databases, you would use the `--remote` flag instead.

#### Workflow for DB Changes
For any new migrations, besides the one included which is for better-auth:
1.  **Create a New Migration File**:
    -   In the `migrations` directory, create a new SQL file.
    -   The filename must start with a number that is higher than the previous one (e.g., `migrations/0001_add_new_field.sql`).

2.  **Add SQL Commands**:
    -   In the new file, write the `ALTER TABLE`, `CREATE TABLE`, or other SQL commands needed for the change.
    -   Example: `ALTER TABLE "user" ADD COLUMN bio TEXT;`

3.  **Apply the Migration**:
    -   Run the following command in your terminal. Wrangler is smart enough to only apply new, unapplied migrations.
    - ```bash
        wrangler d1 migrations apply <YOUR_DB_NAME> --remote
        ```
     
## 🔧 Technical Deep Dive

This section provides more detail on the project's architecture and implementation.

### Database & API Architecture
This project uses a Cloudflare-centric database strategy:

- **Cloudflare D1** (SQLite): Centralized storage for authentication data (users, accounts, etc.) and application data.
- **Cloudflare KV**: Utilized for session storage, enabling fast edge validation of user sessions.

The backend API is built with **Hono.js** and runs on Cloudflare Workers, providing a lightweight and high-performance serverless foundation.

### Client-Side Authentication & State Management
User authentication state on the client is managed by TanStack Query, providing a robust, cacheable, and reactive "source of truth" for the user's session.

-   **API Client**: The `better-auth/client` library, initialized in `src/lib/auth-client.ts`, handles the low-level communication with the backend authentication API.
-   **Session Caching**: A global query with the key `['session']` is responsible for fetching and caching the user's session data. This is defined in `src/lib/auth-guard.ts` within `sessionQueryOptions`.
-   **Authentication Actions**: Custom mutation hooks in `src/lib/auth-actions.ts` (e.g., `useSignInMutation`, `useSignUpMutation`) wrap `authClient` methods. They leverage TanStack Mutation to handle the entire lifecycle of an auth action—submitting data, updating cache on success, and handling errors.
-   **Route Protection**: TanStack Router's `loader` functions are used to protect routes. The `protectedLoader` in `src/lib/auth-guard.ts` ensures that a valid session exists before rendering a protected route, redirecting to `/auth` if not.
-   **Sign-Out**: The `useSignOutMutation` hook orchestrates the sign-out process. It calls the auth client, and upon success, immediately clears the `['session']` from the query cache for a snappy UI update before redirecting the user.

This setup decouples UI components like `src/routes/auth.tsx` and `src/components/nav-user.tsx` from the underlying API logic, allowing them to simply use these dedicated hooks and the `['session']` query to manage and display authentication state.

### OAuth Callback Handling in Development

> [!NOTE]
> **The OAuth SPA Problem**
> When using a Single-Page Application (SPA) framework like SolidJS with Cloudflare Pages and the Vite plugin, a specific challenge arises with OAuth callbacks (e.g., from Google Sign-In) in the local development environment. Cloudflare's SPA routing intercepts the callback (e.g., to `/api/auth/callback/google`) and serves the `index.html` instead of passing the request to your backend Hono worker. This prevents the server-side authentication from completing.

**The Solution:**

The solution is to embrace this SPA behavior by creating a dedicated client-side route to handle the callback.

1.  **Create a specific route** in your client-side router (e.g., TanStack Router) that matches the callback path.
2.  **The component for this route** has a single responsibility: to immediately make a `fetch` request to the *exact same URL* it's currently on (`window.location.href`).
3.  **This `fetch` request is the key.** Unlike the initial browser navigation, a `fetch` is an API request. The Vite server and the Cloudflare plugin correctly route this `fetch` request to your backend Hono worker.
4.  The backend worker then processes the OAuth code, creates a session, and responds to the `fetch` call.
5.  Upon receiving a successful response, the component uses the client-side router's `navigate` function to redirect the user to their intended destination (e.g., `/dashboard`).

This approach creates a seamless "shim" within your client application that correctly bridges the OAuth redirect and your backend API, working in harmony with the SPA development server.
