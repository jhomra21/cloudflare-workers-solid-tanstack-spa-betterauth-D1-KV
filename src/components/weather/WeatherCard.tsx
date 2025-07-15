import { createSignal, Show, createMemo, onMount, onCleanup } from 'solid-js';
import { useDeleteLocationMutationWithOptimistic, useRefreshWeatherMutation } from '~/lib/weather-queries';

interface WeatherLocation {
  _id: string;
  userId: string;
  name: string;
  latitude: number;
  longitude: number;
  isCurrentLocation: boolean;
  createdAt: number;
}

interface WeatherData {
  _id: string;
  locationId: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  condition: string;
  description: string;
  icon: string;
  lastUpdated: number;
  source: string;
}

interface WeatherCardProps {
  location: WeatherLocation;
  weather: WeatherData | null;
  isStale?: boolean;
  onDelete?: (locationId: string) => void;
  onRefresh?: (locationId: string) => void;
}

export function WeatherCard(props: WeatherCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
  const [autoRefreshing, setAutoRefreshing] = createSignal(false);

  // TanStack Query mutations
  const deleteLocationMutation = useDeleteLocationMutationWithOptimistic();
  const refreshWeatherMutation = useRefreshWeatherMutation();

  // Auto-refresh stale data
  onMount(() => {
    const checkAndRefresh = async () => {
      // Define our own staleness: data older than 5 minutes
      const now = Date.now();
      const fiveMinutesAgo = now - (5 * 60 * 1000);
      const isDataStale = !props.weather || props.weather.lastUpdated < fiveMinutesAgo;

      if (isDataStale && !refreshWeatherMutation.isPending && !autoRefreshing()) {
        setAutoRefreshing(true);
        try {
          await refreshWeatherMutation.mutateAsync({
            name: props.location.name,
            latitude: props.location.latitude,
            longitude: props.location.longitude,
            isCurrentLocation: props.location.isCurrentLocation,
            silent: true
          });
        } catch (error) {
          console.warn('Auto-refresh failed:', error);
        } finally {
          setAutoRefreshing(false);
        }
      }
    };

    // Check immediately if data is stale
    checkAndRefresh();

    // Set up interval to check for stale data every 2 minutes (more frequent checks)
    const interval = setInterval(checkAndRefresh, 5 * 60 * 1000);

    onCleanup(() => clearInterval(interval));
  });

  const lastUpdatedText = createMemo(() => {
    if (!props.weather) return 'No data';

    const now = Date.now();
    const diff = now - props.weather.lastUpdated;
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  });

  const weatherIconUrl = createMemo(() => {
    if (!props.weather?.icon) return null;
    return `https://openweathermap.org/img/wn/${props.weather.icon}@2x.png`;
  });

  const handleDelete = async () => {
    if (!showDeleteConfirm()) {
      setShowDeleteConfirm(true);
      return;
    }

    try {
      await deleteLocationMutation.mutateAsync(props.location._id);
      props.onDelete?.(props.location._id);
    } catch (err) {
      // Error handling is done in the mutation
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleRefresh = async (silent = false) => {
    try {
      await refreshWeatherMutation.mutateAsync({
        name: props.location.name,
        latitude: props.location.latitude,
        longitude: props.location.longitude,
        isCurrentLocation: props.location.isCurrentLocation,
        silent
      });
      props.onRefresh?.(props.location._id);
    } catch (err) {
      // Error handling is done in the mutation
      if (silent) {
        throw err; // Re-throw for auto-refresh error handling
      }
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <div class="bg-card rounded-lg border p-6 relative">
      {/* Header */}
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <h3 class="font-semibold text-lg">{props.location.name}</h3>
          <Show when={props.location.isCurrentLocation}>
            <div class="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md border border-blue-200 dark:border-blue-800">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Current Location
            </div>
          </Show>
        </div>

        <div class="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            onClick={() => handleRefresh()}
            disabled={refreshWeatherMutation.isPending}
            class="p-1 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Refresh weather data"
          >
            <Show when={refreshWeatherMutation.isPending} fallback={
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            }>
              <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </Show>
          </button>

          {/* Delete Button */}
          <Show when={!showDeleteConfirm()} fallback={
            <div class="flex items-center gap-1">
              <button
                onClick={handleDelete}
                disabled={deleteLocationMutation.isPending}
                class="px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 disabled:opacity-50"
              >
                <Show when={deleteLocationMutation.isPending} fallback="Delete">
                  <div class="flex items-center gap-1">
                    <div class="animate-spin rounded-full h-3 w-3 border-b border-destructive-foreground"></div>
                    Deleting...
                  </div>
                </Show>
              </button>
              <button
                onClick={cancelDelete}
                class="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80"
              >
                Cancel
              </button>
            </div>
          }>
            <button
              onClick={handleDelete}
              class="p-1 text-muted-foreground hover:text-destructive transition-colors"
              title="Delete location"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </Show>
        </div>
      </div>

      {/* Weather Content */}
      <Show when={props.weather} fallback={
        <div class="space-y-4">
          <div class="animate-pulse">
            <div class="h-8 bg-muted rounded w-20 mb-2"></div>
            <div class="h-4 bg-muted rounded w-32 mb-4"></div>
            <div class="flex justify-between">
              <div class="h-4 bg-muted rounded w-24"></div>
              <div class="h-4 bg-muted rounded w-20"></div>
            </div>
          </div>
          <p class="text-sm text-muted-foreground">Loading weather data...</p>
        </div>
      }>
        <div class="space-y-4">
          {/* Temperature and Icon */}
          <div class="flex items-center justify-between">
            <div>
              <div class="text-3xl font-bold">
                {Math.round(props.weather!.temperature)}°C
              </div>
              <div class="text-sm text-muted-foreground capitalize">
                {props.weather!.description}
              </div>
              <Show when={autoRefreshing()}>
                <div class="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                  <div class="animate-spin rounded-full h-2 w-2 border border-blue-600 border-t-transparent"></div>
                  Updating...
                </div>
              </Show>
            </div>

            <Show when={weatherIconUrl()}>
              <img
                src={weatherIconUrl()!}
                alt={props.weather!.condition}
                class="w-16 h-16"
              />
            </Show>
          </div>

          {/* Weather Details */}
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-muted-foreground">Feels like:</span>
              <div class="font-medium">{Math.round(props.weather!.feelsLike)}°C</div>
            </div>
            <div>
              <span class="text-muted-foreground">Humidity:</span>
              <div class="font-medium">{props.weather!.humidity}%</div>
            </div>
            <div>
              <span class="text-muted-foreground">Wind:</span>
              <div class="font-medium">{props.weather!.windSpeed} m/s</div>
            </div>
            <div>
              <span class="text-muted-foreground">Updated:</span>
              <div class="font-medium">{lastUpdatedText()}</div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}