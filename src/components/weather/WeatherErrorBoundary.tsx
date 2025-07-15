import { createSignal, Show, type JSX } from 'solid-js';
import { ErrorBoundary } from 'solid-js';

interface WeatherErrorBoundaryProps {
  children: JSX.Element;
  fallback?: (error: Error, reset: () => void) => JSX.Element;
}

export function WeatherErrorBoundary(props: WeatherErrorBoundaryProps) {
  const [retryCount, setRetryCount] = createSignal(0);

  const defaultFallback = (error: Error, reset: () => void) => (
    <div class="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0">
          <svg class="w-5 h-5 text-destructive mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>

        <div class="flex-1">
          <h3 class="text-lg font-semibold text-destructive mb-2">
            Weather Dashboard Error
          </h3>

          <p class="text-destructive/80 mb-4">
            <Show when={error.message.includes('network') || error.message.includes('fetch')} fallback={
              <span>Something went wrong while loading the weather dashboard. This might be a temporary issue.</span>
            }>
              <span>Unable to connect to weather services. Please check your internet connection.</span>
            </Show>
          </p>

          <details class="mb-4">
            <summary class="text-sm text-destructive/70 cursor-pointer hover:text-destructive">
              Technical details
            </summary>
            <pre class="text-xs text-destructive/60 mt-2 p-2 bg-destructive/5 rounded overflow-auto">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>

          <div class="flex gap-3">
            <button
              onClick={() => {
                setRetryCount(prev => prev + 1);
                reset();
              }}
              class="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
            >
              Try Again {retryCount() > 0 && `(${retryCount()})`}
            </button>

            <button
              onClick={() => window.location.reload()}
              class="px-4 py-2 border border-destructive text-destructive rounded-md hover:bg-destructive/10 transition-colors"
            >
              Reload Page
            </button>
          </div>

          <Show when={retryCount() > 2}>
            <div class="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
              <p class="text-sm text-amber-800 dark:text-amber-200">
                <strong>Still having issues?</strong> Try refreshing the page or check if the weather service is experiencing downtime.
              </p>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary fallback={props.fallback || defaultFallback}>
      {props.children}
    </ErrorBoundary>
  );
}