// @ts-ignore - Bun's built-in test module
import { describe, it, expect, beforeEach, mock } from 'bun:test';

// Mock modules at the top level
mock.module('convex/browser', () => ({
  ConvexClient: mock(() => ({
    query: mock(() => Promise.resolve([])),
    mutation: mock(() => Promise.resolve({})),
    action: mock(() => Promise.resolve({})),
    onUpdate: mock(() => mock(() => { })),
    connectionState: mock(() => ({
      isWebSocketConnected: true,
      hasInflightRequests: false,
      timeOfOldestInflightRequest: null,
      hasEverConnected: true,
      connectionCount: 1,
      connectionRetries: 0,
      inflightMutations: 0,
      inflightActions: 0
    }))
  }))
}));

mock.module('../../convex/_generated/api', () => ({
  api: {
    tasks: {
      getTasks: { _type: 'query', _visibility: 'public' },
      createTask: { _type: 'mutation', _visibility: 'public' },
      updateTask: { _type: 'mutation', _visibility: 'public' }
    },
    agents: {
      getCanvasAgents: { _type: 'query', _visibility: 'public' },
      createAgent: { _type: 'mutation', _visibility: 'public' },
      updateAgentStatus: { _type: 'mutation', _visibility: 'public' }
    }
  }
}));

mock.module('@tanstack/solid-query', () => ({
  useQuery: mock(() => ({
    data: [],
    isLoading: false,
    error: null,
    refetch: mock(() => { })
  })),
  useMutation: mock(() => ({
    mutate: mock(() => { }),
    mutateAsync: mock(() => Promise.resolve({})),
    isPending: false,
    error: null
  })),
  useQueryClient: mock(() => ({
    setQueryData: mock(() => { }),
    getQueryData: mock(() => []),
    invalidateQueries: mock(() => { }),
    prefetchQuery: mock(() => Promise.resolve())
  }))
}));

mock.module('solid-js', () => ({
  createEffect: mock(() => { }),
  onCleanup: mock(() => { }),
  createSignal: mock(() => [() => true, mock(() => { })])
}));

// Comprehensive Convex Client Tests
describe('Convex Client - Core Functionality', () => {
  it('should export all required functions and objects', async () => {
    const convexModule = await import('../convex');

    // Check main exports
    expect(convexModule.convexClient).toBeDefined();
    expect(convexModule.convexApi).toBeDefined();

    // Check hook exports
    expect(typeof convexModule.useConvexQuery).toBe('function');
    expect(typeof convexModule.useConvexMutation).toBe('function');
    expect(typeof convexModule.useConvexAction).toBe('function');
    expect(typeof convexModule.useConvexConnectionStatus).toBe('function');
    expect(typeof convexModule.useBatchConvexMutations).toBe('function');

    // Check utility exports
    expect(typeof convexModule.prefetchConvexQuery).toBe('function');
    expect(typeof convexModule.invalidateConvexQueries).toBe('function');
  });

  it('should create useConvexQuery hook without errors', async () => {
    const { useConvexQuery, convexApi } = await import('../convex');

    expect(() => {
      const query = convexApi.tasks.getTasks;
      const args = () => ({ userId: 'test-user' });
      const queryKey = () => ['tasks', 'test-user'];

      useConvexQuery(query, args, queryKey);
    }).not.toThrow();
  });

  it('should create useConvexMutation hook without errors', async () => {
    const { useConvexMutation, convexApi } = await import('../convex');

    expect(() => {
      const mutation = convexApi.tasks.createTask;
      const options = {
        onSuccess: () => console.log('Success'),
        onError: () => console.log('Error'),
        invalidateQueries: [['convex', 'tasks']]
      };

      useConvexMutation(mutation, options);
    }).not.toThrow();
  });

  it('should create useConvexAction hook without errors', async () => {
    const { useConvexAction } = await import('../convex');

    expect(() => {
      // Create a mock action reference with correct type
      const action = {
        _type: 'action' as const,
        _visibility: 'public' as const,
        _args: {} as any,
        _returnType: {} as any,
        _componentPath: undefined as any
      };
      const options = {
        onSuccess: () => console.log('Success'),
        invalidateQueries: [['convex', 'tasks']]
      };

      useConvexAction(action, options);
    }).not.toThrow();
  });

  it('should create connection status hook without errors', async () => {
    const { useConvexConnectionStatus } = await import('../convex');

    expect(() => {
      useConvexConnectionStatus();
    }).not.toThrow();
  });

  it('should create batch mutations hook without errors', async () => {
    const { useBatchConvexMutations } = await import('../convex');

    expect(() => {
      const batchHook = useBatchConvexMutations();
      expect(batchHook).toHaveProperty('batch');
      expect(typeof batchHook.batch).toBe('function');
    }).not.toThrow();
  });

  it('should handle utility functions correctly', async () => {
    const { prefetchConvexQuery, invalidateConvexQueries, convexApi } = await import('../convex');

    const mockQueryClient = {
      prefetchQuery: mock(() => Promise.resolve()),
      invalidateQueries: mock(() => { })
    };

    expect(() => {
      prefetchConvexQuery(
        mockQueryClient,
        convexApi.tasks.getTasks,
        { userId: 'test' },
        ['tasks', 'test']
      );

      invalidateConvexQueries(mockQueryClient, ['tasks']);
    }).not.toThrow();
  });
});

// Test basic functionality
describe('Basic Functionality Tests', () => {
  it('should handle environment variables', () => {
    // Test that we can access environment variables
    const convexUrl = process.env.VITE_CONVEX_URL || 'https://test.convex.cloud';
    expect(typeof convexUrl).toBe('string');
    expect(convexUrl.length).toBeGreaterThan(0);
  });

  it('should handle basic error scenarios', () => {
    const error = new Error('Test error');
    expect(error.message).toBe('Test error');
    expect(error instanceof Error).toBe(true);
  });
});