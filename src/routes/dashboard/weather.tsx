import { createFileRoute } from '@tanstack/solid-router';
import { createSignal, createMemo, Show, For } from 'solid-js';
import { protectedLoader } from '~/lib/auth-guard';
import { useQuery } from '~/lib/convex';
import { convexApi } from '~/lib/convex';
import { useCurrentUserId } from '~/lib/auth-actions';
import { AddLocationForm } from '~/components/weather/AddLocationForm';
import { WeatherCard } from '~/components/weather/WeatherCard';
import { GeolocationPrompt } from '~/components/weather/GeolocationPrompt';
import { WeatherErrorBoundary } from '~/components/weather/WeatherErrorBoundary';

export const Route = createFileRoute('/dashboard/weather')({
  beforeLoad: protectedLoader,
  component: WeatherDashboard,
});

function WeatherDashboard() {
  const userId = useCurrentUserId();
  const [refreshTrigger, setRefreshTrigger] = createSignal(0);
  const [showGeolocationPrompt, setShowGeolocationPrompt] = createSignal(true);
  // Query weather dashboard data with real-time updates
  const weatherQuery = useQuery(
    convexApi.weather.getUserWeatherDashboard,
    () => {
      const id = userId();
      // Include refresh trigger to force re-query when needed
      refreshTrigger(); // This ensures reactivity when refresh is triggered
      return id ? { userId: id } : null;
    }
  );

  // Check if user has a current location
  const hasCurrentLocation = createMemo(() => {
    const data = weatherQuery.data();
    return data?.some(item => item.location.isCurrentLocation) || false;
  });

  // Show geolocation prompt only if not dismissed and no current location exists
  const shouldShowGeolocationPrompt = createMemo(() => {
    return showGeolocationPrompt() && !weatherQuery.isLoading() && !hasCurrentLocation();
  });

  const handleLocationAdded = () => {
    // Trigger a refresh by updating the signal
    setRefreshTrigger(prev => prev + 1);
  };

  const handleLocationDeleted = () => {
    // The real-time updates from Convex will handle this automatically
    // But we can add optimistic updates here if needed
  };

  const handleLocationRefreshed = () => {
    // The real-time updates from Convex will handle this automatically
  };

  const handleGeolocationDetected = () => {
    // Location was added, no need to show prompt anymore
    setShowGeolocationPrompt(false);
  };

  const handleGeolocationDismissed = () => {
    setShowGeolocationPrompt(false);
  };

  // Note: Background refresh is now handled by individual WeatherCard components
  // and TanStack Query mutations. The Convex real-time subscriptions ensure
  // all clients see updates immediately when weather data is refreshed.

  return (
    <WeatherErrorBoundary>
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold tracking-tight">Weather Dashboard</h1>
            <p class="text-muted-foreground">
              Monitor weather conditions for your favorite locations
            </p>
          </div>
        </div>

        {/* Geolocation Prompt */}
        <Show when={shouldShowGeolocationPrompt()}>
          <GeolocationPrompt 
            onLocationDetected={handleGeolocationDetected}
            onDismiss={handleGeolocationDismissed}
          />
        </Show>

        {/* Add Location Form */}
        <AddLocationForm onLocationAdded={handleLocationAdded} />

        {/* Weather Cards */}
        <Show when={weatherQuery.isLoading()} fallback={
          <Show when={weatherQuery.error()} fallback={
            <Show when={weatherQuery.data()?.length === 0} fallback={
              <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <For each={weatherQuery.data()}>
                  {(item, index) => (
                    <div 
                      class="animate-in fade-in-0 slide-in-from-bottom-4 duration-300"
                      style={{ "animation-delay": `${index() * 100}ms` }}
                    >
                      <WeatherCard
                        location={item.location}
                        weather={item.weather}
                        isStale={item.isStale}
                        onDelete={handleLocationDeleted}
                        onRefresh={handleLocationRefreshed}
                      />
                    </div>
                  )}
                </For>
              </div>
            }>
              <div class="text-center py-12">
                <div class="text-muted-foreground mb-4">
                  <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                </div>
                <h3 class="text-lg font-semibold mb-2">No weather locations yet</h3>
                <p class="text-muted-foreground">
                  Add your first location above to start monitoring weather conditions
                </p>
              </div>
            </Show>
          }>
            <div class="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
              <h3 class="text-lg font-semibold text-destructive mb-2">Error loading weather data</h3>
              <p class="text-destructive/80 mb-4">{weatherQuery.error()?.message}</p>
              <button
                onClick={() => weatherQuery.reset()}
                class="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
              >
                Try Again
              </button>
            </div>
          </Show>
        }>
          <div class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span class="ml-3">Loading weather dashboard...</span>
          </div>
        </Show>
      </div>
    </WeatherErrorBoundary>
  );
}