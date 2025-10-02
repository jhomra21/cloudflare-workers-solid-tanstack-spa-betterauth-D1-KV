# Implementation Plan

- [x] 1. Set up Convex schema and core data structures


  - Extend convex/schema.ts with weatherLocations and weatherData tables
  - Add proper indexes for efficient querying by userId and locationId
  - _Requirements: 1.3, 2.1, 4.1_

- [x] 2. Create Convex weather functions for data management

  - [x] 2.1 Implement weather location queries


    - Write getUserLocations query to fetch user's saved locations
    - Write getLocationById query for individual location lookup
    - Add proper error handling for non-existent locations
    - _Requirements: 1.3, 2.1_

  - [x] 2.2 Implement weather data queries


    - Write getWeatherForLocation query to fetch current weather data
    - Write getUserWeatherDashboard query to get locations with weather data
    - Add logic to detect stale data (older than 30 minutes)
    - _Requirements: 2.1, 2.3, 3.3_

  - [x] 2.3 Implement weather location mutations


    - Write addLocation mutation with user validation
    - Write removeLocation mutation with ownership checks
    - Add proper error handling and validation
    - _Requirements: 1.2, 1.3, 4.2, 4.3_

  - [x] 2.4 Implement weather data mutations


    - Write updateWeatherData mutation for server-side updates
    - Write cleanupStaleData mutation for data maintenance
    - Add timestamp tracking for data freshness
    - _Requirements: 2.3, 3.1, 3.2_

- [x] 3. Create Hono worker API endpoints for external integration

  - [x] 3.1 Set up weather API route structure


    - Create api/weather.ts file with proper routing
    - Add authentication middleware for protected endpoints
    - Set up CORS and error handling middleware
    - _Requirements: 5.1, 5.2_

  - [x] 3.2 Implement OpenWeather API integration service


    - Create weather service class for OpenWeather API calls
    - Add proper error handling for API failures and rate limits
    - Implement request timeout and retry logic with exponential backoff
    - Add API key validation and usage monitoring
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 3.3 Create location management endpoints


    - Implement POST /api/weather/locations endpoint to add locations
    - Implement DELETE /api/weather/locations/:id endpoint to remove locations
    - Add location validation using OpenWeather geocoding API
    - Integrate with Convex client to update database from worker
    - _Requirements: 1.2, 1.4, 1.5, 4.2, 5.2, 5.3_

  - [x] 3.4 Create weather refresh endpoints


    - Implement POST /api/weather/refresh/:locationId for manual refresh
    - Implement POST /api/weather/refresh-all for background updates
    - Add logic to fetch weather data and update Convex database
    - Implement deduplication to prevent multiple concurrent API calls
    - _Requirements: 2.4, 3.1, 7.5, 5.3_

- [x] 4. Build SolidJS weather dashboard UI components

  - [x] 4.1 Create weather dashboard page route


    - Create src/routes/weather.tsx with proper routing setup
    - Add authentication guard using existing auth system
    - Set up basic page layout and navigation
    - _Requirements: 1.1, 5.5_

  - [x] 4.2 Implement add location form component


    - Create AddLocationForm component with input validation
    - Add form submission handling with loading states
    - Implement error display for invalid locations
    - Add success feedback when location is added
    - _Requirements: 1.1, 1.2, 1.5_

  - [x] 4.3 Create weather card display component


    - Create WeatherCard component to display weather data
    - Add temperature, conditions, humidity, and wind speed display
    - Implement loading skeleton while data is fetching
    - Add error state display with retry button
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

  - [x] 4.4 Add location management functionality


    - Add delete button to weather cards with confirmation
    - Add manual refresh button for individual locations
    - Implement optimistic updates for better UX
    - Add proper error handling for failed operations
    - _Requirements: 4.1, 4.2, 4.4, 4.5_

- [x] 5. Implement geolocation detection feature

  - [x] 5.1 Create geolocation hook


    - Create useGeolocation hook for browser location access
    - Add permission request handling with user-friendly prompts
    - Implement fallback behavior when permission is denied
    - Add error handling for geolocation failures
    - _Requirements: 6.1, 6.4, 6.5_

  - [x] 5.2 Integrate geolocation with location detection


    - Add automatic location detection on first dashboard visit
    - Implement reverse geocoding to get location name from coordinates
    - Add current location to user's weather dashboard automatically
    - Ensure graceful fallback to manual entry when geolocation fails
    - _Requirements: 6.2, 6.3, 6.4, 6.5_

- [x] 6. Set up real-time updates and data synchronization

  - [x] 6.1 Implement Convex real-time subscriptions


    - Set up useQuery hooks for real-time weather data updates
    - Add proper dependency tracking for reactive updates
    - Implement efficient re-rendering when data changes
    - _Requirements: 3.1, 3.2, 5.5_

  - [x] 6.2 Add automatic background refresh system


    - Implement client-side timer for 30-minute refresh cycles
    - Add logic to detect stale data and trigger refresh
    - Ensure refresh calls don't conflict with manual refreshes
    - Add proper cleanup when component unmounts
    - _Requirements: 2.3, 3.3, 3.5_

  - [x] 6.3 Implement smooth UI transitions


    - Add loading states and skeleton loaders for better UX
    - Implement smooth transitions when weather data updates
    - Add visual indicators for data freshness (last updated time)
    - Ensure UI remains responsive during background updates
    - _Requirements: 3.4, 2.4_

- [x] 7. Add comprehensive error handling and edge cases



  - [x] 7.1 Implement client-side error boundaries


    - Add error boundaries around weather components
    - Create user-friendly error messages for different failure types
    - Add retry mechanisms for failed operations
    - Implement graceful degradation when services are unavailable
    - _Requirements: 2.5, 7.3_



- [x] 9. Add environment configuration and deployment setup


  - [x] 9.1 Update environment configuration


    - Add OPENWEATHER_API_KEY to worker environment variables
    - Update wrangler.jsonc with necessary environment bindings
    - Add proper TypeScript types for new environment variables
    - _Requirements: 7.1_

  - [x] 9.2 Create deployment documentation


    - Document OpenWeather API key setup process
    - Add configuration examples for different environments
    - Create troubleshooting guide for common setup issues
    - _Requirements: 5.1, 5.2_




- [ ] 10. Migrate to TanStack Query for proper data fetching
  - [ ] 10.1 Replace native fetch calls with TanStack Query
    - Replace all fetch() calls in weather components with createQuery and createMutation
    - Implement proper query keys for weather data caching
    - Add optimistic updates for location management operations
    - Set up proper staleTime and refetchInterval for automatic refreshing


    - _Requirements: 2.3, 3.1, 3.3, 4.2, 4.4_

  - [ ] 10.2 Implement query invalidation and cache management
    - Set up proper query invalidation when locations are added/removed
    - Implement cache updates for weather data refreshes

    - Add proper error handling with TanStack Query error boundaries
    - Configure retry logic and background refetching
    - _Requirements: 2.4, 3.2, 4.3, 7.1_

  - [ ] 10.3 Add TanStack Query optimizations
    - Implement query deduplication for concurrent requests
    - Add proper loading and error states using query status
    - Set up background refetching for stale weather data
    - Configure proper cache time and garbage collection
    - _Requirements: 2.3, 3.3, 7.5_