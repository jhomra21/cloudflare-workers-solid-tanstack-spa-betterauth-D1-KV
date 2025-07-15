import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Weather Location Queries
export const getUserLocations = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      return await ctx.db
        .query("weatherLocations")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .order("desc")
        .collect();
    } catch (error) {
      console.error("Error fetching user locations:", error);
      throw new Error("Failed to fetch weather locations");
    }
  },
});

export const getLocationById = query({
  args: {
    locationId: v.id("weatherLocations"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const location = await ctx.db.get(args.locationId);
      
      if (!location) {
        throw new Error("Location not found");
      }
      
      // Ensure user can only access their own locations
      if (location.userId !== args.userId) {
        throw new Error("Unauthorized access to location");
      }
      
      return location;
    } catch (error) {
      console.error("Error fetching location by ID:", error);
      throw error;
    }
  },
});
// Weather Data Queries
export const getWeatherForLocation = query({
  args: {
    locationId: v.id("weatherLocations"),
  },
  handler: async (ctx, args) => {
    try {
      const weatherData = await ctx.db
        .query("weatherData")
        .withIndex("by_locationId", (q) => q.eq("locationId", args.locationId))
        .order("desc")
        .first();
      
      return weatherData || null;
    } catch (error) {
      console.error("Error fetching weather data:", error);
      throw new Error("Failed to fetch weather data");
    }
  },
});

export const getUserWeatherDashboard = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Get all user locations
      const locations = await ctx.db
        .query("weatherLocations")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .order("desc")
        .collect();

      // Get weather data for each location
      const dashboardData = await Promise.all(
        locations.map(async (location) => {
          const weatherData = await ctx.db
            .query("weatherData")
            .withIndex("by_locationId", (q) => q.eq("locationId", location._id))
            .order("desc")
            .first();

          // Check if data is stale (older than 30 minutes)
          const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
          const isStale = weatherData ? weatherData.lastUpdated < thirtyMinutesAgo : true;

          return {
            location,
            weather: weatherData || null,
            isStale,
          };
        })
      );

      return dashboardData;
    } catch (error) {
      console.error("Error fetching user weather dashboard:", error);
      throw new Error("Failed to fetch weather dashboard data");
    }
  },
});// Weather Location Mutations
export const addLocation = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    isCurrentLocation: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      // Validate input
      if (!args.name.trim()) {
        throw new Error("Location name cannot be empty");
      }
      
      if (args.latitude < -90 || args.latitude > 90) {
        throw new Error("Invalid latitude value");
      }
      
      if (args.longitude < -180 || args.longitude > 180) {
        throw new Error("Invalid longitude value");
      }

      // Check if user already has this location (by coordinates)
      const existingLocation = await ctx.db
        .query("weatherLocations")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .filter((q) => 
          q.and(
            q.eq(q.field("latitude"), args.latitude),
            q.eq(q.field("longitude"), args.longitude)
          )
        )
        .first();

      if (existingLocation) {
        // Update existing location instead of throwing error (upsert pattern)
        await ctx.db.patch(existingLocation._id, {
          name: args.name.trim(),
          isCurrentLocation: args.isCurrentLocation || false,
        });
        return existingLocation._id;
      }

      // If this is a current location, remove any existing current location
      if (args.isCurrentLocation) {
        const existingCurrentLocation = await ctx.db
          .query("weatherLocations")
          .withIndex("by_userId", (q) => q.eq("userId", args.userId))
          .filter((q) => q.eq(q.field("isCurrentLocation"), true))
          .first();

        if (existingCurrentLocation) {
          await ctx.db.patch(existingCurrentLocation._id, {
            isCurrentLocation: false,
          });
        }
      }

      // Add the new location
      const locationId = await ctx.db.insert("weatherLocations", {
        userId: args.userId,
        name: args.name.trim(),
        latitude: args.latitude,
        longitude: args.longitude,
        isCurrentLocation: args.isCurrentLocation || false,
        createdAt: Date.now(),
      });

      return locationId;
    } catch (error) {
      console.error("Error adding location:", error);
      throw error;
    }
  },
});

export const removeLocation = mutation({
  args: {
    locationId: v.id("weatherLocations"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Get the location to verify ownership
      const location = await ctx.db.get(args.locationId);
      
      if (!location) {
        throw new Error("Location not found");
      }
      
      if (location.userId !== args.userId) {
        throw new Error("Unauthorized: Cannot delete location belonging to another user");
      }

      // Delete associated weather data first
      const weatherData = await ctx.db
        .query("weatherData")
        .withIndex("by_locationId", (q) => q.eq("locationId", args.locationId))
        .collect();

      for (const data of weatherData) {
        await ctx.db.delete(data._id);
      }

      // Delete the location
      await ctx.db.delete(args.locationId);
      
      return { success: true };
    } catch (error) {
      console.error("Error removing location:", error);
      throw error;
    }
  },
});// Weather Data Mutations
export const updateWeatherData = mutation({
  args: {
    locationId: v.id("weatherLocations"),
    temperature: v.number(),
    feelsLike: v.number(),
    humidity: v.number(),
    windSpeed: v.number(),
    windDirection: v.number(),
    condition: v.string(),
    description: v.string(),
    icon: v.string(),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Verify the location exists
      const location = await ctx.db.get(args.locationId);
      if (!location) {
        throw new Error("Location not found");
      }

      // Check if weather data already exists for this location
      const existingWeatherData = await ctx.db
        .query("weatherData")
        .withIndex("by_locationId", (q) => q.eq("locationId", args.locationId))
        .first();

      const weatherData = {
        locationId: args.locationId,
        temperature: args.temperature,
        feelsLike: args.feelsLike,
        humidity: args.humidity,
        windSpeed: args.windSpeed,
        windDirection: args.windDirection,
        condition: args.condition,
        description: args.description,
        icon: args.icon,
        lastUpdated: Date.now(),
        source: args.source,
      };

      if (existingWeatherData) {
        // Update existing weather data
        await ctx.db.patch(existingWeatherData._id, weatherData);
        return existingWeatherData._id;
      } else {
        // Create new weather data
        const weatherDataId = await ctx.db.insert("weatherData", weatherData);
        return weatherDataId;
      }
    } catch (error) {
      console.error("Error updating weather data:", error);
      throw error;
    }
  },
});

export const cleanupStaleData = mutation({
  args: {
    olderThanHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const hoursToKeep = args.olderThanHours || 24; // Default to 24 hours
      const cutoffTime = Date.now() - (hoursToKeep * 60 * 60 * 1000);

      // Find stale weather data
      const staleData = await ctx.db
        .query("weatherData")
        .withIndex("by_lastUpdated")
        .filter((q) => q.lt(q.field("lastUpdated"), cutoffTime))
        .collect();

      // Delete stale data
      let deletedCount = 0;
      for (const data of staleData) {
        await ctx.db.delete(data._id);
        deletedCount++;
      }

      return { deletedCount, cutoffTime };
    } catch (error) {
      console.error("Error cleaning up stale data:", error);
      throw error;
    }
  },
});