[![Tests](https://github.com/jhomra21/cloudflare-workers-solid-tanstack-spa-betterauth-D1-KV/actions/workflows/test.yml/badge.svg)](https://github.com/jhomra21/cloudflare-workers-solid-tanstack-spa-betterauth-D1-KV/actions/workflows/test.yml)

# Test Suite

This directory contains comprehensive tests for our application using **Bun's built-in test runner**.

## Test Files

### `convex.simple.test.ts`
Tests our custom Convex client integration patterns and structure validation:

#### **Core Functionality Tests**

**1. Module Export Validation (`should export all required functions and objects`)**
- **What it tests**: Validates that our Convex integration module exports the expected 8 functions
- **Why it matters**: Ensures our module API is complete and consistent
- **Expected exports**: `convexClient`, `convexApi`, `useConvexQuery`, `useConvexMutation`, `useConvexAction`, `useBatchConvexMutations`, `prefetchConvexQuery`, `invalidateConvexQueries`

**2. Hook Pattern Validation (`should validate convex hook patterns`)**
- **What it tests**: Ensures our Convex hooks return TanStack Query-compatible objects
- **Why it matters**: Prevents common mistakes like calling properties as functions
- **Key validations**: Properties vs functions are correctly typed

**3. API Structure Validation (`should validate convex integration patterns`)**
- **What it tests**: Validates that our Convex API follows correct structure with proper types
- **Key validations**: Tasks and Agents APIs have correct query/mutation structure

**4. Batch Operations (`should validate batch operations patterns`)**
- **What it tests**: Validates batch operations use `Promise.allSettled` for concurrent operations
- **Why it matters**: Ensures robust error handling for multiple simultaneous operations

**5. Real-time Integration (`should handle real-time updates with cached data`)**
- **What it tests**: Integration between Convex real-time subscriptions and TanStack Query cache
- **Why it matters**: Core feature - real-time data updates must seamlessly update UI cache
- **Key validations**: Subscription setup, cache updates, cleanup functions

#### **Basic Tests**

**6. Environment Variables (`should handle environment variables`)**
- **What it tests**: Environment variable access and fallback handling
- **Why it matters**: Ensures configuration works across different environments

**7. Error Handling (`should handle basic error scenarios`)**
- **What it tests**: Basic JavaScript Error object creation and properties
- **Why it matters**: Validates error handling infrastructure works correctly

### `notes-api.test.ts`
Tests our Notes API endpoints with comprehensive coverage of CRUD operations:

#### **Notes API Core Tests**
- ✅ **GET /api/notes/** - Fetch all notes for authenticated user
- ✅ **GET /api/notes/:id** - Fetch single note by ID with user ownership validation
- ✅ **POST /api/notes/** - Create new notes with validation
- ✅ **PUT /api/notes/:id** - Update existing notes with partial updates
- ✅ **DELETE /api/notes/:id** - Delete notes with ownership checks

#### **Authentication & Authorization Tests**
- ✅ **Unauthorized requests** return 401 for all endpoints
- ✅ **User isolation** - users cannot access other users' notes
- ✅ **Session validation** with cookie-based authentication

#### **Data Validation Tests**
- ✅ **Required fields** validation (title required for creation)
- ✅ **Field types** validation (strings, dates, status values)
- ✅ **ISO date format** validation for timestamps
- ✅ **Status field** validation (active, archived, deleted)
- ✅ **Response structure** validation for single notes and arrays

#### **CRUD Operation Tests**
- ✅ **Create notes** with title and optional content
- ✅ **Read operations** with proper ordering (updatedAt DESC)
- ✅ **Update operations** with partial field updates
- ✅ **Delete operations** with success confirmation
- ✅ **Empty content** handling (defaults to empty string)

#### **Error Handling Tests**
- ✅ **404 errors** for non-existent notes
- ✅ **400 errors** for missing required fields
- ✅ **500 errors** for database failures
- ✅ **Malformed JSON** request handling

#### **Edge Cases & Security Tests**
- ✅ **Long content** handling (1000+ character titles, 10k+ content)
- ✅ **Special characters** and Unicode support
- ✅ **Null/undefined values** in updates
- ✅ **Concurrent requests** handling
- ✅ **Cross-user access prevention**

### `weather.test.ts`
Tests our weather API service functionality with clean, fast execution:

#### **Weather Service Core Tests**
- ✅ **Service instantiation** with and without API key validation
- ✅ **Method availability** for all required functions
- ✅ **Cache cleanup** functionality

#### **getCurrentWeather Tests**
- ✅ **Successful data fetching** with proper OpenWeather → internal format transformation
- ✅ **Network error handling** with instant retry logic (no delays in tests)
- ✅ **Retry functionality** validation without timing dependencies

#### **geocodeLocation Tests**
- ✅ **Location name to coordinates** conversion
- ✅ **Location not found** error handling
- ✅ **Name formatting** with and without state information

#### **reverseGeocode Tests**
- ✅ **Coordinates to location name** conversion
- ✅ **Reverse geocoding failure** handling

#### **Caching Tests**
- ✅ **Request caching** to avoid duplicate API calls
- ✅ **Cache efficiency** validation

#### **Data Validation Tests**
- ✅ **Request structure** validation (name, coordinates, flags)
- ✅ **Response structure** validation (success, locationId, weather data)
- ✅ **Coordinate range** validation (-90 to 90 lat, -180 to 180 lon)
- ✅ **Data type** validation for all fields

#### **Error Handling Tests**
- ✅ **Network errors** with proper exception handling
- ✅ **Invalid coordinates** boundary testing
- ✅ **API rate limiting** scenarios
- ✅ **Missing API key** validation

## Running Tests

```bash
# Run all tests (fast execution ~150ms)
bun test

# Run specific test files
bun test src/lib/__tests__/convex.simple.test.ts
bun test src/lib/__tests__/weather.test.ts
bun test src/lib/__tests__/notes-api.test.ts

# Run tests in watch mode
bun test --watch

# Run tests with verbose output
bun test --reporter=verbose
```

## Test Coverage

The tests cover:

### ✅ **Core Functionality**
- **Convex integration** patterns and structure validation
- **Weather API service** class instantiation and methods
- **Environment variable** handling and configuration
- **Error handling** infrastructure and patterns

### ✅ **API Integration**
- **Notes API** with full CRUD operations and authentication
- **Weather service** with OpenWeather API integration
- **Mock fetch** for reliable, fast testing without external dependencies
- **Data transformation** from external APIs to internal formats
- **Caching strategies** for performance optimization

### ✅ **Edge Cases & Error Handling**
- **Missing API keys** and authentication errors
- **Network request failures** and retry logic
- **Invalid data structures** and validation
- **Boundary conditions** (coordinate ranges, empty responses)

### ✅ **Performance & Reliability**
- **Fast test execution** (~100ms total) with mocked delays
- **Clean console output** with suppressed service logs
- **No external dependencies** - all tests run offline
- **Deterministic results** with proper mocking

## Mock Strategy

The tests use **Bun's built-in mocking system** for fast, reliable testing:

- **Global fetch**: Mocked for all HTTP requests with configurable responses
- **Console output**: Suppressed during tests to avoid confusing error messages
- **setTimeout**: Mocked to make retry delays instant (no waiting in tests)
- **ConvexClient**: Mocked for Convex integration pattern validation
- **TanStack Query**: Mocked for structure validation without frontend dependencies

## TypeScript Support

To resolve TypeScript errors with `bun:test`, we use:
- **@ts-ignore comment**: Simple suppression of the `bun:test` module error
- **Type casting**: Cast mocks to proper types (e.g., `as any` for fetch responses)
- **Minimal approach**: No separate type declaration files needed

## Key Test Patterns

### Fast Mock Setup
```typescript
// Mock fetch globally for all HTTP requests
const mockFetch = mock(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({})
}));
global.fetch = mockFetch as any;

// Mock setTimeout to make delays instant
const mockSetTimeout = mock((callback: Function) => {
    callback(); // Execute immediately
    return 1;
});
global.setTimeout = mockSetTimeout as any;
```

### Clean Console Output
```typescript
// Suppress console.error during tests
const originalConsoleError = console.error;
const mockConsoleError = mock(() => {});

beforeEach(() => {
    console.error = mockConsoleError;
});

afterEach(() => {
    console.error = originalConsoleError;
});
```

### Weather Service Testing
```typescript
// Test successful API response transformation
const mockWeatherResponse = {
    main: { temp: 22.5, feels_like: 24.1, humidity: 65 },
    wind: { speed: 3.2, deg: 180 },
    weather: [{ main: 'Clear', description: 'clear sky', icon: '01d' }]
};

mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(mockWeatherResponse)
});

const result = await service.getCurrentWeather(40.7128, -74.0060);
expect(result.temperature).toBe(22.5);
```

## Adding New Tests

When adding new functionality:

1. **Convex Integration**: Add to `convex.simple.test.ts` for real-time database patterns
2. **External API Services**: Add to `weather.test.ts` for external API integrations
3. **Internal API Endpoints**: Add to `notes-api.test.ts` for CRUD operations and authentication
4. **New Services**: Create new test files following the established patterns:
   - Mock external dependencies (fetch, console, setTimeout)
   - Focus on core functionality, not complex integration scenarios
   - Keep tests fast and deterministic

### Test Structure Template
```typescript
describe('New Service', () => {
  let ServiceClass: any;

  beforeEach(async () => {
    mockFetch.mockClear();
    console.error = mockConsoleError;
    global.setTimeout = mockSetTimeout as any;
    
    const serviceModule = await import('../../../path/to/service');
    ServiceClass = serviceModule.ServiceClass;
  });

  afterEach(() => {
    console.error = originalConsoleError;
    global.setTimeout = originalSetTimeout;
    mock.restore();
  });

  it('should handle normal case', async () => {
    // Mock successful response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: 'test' })
    });

    const service = new ServiceClass('api-key');
    const result = await service.method();
    
    expect(result).toBeDefined();
  });

  it('should handle error case', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    
    const service = new ServiceClass('api-key');
    await expect(service.method()).rejects.toThrow();
  });
});
```

## Debugging Tests

For debugging failing tests:

```bash
# Run with verbose output
bun test --reporter=verbose

# Run single test file
bun test src/lib/__tests__/weather.test.ts

# Run specific test by name pattern
bun test --grep "should handle network errors"
```

## Performance & CI

These tests are optimized for speed and reliability:

- ✅ **Fast execution**: ~100ms total runtime
- ✅ **No external dependencies**: All APIs mocked
- ✅ **Clean output**: Console logs suppressed during testing
- ✅ **Deterministic**: No timing dependencies or race conditions
- ✅ **CI-friendly**: Reliable results in any environment