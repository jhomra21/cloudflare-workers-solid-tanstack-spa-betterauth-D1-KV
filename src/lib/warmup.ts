// Worker warmup utility to pre-heat isolates before auth operations

// Simple cache to prevent duplicate warmup requests
let lastWarmupTime = 0;
const WARMUP_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

/**
 * Pre-warms the Workers isolate by calling the warmup endpoint
 * that triggers betterAuth initialization. Cached to prevent spam.
 */
export const warmupWorker = async (): Promise<void> => {
  const now = Date.now();
  
  // Skip if warmed up recently
  if (now - lastWarmupTime < WARMUP_CACHE_DURATION) {
    return;
  }
  
  try {
    await fetch('/api/warmup', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' }
    });
    lastWarmupTime = now;
  } catch (error) {
    // Silent fail - warmup is optional for UX
    console.debug('Worker warmup failed:', error);
  }
};

/**
 * Quick warmup check - returns true if warmup is needed
 */
export const shouldWarmup = (): boolean => {
  return Date.now() - lastWarmupTime >= WARMUP_CACHE_DURATION;
};
