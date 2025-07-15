import { createSignal, Show } from 'solid-js';
import { useAddLocationMutation } from '~/lib/weather-queries';

interface AddLocationFormProps {
  onLocationAdded?: (location: any) => void;
}

export function AddLocationForm(props: AddLocationFormProps) {
  const [locationName, setLocationName] = createSignal('');
  const [error, setError] = createSignal<string | null>(null);

  const addLocationMutation = useAddLocationMutation();

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    const name = locationName().trim();
    if (!name) {
      setError('Please enter a location name');
      return;
    }

    setError(null);

    try {
      const result = await addLocationMutation.mutateAsync({ name });

      // Success - clear form
      setLocationName('');

      // Notify parent component
      props.onLocationAdded?.(result.location);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add location';
      setError(errorMessage);
    }
  };

  const handleInputChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    setLocationName(target.value);
    // Clear error when user starts typing
    if (error()) {
      setError(null);
    }
  };

  return (
    <div class="bg-card rounded-lg border p-6">
      <h2 class="text-lg font-semibold mb-4">Add New Location</h2>

      <form onSubmit={handleSubmit} class="space-y-4">
        <div class="flex gap-4">
          <div class="flex-1">
            <input
              type="text"
              value={locationName()}
              onInput={handleInputChange}
              placeholder="Enter city name (e.g., New York, NY)"
              class="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              disabled={addLocationMutation.isPending}
              required
            />
            <Show when={error()}>
              <p class="text-sm text-destructive mt-1">{error()}</p>
            </Show>
          </div>

          <button
            type="submit"
            disabled={addLocationMutation.isPending || !locationName().trim()}
            class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Show when={addLocationMutation.isPending} fallback="Add Location">
              <div class="flex items-center gap-2">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                Adding...
              </div>
            </Show>
          </button>
        </div>

        <p class="text-sm text-muted-foreground">
          Enter a city name to add it to your weather dashboard. Examples: "London", "New York, NY", "Tokyo, Japan"
        </p>
      </form>
    </div>
  );
}