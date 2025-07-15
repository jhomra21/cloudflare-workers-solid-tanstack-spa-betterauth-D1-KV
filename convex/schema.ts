import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  images: defineTable({
    imageUrl: v.string(),
    model: v.optional(v.string()),
    prompt: v.string(),
    seed: v.optional(v.number()),
    steps: v.optional(v.number()),
    userId: v.string(),
  }).index("by_userId", ["userId"]),
  tasks: defineTable({
    isCompleted: v.boolean(),
    text: v.string(),
    userId: v.string(),
  })
    .index("by_text", ["text"])
    .index("by_userId", ["userId"]),
  weatherLocations: defineTable({
    userId: v.string(),
    name: v.string(),           // "New York, NY"
    latitude: v.number(),
    longitude: v.number(),
    isCurrentLocation: v.boolean(), // true if detected via geolocation
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),
  weatherData: defineTable({
    locationId: v.id("weatherLocations"),
    temperature: v.number(),
    feelsLike: v.number(),
    humidity: v.number(),
    windSpeed: v.number(),
    windDirection: v.number(),
    condition: v.string(),      // "Clear", "Cloudy", etc.
    description: v.string(),    // "clear sky"
    icon: v.string(),          // OpenWeather icon code
    lastUpdated: v.number(),   // timestamp
    source: v.string(),        // "openweather"
  }).index("by_locationId", ["locationId"])
    .index("by_lastUpdated", ["lastUpdated"]),
}); 