import { useQueryClient } from '@tanstack/solid-query';
import { useNavigate } from '@tanstack/solid-router';
import { authClient } from './auth-client';

/**
 * A custom hook that provides a centralized sign-out function.
 * It handles signing out the user via the auth client, clearing the
 * session from the TanStack Query cache, and navigating to the home page.
 */
export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const signOut = async () => {
    await authClient.signOut();
    // Manually and synchronously update the cache to reflect the logged-out state.
    queryClient.setQueryData(['session'], null);
    // Navigate back to the home page.
    navigate({ to: '/' });
  };

  return signOut;
} 