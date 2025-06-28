# Welcome to your Convex functions directory!

Write your Convex functions here.
See https://docs.convex.dev/functions for more.

A query function that takes two arguments looks like:

```ts
// functions.js
import { query } from "./_generated/server";
import { v } from "convex/values";

export const myQueryFunction = query({
  // Validators for arguments.
  args: {
    first: v.number(),
    second: v.string(),
  },

  // Function implementation.
  handler: async (ctx, args) => {
    // Read the database as many times as you need here.
    // See https://docs.convex.dev/database/reading-data.
    const documents = await ctx.db.query("tablename").collect();

    // Arguments passed from the client are properties of the args object.
    console.log(args.first, args.second);

    // Write arbitrary JavaScript here: filter, aggregate, build derived data,
    // remove non-public properties, or create new objects.
    return documents;
  },
});
```

Using this query function in a React component looks like:

```ts
const data = useQuery(api.functions.myQueryFunction, {
  first: 10,
  second: "hello",
});
```

A mutation function looks like:

```ts
// functions.js
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const myMutationFunction = mutation({
  // Validators for arguments.
  args: {
    first: v.string(),
    second: v.string(),
  },

  // Function implementation.
  handler: async (ctx, args) => {
    // Insert or modify documents in the database here.
    // Mutations can also read from the database like queries.
    // See https://docs.convex.dev/database/writing-data.
    const message = { body: args.first, author: args.second };
    const id = await ctx.db.insert("messages", message);

    // Optionally, return a value from your mutation.
    return await ctx.db.get(id);
  },
});
```

Using this mutation function in a React component looks like:

```ts
const mutation = useMutation(api.functions.myMutationFunction);
function handleButtonPress() {
  // fire and forget, the most common way to use mutations
  mutation({ first: "Hello!", second: "me" });
  // OR
  // use the result once the mutation has completed
  mutation({ first: "Hello!", second: "me" }).then((result) =>
    console.log(result),
  );
}
```

Use the Convex CLI to push your functions to a deployment. See everything
the Convex CLI can do by running `npx convex -h` in your project root
directory. To learn more, launch the docs with `npx convex docs`.

# Convex with SolidJS Integration

This project uses Convex for real-time database functionality integrated with SolidJS. Below is information about how our Convex setup works and how to use it in your components.

## Setup

In this project, Convex is configured in `src/lib/convex.ts` which provides:

1. A Convex client initialized with the Convex URL from environment variables
2. A custom `useQuery` hook adapted for SolidJS reactivity
3. Exports for the Convex client and API for use throughout the application

```ts
// src/lib/convex.ts
import { ConvexClient } from "convex/browser";
import { createStore, reconcile } from "solid-js/store";
import { createEffect, onCleanup } from "solid-js";
import { api } from "../../convex/_generated/api";

const convex = new ConvexClient(import.meta.env.VITE_CONVEX_URL as string);

// A type-safe useQuery hook for SolidJS
export function useQuery<
  Query extends FunctionReference<"query", "public", any, any>,
>(
  query: Query,
  // Wrap args in a function to make them reactive for SolidJS
  args: () => FunctionArgs<Query>,
) {
  const [data, setData] = createStore<Store<FunctionReturnType<Query>>>({
    value: undefined,
  });

  createEffect(() => {
    const unsubscribe = convex.onUpdate(
      query as any,
      args() as any,
      (newData: any) => {
        setData("value", reconcile(newData));
      },
    );
    onCleanup(() => unsubscribe());
  });

  return () => data.value;
}

export const convexClient = convex;
export const convexApi = api;
```

## Schema Definition

Convex schema is defined in `convex/schema.ts`:

```ts
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    isCompleted: v.boolean(),
    text: v.string(),
    userId: v.string(),
  })
    .index("by_text", ["text"])
    .index("by_userId", ["userId"])
});
```

## Usage in SolidJS Components

Here's how to use Convex in your SolidJS components:

### Reading Data with useQuery

```tsx
import { useQuery, convexApi } from "~/lib/convex";

function TaskList() {
  const userId = createMemo(() => context()?.session?.user?.id);
  
  // useQuery takes a Convex query function and a function that returns the arguments
  const tasks = useQuery(
    convexApi.tasks.getTasks, 
    () => userId() ? { userId: userId()! } : { userId: "" }
  );
  
  return (
    <div>
      <For each={tasks()} fallback={<p>Loading...</p>}>
        {(task) => (
          <div>{task.text}</div>
        )}
      </For>
    </div>
  );
}
```

### Writing Data with Mutations

```tsx
import { convexClient, convexApi } from "~/lib/convex";
import { toast } from "solid-sonner";

function CreateTask() {
  const [text, setText] = createSignal("");
  
  const addTask = async (e: Event) => {
    e.preventDefault();
    if (!text().trim()) return;
    
    const promise = convexClient.mutation(convexApi.tasks.createTask, { 
      text: text(),
      userId: currentUserId
    });
    
    toast.promise(promise, {
      loading: "Creating task...",
      success: "Task created",
      error: "Failed to create task"
    });
    
    setText("");
  };
  
  return (
    <form onSubmit={addTask}>
      <input value={text()} onInput={(e) => setText(e.target.value)} />
      <button type="submit">Add Task</button>
    </form>
  );
}
```

## Server Functions Examples

Convex server functions are defined in `convex/tasks.ts`:

```ts
// Query example - Get tasks for a user
export const getTasks = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Mutation example - Create a new task
export const createTask = mutation({
  args: {
    text: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("tasks", {
      text: args.text,
      isCompleted: false,
      userId: args.userId,
    });
  },
});
```

## Getting Started

To start working with Convex in this project:

1. Make sure `VITE_CONVEX_URL` is set in your environment variables
2. Import the necessary functions from `src/lib/convex.ts`
3. Use `useQuery` for reading data and `convexClient.mutation` for writing data
4. Define your schema in `convex/schema.ts`
5. Create your server functions (queries and mutations) in modules within the `convex/` directory
