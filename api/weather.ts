import { Hono } from 'hono';
import type { Env, HonoVariables } from './types';
import { WeatherService } from './services/weather-service';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const weatherApi = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// Create Convex client for worker
function getConvexClient() {
  const convexUrl = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
  if (!convexUrl) {
    throw new Error('CONVEX_URL environment variable is required');
  }
  return new ConvexHttpClient(convexUrl);
}

// Middleware to ensure user is authenticated
weatherApi.use('*', async (c, next) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401);
  }
  await next();
});

// Health check endpoint
weatherApi.get('/', (c) => {
  return c.json({
    message: 'Weather API is running',
    timestamp: new Date().toISOString(),
  });
});

// Location management endpoints
weatherApi.post('/locations', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    const body = await c.req.json();
    const { name, latitude, longitude, isCurrentLocation } = body;

    if (!name || typeof name !== 'string') {
      return c.json({ error: 'Location name is required' }, 400);
    }

    const weatherService = new WeatherService(c.env.OPENWEATHER_API_KEY);
    const convex = getConvexClient();

    let locationData;

    if (latitude && longitude) {
      // Use provided coordinates
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        return c.json({ error: 'Invalid coordinates' }, 400);
      }

      // Validate coordinates
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return c.json({ error: 'Invalid coordinate values' }, 400);
      }

      locationData = {
        name: name.trim(),
        latitude,
        longitude,
      };
    } else {
      // Geocode the location name
      try {
        const geocoded = await weatherService.geocodeLocation(name);
        locationData = {
          name: geocoded.name,
          latitude: geocoded.latitude,
          longitude: geocoded.longitude,
        };
      } catch (error) {
        console.error('Geocoding error:', error);
        return c.json({
          error: 'Location not found',
          message: error instanceof Error ? error.message : 'Unknown error'
        }, 404);
      }
    }

    // Add or update location in Convex (upsert pattern)
    try {
      const locationId = await convex.mutation(api.weather.addLocation, {
        userId: user.id,
        name: locationData.name,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        isCurrentLocation: isCurrentLocation || false,
      });

      // Always fetch fresh weather data (for both new and existing locations)
      try {
        const weatherData = await weatherService.getCurrentWeather(
          locationData.latitude,
          locationData.longitude
        );

        await convex.mutation(api.weather.updateWeatherData, {
          locationId,
          ...weatherData,
          source: 'openweather',
        });

        return c.json({
          success: true,
          locationId,
          location: locationData,
          weather: weatherData,
          lastUpdated: Date.now(),
        });
      } catch (weatherError) {
        console.error('Failed to fetch weather data:', weatherError);
        
        // Still return success for location creation, but indicate weather fetch failed
        return c.json({
          success: true,
          locationId,
          location: locationData,
          weather: null,
          error: 'Location added but weather data unavailable',
        });
      }
    } catch (convexError) {
      console.error('Convex error:', convexError);
      return c.json({
        error: 'Failed to save location',
        message: convexError instanceof Error ? convexError.message : 'Unknown error'
      }, 500);
    }
  } catch (error) {
    console.error('Add location error:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

weatherApi.delete('/locations/:locationId', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    const locationId = c.req.param('locationId');
    if (!locationId) {
      return c.json({ error: 'Location ID is required' }, 400);
    }

    const convex = getConvexClient();

    try {
      await convex.mutation(api.weather.removeLocation, {
        locationId: locationId as any,
        userId: user.id,
      });

      return c.json({ success: true });
    } catch (convexError) {
      console.error('Convex error:', convexError);
      return c.json({
        error: 'Failed to remove location',
        message: convexError instanceof Error ? convexError.message : 'Unknown error'
      }, 500);
    }
  } catch (error) {
    console.error('Remove location error:', error);
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Note: Refresh endpoints removed - we now use the locations endpoint for both
// adding new locations and refreshing existing ones (upsert pattern)

// Error handling middleware
weatherApi.onError((err, c) => {
  console.error('Weather API Error:', err);
  return c.json(
    {
      error: 'Internal server error',
      message: err.message,
      timestamp: new Date().toISOString(),
    },
    500
  );
});

export default weatherApi;