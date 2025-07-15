import { createSignal, Show } from 'solid-js';
import { useGeolocation } from '~/lib/useGeolocation';
import { toast } from 'solid-sonner';

interface GeolocationPromptProps {
  onLocationDetected?: (latitude: number, longitude: number) => void;
  onDismiss?: () => void;
}

export function GeolocationPrompt(props: GeolocationPromptProps) {
  const [isDismissed, setIsDismissed] = createSignal(false);
  const [isDetecting, setIsDetecting] = createSignal(false);
  const geolocation = useGeolocation();

  // Fallback IP-based geolocation function
  const tryIPGeolocation = async () => {
    try {
      // Using ipapi.co - free service with good accuracy
      const response = await fetch('https://ipapi.co/json/', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`IP geolocation service error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.latitude || !data.longitude) {
        throw new Error('IP geolocation returned invalid coordinates');
      }

      // Create a location name from the IP geolocation data
      const locationName = data.city && data.region 
        ? `${data.city}, ${data.region}, ${data.country_name}`
        : data.city 
        ? `${data.city}, ${data.country_name}`
        : `${data.country_name}`;

      // Add IP-based location to weather dashboard
      const weatherResponse = await fetch('/api/weather/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: locationName || 'Current Location (IP-based)',
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
          isCurrentLocation: true,
        }),
      });

      const weatherData = await weatherResponse.json();

      if (!weatherResponse.ok) {
        throw new Error(weatherData.error || 'Failed to add IP-based location');
      }

      toast.success(`Added your approximate location: ${weatherData.location.name} (IP-based)`);
      props.onLocationDetected?.(parseFloat(data.latitude), parseFloat(data.longitude));
      setIsDismissed(true);
    } catch (error) {
      console.error('IP geolocation error:', error);
      throw error; // Re-throw to be handled by the calling function
    }
  };

  const handleDetectLocation = async () => {
    if (!geolocation.isSupported()) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsDetecting(true);
    
    try {
      const position = await geolocation.getCurrentPosition();
      
      // Add current location to weather dashboard
      const response = await fetch('/api/weather/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Current Location',
          latitude: position.latitude,
          longitude: position.longitude,
          isCurrentLocation: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add current location');
      }

      toast.success(`Added your current location: ${data.location.name}`);
      props.onLocationDetected?.(position.latitude, position.longitude);
      setIsDismissed(true);
    } catch (error) {
      console.error('Geolocation error:', error);
      
      // Try IP-based geolocation as fallback
      console.log('Trying IP-based geolocation fallback...');
      try {
        await tryIPGeolocation();
        return; // Success with fallback, exit early
      } catch (fallbackError) {
        console.error('IP geolocation fallback also failed:', fallbackError);
      }
      
      // Handle different types of geolocation errors
      if (error && typeof error === 'object' && 'code' in error) {
        const geoError = error as { code: number; message: string };
        switch (geoError.code) {
          case 1: // PERMISSION_DENIED
            toast.error('Location access denied. Tried IP-based location but that failed too. You can add locations manually instead.');
            break;
          case 2: // POSITION_UNAVAILABLE
            toast.error('Location unavailable. Tried IP-based location as backup but that failed too. You can add locations manually instead.');
            break;
          case 3: // TIMEOUT
            toast.error('Location request timed out. Tried IP-based location as backup but that failed too. You can add locations manually instead.');
            break;
          default:
            toast.error('Failed to detect location with both GPS and IP methods. You can add locations manually instead.');
        }
      } else if (error instanceof Error) {
        if (error.message.includes('denied')) {
          toast.error('Location access denied. Tried IP-based location as backup but that failed too. You can add locations manually instead.');
        } else if (error.message.includes('unavailable')) {
          toast.error('Location information unavailable. Tried IP-based location as backup but that failed too. You can add locations manually instead.');
        } else if (error.message.includes('timeout')) {
          toast.error('Location request timed out. Tried IP-based location as backup but that failed too. You can add locations manually instead.');
        } else {
          toast.error('Failed to detect location with both GPS and IP methods. You can add locations manually instead.');
        }
      } else {
        toast.error('Failed to detect location with both GPS and IP methods. You can add locations manually instead.');
      }
    } finally {
      setIsDetecting(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    props.onDismiss?.();
  };

  // Don't show if dismissed or if geolocation is not supported
  if (isDismissed() || !geolocation.isSupported()) {
    return null;
  }

  return (
    <div class="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0">
          <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        
        <div class="flex-1">
          <h3 class="text-sm font-medium text-blue-900 dark:text-blue-100">
            Add your current location?
          </h3>
          <p class="text-sm text-blue-700 dark:text-blue-300 mt-1">
            We can automatically detect your location to show local weather conditions.
          </p>
          
          <div class="flex gap-3 mt-3">
            <button
              onClick={handleDetectLocation}
              disabled={isDetecting()}
              class="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Show when={isDetecting()} fallback="Allow Location">
                <div class="flex items-center gap-2">
                  <div class="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                  Detecting...
                </div>
              </Show>
            </button>
            
            <button
              onClick={handleDismiss}
              class="px-3 py-1.5 text-blue-600 dark:text-blue-400 text-sm hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          class="flex-shrink-0 text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}