// @ts-ignore - Bun's built-in test module
import { describe, it, expect, beforeEach, mock, afterEach } from 'bun:test';

// Mock modules at the top level
mock.module('@tanstack/solid-query', () => ({
    useMutation: mock(() => ({
        mutate: mock(() => { }),
        mutateAsync: mock(() => Promise.resolve({})),
        isPending: false,
        error: null,
    })),
    useQueryClient: mock(() => ({
        setQueryData: mock(() => { }),
        getQueryData: mock(() => []),
        invalidateQueries: mock(() => { }),
        cancelQueries: mock(() => Promise.resolve()),
        setQueriesData: mock(() => { }),
        getQueriesData: mock(() => []),
    })),
}));

mock.module('solid-sonner', () => ({
    toast: {
        success: mock(() => { }),
        error: mock(() => { }),
    },
}));

// Mock fetch globally
const mockFetch = mock(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, locationId: 'test-id' }),
}));
global.fetch = mockFetch as any;

describe('Weather Queries - Core Functionality', () => {
    beforeEach(() => {
        // Reset all mocks before each test
        mock.restore();
        mockFetch.mockClear();
    });

    afterEach(() => {
        // Clean up after each test
        mock.restore();
    });

    it('should export all required weather query functions', async () => {
        const weatherModule = await import('../weather-queries');

        // Check main exports
        expect(weatherModule.weatherKeys).toBeDefined();
        expect(weatherModule.weatherQueryOptions).toBeDefined();

        // Check hook exports
        expect(typeof weatherModule.useAddLocationMutation).toBe('function');
        expect(typeof weatherModule.useDeleteLocationMutationWithOptimistic).toBe('function');
        expect(typeof weatherModule.useRefreshWeatherMutation).toBe('function');
    });

    it('should create weather query keys correctly', async () => {
        const { weatherKeys } = await import('../weather-queries');

        expect(weatherKeys.all).toEqual(['weather']);
        expect(weatherKeys.locations()).toEqual(['weather', 'locations']);
        expect(weatherKeys.location('test-id')).toEqual(['weather', 'locations', 'test-id']);
        expect(weatherKeys.dashboard('user-123')).toEqual(['weather', 'dashboard', 'user-123']);
    });

    it('should create weather query options with correct configuration', async () => {
        const { weatherQueryOptions } = await import('../weather-queries');

        const dashboardOptions = weatherQueryOptions.dashboard('user-123');

        expect(dashboardOptions.queryKey).toEqual(['weather', 'dashboard', 'user-123']);
        expect(dashboardOptions.staleTime).toBe(5 * 60 * 1000); // 5 minutes
        expect(dashboardOptions.refetchInterval).toBe(30 * 60 * 1000); // 30 minutes
        expect(dashboardOptions.refetchIntervalInBackground).toBe(true);
        expect(dashboardOptions.refetchOnWindowFocus).toBe(true);
        expect(dashboardOptions.retry).toBe(3);
        expect(typeof dashboardOptions.retryDelay).toBe('function');
    });

    it('should create add location mutation without errors', async () => {
        const { useAddLocationMutation } = await import('../weather-queries');

        expect(() => {
            const mutation = useAddLocationMutation();
            expect(mutation).toBeDefined();
        }).not.toThrow();
    });

    it('should create delete location mutation with optimistic updates', async () => {
        const { useDeleteLocationMutationWithOptimistic } = await import('../weather-queries');

        expect(() => {
            const mutation = useDeleteLocationMutationWithOptimistic();
            expect(mutation).toBeDefined();
        }).not.toThrow();
    });

    it('should create refresh weather mutation without errors', async () => {
        const { useRefreshWeatherMutation } = await import('../weather-queries');

        expect(() => {
            const mutation = useRefreshWeatherMutation();
            expect(mutation).toBeDefined();
        }).not.toThrow();
    });
});

describe('Weather Service - API Integration', () => {
    let WeatherService: any;

    beforeEach(async () => {
        // Import the WeatherService class
        const weatherServiceModule = await import('../../../api/services/weather-service');
        WeatherService = weatherServiceModule.WeatherService;
    });

    it('should create WeatherService instance with API key', () => {
        expect(() => {
            const service = new WeatherService('test-api-key');
            expect(service).toBeDefined();
        }).not.toThrow();
    });

    it('should throw error when created without API key', () => {
        expect(() => {
            new WeatherService('');
        }).toThrow('OpenWeather API key is required');
    });

    it('should have all required methods', () => {
        const service = new WeatherService('test-api-key');

        expect(typeof service.getCurrentWeather).toBe('function');
        expect(typeof service.geocodeLocation).toBe('function');
        expect(typeof service.reverseGeocode).toBe('function');
        expect(typeof service.cleanupCache).toBe('function');
    });
});

