import { useMutation, useQueryClient } from '@tanstack/solid-query';
import { toast } from 'solid-sonner';

// Clean, Simple Types
interface AddLocationRequest {
  name: string;
  latitude?: number;
  longitude?: number;
  isCurrentLocation?: boolean;
  silent?: boolean; // For silent refreshes
}

interface AddLocationResponse {
  success: boolean;
  locationId: string;
  location: {
    name: string;
    latitude: number;
    longitude: number;
  };
}

// Query Keys
export const weatherKeys = {
  all: ['weather'] as const,
  locations: () => [...weatherKeys.all, 'locations'] as const,
  location: (id: string) => [...weatherKeys.locations(), id] as const,
  dashboard: (userId: string) => [...weatherKeys.all, 'dashboard', userId] as const,
} as const;

// Query Options Factory
export const weatherQueryOptions = {
  dashboard: (userId: string) => ({
    queryKey: weatherKeys.dashboard(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
    refetchInterval: 30 * 60 * 1000, // 30 minutes - background refetch every 30 minutes
    refetchIntervalInBackground: true, // Continue refetching when tab is not active
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    retry: 3, // Retry failed requests 3 times
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  }),
} as const;

// API Functions
async function addOrRefreshLocation(data: AddLocationRequest): Promise<AddLocationResponse> {
  const response = await fetch('/api/weather/locations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Failed to add/refresh location');
  }

  return result;
}

async function deleteLocation(locationId: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/weather/locations/${locationId}`, {
    method: 'DELETE',
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to delete location');
  }

  return result;
}

// Clean, Simple Mutations
export function useAddLocationMutation() {
  const queryClient = useQueryClient();

  return useMutation(() => ({
    mutationFn: addOrRefreshLocation,
    onSuccess: (data) => {
      // Show success toast
      toast.success(`Added ${data.location.name} to your weather dashboard`);
      
      // Invalidate and refetch weather dashboard data
      queryClient.invalidateQueries({ queryKey: weatherKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  }));
}

// Enhanced mutations with optimistic updates
export function useDeleteLocationMutationWithOptimistic() {
  const queryClient = useQueryClient();

  return useMutation(() => ({
    mutationFn: deleteLocation,
    onMutate: async (locationId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: weatherKeys.all });

      // Snapshot the previous value
      const previousData = queryClient.getQueriesData({ queryKey: weatherKeys.all });

      // Optimistically remove the location from all relevant queries
      queryClient.setQueriesData({ queryKey: weatherKeys.all }, (old: any) => {
        if (Array.isArray(old)) {
          return old.filter((item: any) => item.location?._id !== locationId);
        }
        return old;
      });

      // Return a context object with the snapshotted value
      return { previousData };
    },
    onError: (err, locationId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error(err.message);
    },
    onSuccess: () => {
      toast.success('Location removed from your dashboard');
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: weatherKeys.all });
    },
  }));
}

// Clean refresh mutation - reuses the same endpoint with location data
export function useRefreshWeatherMutation() {
  const queryClient = useQueryClient();

  return useMutation(() => ({
    mutationFn: (locationData: AddLocationRequest) => addOrRefreshLocation(locationData),
    onSuccess: (data, variables) => {
      // Show success toast only if not silent
      if (!variables.silent) {
        toast.success('Weather data refreshed');
      }
      
      // Invalidate and refetch weather dashboard data
      queryClient.invalidateQueries({ queryKey: weatherKeys.all });
    },
    onError: (error: Error, variables) => {
      // Only show error toast if not a silent refresh
      if (!variables.silent) {
        toast.error(error.message);
      }
    },
  }));
}