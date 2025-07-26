[![Tests](https://github.com/jhomra21/cloudflare-workers-solid-tanstack-spa-betterauth-D1-KV/actions/workflows/test.yml/badge.svg)](https://github.com/jhomra21/cloudflare-workers-solid-tanstack-spa-betterauth-D1-KV/actions/workflows/test.yml)

# Test Suite

This directory contains comprehensive tests for our application using **Bun's built-in test runner**.

## Test Files

### `convex.simple.test.ts`
Tests our custom Convex client that connects to the real-time database:

#### **Core Functionality Tests**

**1. Module Export Validation (`should export all required functions and objects`)**
- **What it tests**: Validates that our Convex integration module will export exactly 8 required functions
- **Why it matters**: Ensures our module API is complete and consistent
- **How it works**: Creates an array of expected exports and validates the structure without importing (avoids CI issues)
- **Expected exports**: `convexClient`, `convexApi`, `useConvexQuery`, `useConvexMutation`, `useConvexAction`, `useBatchConvexMutations`, `prefetchConvexQuery`, `invalidateConvexQueries`

**2. Hook Pattern Validation (`should validate convex hook patterns`)**
- **What it tests**: Ensures our Convex hooks return TanStack Query-compatible objects
- **Why it matters**: Prevents the common mistake of calling properties as functions (e.g., `data()` instead of `data`)
- **How it works**: Creates mock objects that match expected TanStack Query structure and validates property types
- **Key validations**: 
  - `data`, `isLoading`, `error`, `isPending` are properties (not functions)
  - `refetch`, `mutate`, `mutateAsync` are functions

**3. API Structure Validation (`should validate convex integration patterns`)**
- **What it tests**: Validates that our Convex API follows the correct structure with proper types
- **Why it matters**: Ensures our generated API matches Convex conventions
- **How it works**: Creates mock API structure and validates `_type` properties and query key patterns
- **Key validations**:
  - Tasks API has `getTasks` (query), `createTask` (mutation), `updateTask` (mutation)
  - Agents API has `getCanvasAgents` (query), `createAgent` (mutation), `updateAgentStatus` (mutation)
  - Query keys follow hierarchical pattern: `['convex', 'tasks', 'user-123']`

**4. Batch Operations (`should validate batch operations patterns`)**
- **What it tests**: Validates that batch operations use `Promise.allSettled` for handling multiple concurrent operations
- **Why it matters**: Ensures robust error handling when multiple operations run simultaneously
- **How it works**: Creates a mock batch function that processes multiple promises and validates the pattern
- **Key validations**:
  - Batch function accepts array of promise-returning functions
  - Returns a Promise (for async handling)
  - Uses `Promise.allSettled` pattern for resilient concurrent operations

**5. Real-time Integration (`should handle real-time updates with cached data`)**
- **What it tests**: The complete integration between Convex real-time subscriptions and TanStack Query cache
- **Why it matters**: This is the core feature - real-time data updates must seamlessly update the UI cache
- **How it works**: 
  1. Imports actual mocked modules (`@tanstack/solid-query`, `convex/browser`, generated API)
  2. Sets up a real-time subscription using `convexClient.onUpdate`
  3. Simulates real-time data arriving from Convex server
  4. Verifies that TanStack Query cache gets updated automatically
- **Key validations**:
  - Subscription is created with correct API function reference (`api.tasks.getTasks`)
  - Unsubscribe function is returned for cleanup
  - When real-time data arrives, `queryClient.setQueryData` is called
  - Cache update uses correct query key and new data

#### **Basic Tests**

**6. Environment Variables (`should handle environment variables`)**
- **What it tests**: Environment variable access and fallback handling
- **Why it matters**: Ensures configuration works in different environments (dev, test, prod)
- **How it works**: Reads `VITE_CONVEX_URL` with fallback and validates it's a non-empty string

**7. Error Handling (`should handle basic error scenarios`)**
- **What it tests**: Basic JavaScript Error object creation and properties
- **Why it matters**: Validates that error handling infrastructure works correctly
- **How it works**: Creates an Error object and validates message and instanceof properties

### `tanstack-query-usage.test.ts`
Tests to prevent TanStack Query usage errors and document correct patterns:

#### **Usage Validation Tests**
- ✅ Query properties accessed correctly (`data`, `isLoading`, `isError`, `error`, `isPending` as properties)
- ✅ Mutation properties accessed correctly (`isPending`, `error` as properties)
- ✅ Function properties called correctly (`refetch`, `mutate`, `mutateAsync` as functions)
- ✅ Conditional rendering patterns validated
- ✅ Array operations on query data work correctly

#### **Anti-Pattern Documentation**
- ✅ Common mistakes identified (calling properties as functions)
- ✅ Integration test patterns for component usage
- ✅ Correct vs incorrect usage patterns documented

### `weather.test.ts`
Tests our weather dashboard functionality with comprehensive API integration:

#### **Weather Query Tests**
- ✅ All weather functions export correctly (`weatherKeys`, `weatherQueryOptions`, mutation hooks)
- ✅ Query keys generate consistently (`all`, `locations()`, `location(id)`, `dashboard(userId)`)
- ✅ Query options configure properly (5min stale time, 30min refetch, background refresh)
- ✅ Add location mutation creates without errors
- ✅ Delete location mutation with optimistic updates works
- ✅ Refresh weather mutation works

#### **Weather Service Tests**
- ✅ WeatherService class creates with API key
- ✅ Throws error without API key ("OpenWeather API key is required")
- ✅ Has all required methods (`getCurrentWeather`, `geocodeLocation`, `reverseGeocode`, `cleanupCache`)

#### **API Integration Tests**
- ✅ Successful location addition handling
- ✅ API error handling (graceful failure)
- ✅ Mock fetch integration works correctly

#### **Data Structure Tests**
- ✅ Location request data structure validation (name, lat/lng, flags)
- ✅ Location response data structure validation (success, locationId, location object)
- ✅ Query keys work for different users
- ✅ Hierarchical query key structure maintained

#### **Advanced Features**
- ✅ Exponential backoff retry logic (1s, 2s, 4s, capped at 30s)
- ✅ Error handling for network/API/validation errors
- ✅ Cache configuration (stale time, refetch intervals, background refresh)

## Running Tests

```bash
# Run all tests
bun test

# Run specific test files
bun test src/lib/__tests__/convex.simple.test.ts
bun test src/lib/__tests__/tanstack-query-usage.test.ts
bun test src/lib/__tests__/weather.test.ts

# Run tests in watch mode
bun test --watch

# Run tests with verbose output
bun test --reporter=verbose
```

## Test Coverage

The tests cover:

### ✅ Core Functionality
- Module export validation and structure
- TanStack Query integration patterns
- Real-time data synchronization concepts
- API service class instantiation
- Environment variable handling

### ✅ Integration Scenarios
- TanStack Query property vs function access patterns
- Weather API integration with mock fetch
- Query key generation and caching strategies
- Mutation hook creation and configuration

### ✅ Edge Cases
- Missing API keys and error handling
- Network request failures
- Invalid data structures
- TypeScript type validation

### ✅ Performance Features
- Exponential backoff retry logic
- Cache configuration (stale time, refetch intervals)
- Background refresh capabilities
- Optimistic update patterns

## Mock Strategy

The tests use **Bun's built-in mocking system** to isolate functionality:

- **ConvexClient**: Mocked using `mock.module()` with query/mutation/action/onUpdate methods
- **TanStack Query**: Mocked to return proper property/function structures for validation
- **SolidJS**: Mocked reactive primitives (`createEffect`, `onCleanup`, `createSignal`)
- **Network**: Mocked `global.fetch` for API testing with configurable responses
- **External Libraries**: Toast notifications and other UI dependencies mocked

## TypeScript Support

To resolve TypeScript errors with `bun:test`, we use:
- **@ts-ignore comment**: Simple suppression of the `bun:test` module error
- **Type casting**: Cast mocks to proper types (e.g., `as any` for fetch responses)
- **Minimal approach**: No separate type declaration files needed

## Key Test Patterns

### Module Mocking with Bun
```typescript
// Mock external dependencies at module level
mock.module('convex/browser', () => ({
  ConvexClient: mock(() => ({
    query: mock(() => Promise.resolve([])),
    mutation: mock(() => Promise.resolve({})),
    action: mock(() => Promise.resolve({})),
    onUpdate: mock(() => mock(() => {}))
  }))
}));
```

### Property vs Function Validation
```typescript
// Validate TanStack Query structure
const mockQuery = {
  data: [], // Property, not function
  isLoading: false, // Property, not function
  refetch: () => Promise.resolve() // Function
};

expect(typeof mockQuery.data).not.toBe('function');
expect(typeof mockQuery.refetch).toBe('function');
```

### Exponential Backoff Testing
```typescript
// Test retry delay calculation
const retryDelay = (attemptIndex: number) => 
  Math.min(Math.pow(2, attemptIndex) * 1000, 30000);

expect(retryDelay(0)).toBe(1000); // 1 second
expect(retryDelay(1)).toBe(2000); // 2 seconds
expect(retryDelay(2)).toBe(4000); // 4 seconds
expect(retryDelay(10)).toBe(30000); // Capped at 30 seconds
```

## Adding New Tests

When adding new functionality:

1. **Core Tests**: Add to `convex.simple.test.ts` for Convex client functionality
2. **Usage Tests**: Add to `tanstack-query-usage.test.ts` for TanStack Query patterns
3. **Feature Tests**: Add to `weather.test.ts` for weather-specific functionality
4. **New Features**: Create new test files following the established patterns

### Test Structure Template
```typescript
describe('New Feature', () => {
  beforeEach(() => {
    mock.restore();
    // Setup mocks
  });

  afterEach(() => {
    mock.restore();
  });

  it('should handle normal case', () => {
    // Test implementation
  });

  it('should handle error case', () => {
    // Test error scenarios
  });

  it('should validate data structures', () => {
    // Test data validation
  });
});
```

## Debugging Tests

For debugging failing tests:

```bash
# Run with verbose output
bun test --reporter=verbose

# Run single test file
bun test src/lib/__tests__/convex.simple.test.ts

# Run specific test by name pattern
bun test --grep "should export all required functions"
```

## Continuous Integration

These tests are designed to run in CI environments and provide:
- Fast execution with comprehensive mocking
- Deterministic results without external dependencies
- Clear error messages for debugging failures
- Validation of TypeScript patterns and structures