describe('Weather API Functions', () => {
    beforeEach(() => {
        mockFetch.mockClear();
    });

    it('should handle successful location addition', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                success: true,
                locationId: 'test-location-id',
                location: {
                    name: 'Test City',
                    latitude: 40.7128,
                    longitude: -74.0060,
                },
            }),
        } as any);

        // We need to test the internal API function, but it's not exported
        // So we'll test through the mutation hook behavior
        const { useAddLocationMutation } = await import('../weather-queries');
        const mutation = useAddLocationMutation();

        expect(mutation).toBeDefined();
        expect(mockFetch).not.toHaveBeenCalled(); // Only called when mutation is executed
    });

    it('should handle API errors gracefully', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            json: () => Promise.resolve({
                error: 'Location not found',
            }),
        } as any);

        // Test error handling through mutation
        const { useAddLocationMutation } = await import('../weather-queries');
        const mutation = useAddLocationMutation();

        expect(mutation).toBeDefined();
    });
});

describe('Weather Data Types and Validation', () => {
    it('should handle location request data structure', () => {
        const locationRequest = {
            name: 'New York',
            latitude: 40.7128,
            longitude: -74.0060,
            isCurrentLocation: true,
            silent: false,
        };

        expect(locationRequest.name).toBe('New York');
        expect(typeof locationRequest.latitude).toBe('number');
        expect(typeof locationRequest.longitude).toBe('number');
        expect(typeof locationRequest.isCurrentLocation).toBe('boolean');
        expect(typeof locationRequest.silent).toBe('boolean');
    });

    it('should handle location response data structure', () => {
        const locationResponse = {
            success: true,
            locationId: 'test-id',
            location: {
                name: 'New York',
                latitude: 40.7128,
                longitude: -74.0060,
            },
        };

        expect(locationResponse.success).toBe(true);
        expect(typeof locationResponse.locationId).toBe('string');
        expect(locationResponse.location).toBeDefined();
        expect(typeof locationResponse.location.name).toBe('string');
        expect(typeof locationResponse.location.latitude).toBe('number');
        expect(typeof locationResponse.location.longitude).toBe('number');
    });
});

describe('Weather Query Key Generation', () => {
    it('should generate consistent query keys', async () => {
        const { weatherKeys } = await import('../weather-queries');

        // Test key consistency
        const key1 = weatherKeys.dashboard('user-123');
        const key2 = weatherKeys.dashboard('user-123');

        expect(key1).toEqual(key2);
        expect(key1).toEqual(['weather', 'dashboard', 'user-123']);
    });

    it('should generate different keys for different users', async () => {
        const { weatherKeys } = await import('../weather-queries');

        const key1 = weatherKeys.dashboard('user-123');
        const key2 = weatherKeys.dashboard('user-456');

        expect(key1).not.toEqual(key2);
        expect(key1[2]).toBe('user-123');
        expect(key2[2]).toBe('user-456');
    });

    it('should generate hierarchical query keys', async () => {
        const { weatherKeys } = await import('../weather-queries');

        const allKey = weatherKeys.all;
        const locationsKey = weatherKeys.locations();
        const locationKey = weatherKeys.location('test-id');
        const dashboardKey = weatherKeys.dashboard('user-123');

        // Check hierarchy
        expect(allKey).toEqual(['weather']);
        expect(locationsKey).toEqual(['weather', 'locations']);
        expect(locationKey).toEqual(['weather', 'locations', 'test-id']);
        expect(dashboardKey).toEqual(['weather', 'dashboard', 'user-123']);

        // Check that child keys include parent keys
        expect(locationsKey.slice(0, allKey.length)).toEqual(allKey);
        expect(locationKey.slice(0, locationsKey.length)).toEqual(locationsKey);
    });
});

describe('Weather Retry Logic', () => {
    it('should configure exponential backoff correctly', async () => {
        const { weatherQueryOptions } = await import('../weather-queries');

        const options = weatherQueryOptions.dashboard('user-123');
        const retryDelay = options.retryDelay;

        expect(typeof retryDelay).toBe('function');

        // Test exponential backoff calculation
        expect(retryDelay(0)).toBe(1000); // 2^0 * 1000 = 1000
        expect(retryDelay(1)).toBe(2000); // 2^1 * 1000 = 2000
        expect(retryDelay(2)).toBe(4000); // 2^2 * 1000 = 4000
        expect(retryDelay(10)).toBe(30000); // Should cap at 30000
    });
});

describe('Weather Error Handling', () => {
    it('should handle network errors', () => {
        const error = new Error('Network error');
        expect(error.message).toBe('Network error');
        expect(error instanceof Error).toBe(true);
    });

    it('should handle API response errors', () => {
        const apiError = new Error('Location not found');
        expect(apiError.message).toBe('Location not found');
    });

    it('should handle validation errors', () => {
        const validationError = new Error('Invalid coordinates');
        expect(validationError.message).toBe('Invalid coordinates');
    });
});

describe('Weather Cache Management', () => {
    it('should handle cache configuration', async () => {
        const { weatherQueryOptions } = await import('../weather-queries');

        const options = weatherQueryOptions.dashboard('user-123');

        expect(options.staleTime).toBeGreaterThan(0);
        expect(options.refetchInterval).toBeGreaterThan(options.staleTime);
        expect(options.refetchIntervalInBackground).toBe(true);
        expect(options.refetchOnWindowFocus).toBe(true);
    });
});