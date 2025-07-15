import { createSignal, onCleanup } from 'solid-js';

export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface GeolocationError {
  code: number;
  message: string;
}

export function useGeolocation() {
  const [position, setPosition] = createSignal<GeolocationPosition | null>(null);
  const [error, setError] = createSignal<GeolocationError | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [hasPermission, setHasPermission] = createSignal<boolean | null>(null);

  let watchId: number | null = null;

  const checkPermission = async (): Promise<boolean> => {
    if (!navigator.geolocation) {
      setError({
        code: 0,
        message: 'Geolocation is not supported by this browser'
      });
      return false;
    }

    try {
      // Check if permissions API is available
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        
        if (permission.state === 'granted') {
          setHasPermission(true);
          return true;
        } else if (permission.state === 'denied') {
          setHasPermission(false);
          setError({
            code: 1,
            message: 'Geolocation permission denied'
          });
          return false;
        }
        // If prompt, we'll need to request permission
      }
      
      return true; // Permission state unknown, proceed with request
    } catch (err) {
      console.warn('Could not check geolocation permission:', err);
      return true; // Proceed anyway
    }
  };

  const getCurrentPosition = async (): Promise<GeolocationPosition> => {
    const canProceed = await checkPermission();
    if (!canProceed) {
      throw new Error('Geolocation permission denied');
    }

    setIsLoading(true);
    setError(null);

    return new Promise((resolve, reject) => {
      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds
        maximumAge: 300000, // 5 minutes
      };

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const position: GeolocationPosition = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          
          setPosition(position);
          setHasPermission(true);
          setIsLoading(false);
          resolve(position);
        },
        (err) => {
          const error: GeolocationError = {
            code: err.code,
            message: getErrorMessage(err.code),
          };
          
          setError(error);
          setHasPermission(err.code === 1 ? false : null);
          setIsLoading(false);
          reject(error);
        },
        options
      );
    });
  };

  const watchPosition = async (): Promise<void> => {
    const canProceed = await checkPermission();
    if (!canProceed) {
      throw new Error('Geolocation permission denied');
    }

    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }

    setIsLoading(true);
    setError(null);

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000, // 1 minute for watch
    };

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const position: GeolocationPosition = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        
        setPosition(position);
        setHasPermission(true);
        setIsLoading(false);
      },
      (err) => {
        const error: GeolocationError = {
          code: err.code,
          message: getErrorMessage(err.code),
        };
        
        setError(error);
        setHasPermission(err.code === 1 ? false : null);
        setIsLoading(false);
      },
      options
    );
  };

  const stopWatching = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  };

  const reset = () => {
    setPosition(null);
    setError(null);
    setIsLoading(false);
    setHasPermission(null);
    stopWatching();
  };

  // Cleanup on component unmount
  onCleanup(() => {
    stopWatching();
  });

  return {
    position,
    error,
    isLoading,
    hasPermission,
    getCurrentPosition,
    watchPosition,
    stopWatching,
    reset,
    isSupported: () => 'geolocation' in navigator,
  };
}

function getErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return 'Location access denied by user';
    case 2:
      return 'Location information unavailable';
    case 3:
      return 'Location request timed out';
    default:
      return 'An unknown error occurred while retrieving location';
  }
}