import { useQueryClient, useMutation, useQuery } from '@tanstack/solid-query';
import { useNavigate, useRouteContext } from '@tanstack/solid-router';
import { authClient } from './auth-client';
import { createMemo } from 'solid-js';
import { sessionQueryOptions } from './auth-guard';

type SignInCredentials = {
  email: string;
  password: string;
};

type SignUpCredentials = {
  email: string;
  password: string;
  name?: string;
};

const handleSuccess = (queryClient: ReturnType<typeof useQueryClient>, navigate: ReturnType<typeof useNavigate>) => {
  queryClient.invalidateQueries({ queryKey: ['session'] });
  navigate({ to: '/dashboard' });
};

export function useSignInMutation() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation(() => ({
    mutationFn: async (credentials: SignInCredentials) => {
      const { data, error } = await authClient.signIn.email(credentials);
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => handleSuccess(queryClient, navigate),
  }));
}

export function useSignUpMutation() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation(() => ({
    mutationFn: async (credentials: SignUpCredentials) => {
      const { data, error } = await authClient.signUp.email({
        ...credentials,
        name: credentials.name || credentials.email.split('@')[0],
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => handleSuccess(queryClient, navigate),
  }));
}

export function useGoogleSignInMutation() {
    return useMutation(() => ({
        mutationFn: () => authClient.signIn.social({ provider: 'google' }),
    }));
}

type UserUpdateVariables = { 
  name: string; 
  image: string | null | undefined;
};

/**
 * Updates user profile information with optimistic updates
 */
export function useUpdateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation(() => ({
    mutationFn: (updatedUser: UserUpdateVariables) => authClient.updateUser(updatedUser),
    onMutate: async (updatedUser) => {
      await queryClient.cancelQueries({ queryKey: ['session'] });
      const previousSession = queryClient.getQueryData(['session']);
      queryClient.setQueryData(['session'], (old: any) => ({
        ...old,
        user: { ...old.user, name: updatedUser.name, image: updatedUser.image }
      }));
      return { previousSession };
    },
    onSuccess: () => {
      // Invalidate session query to refresh route context
      queryClient.invalidateQueries({ queryKey: ['session'] });
    },
    onError: (_err: Error, _updatedUser: UserUpdateVariables, context: any) => {
      if (context?.previousSession) {
        queryClient.setQueryData(['session'], context.previousSession);
      }
    },
  }));
}

/**
 * Deletes the current user account with proper session cleanup
 */
export function useDeleteUserMutation() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation(() => ({
    mutationFn: (password?: string) => {
      // If password provided, use it for authentication
      if (password) {
        return authClient.deleteUser({ password });
      }
      // Otherwise use fresh session authentication
      return authClient.deleteUser();
    },
    onSuccess: () => {
      // Clear all queries and navigate to goodbye page
      queryClient.clear();
      navigate({ to: '/auth', search: { deleted: 'true' } });
    }
  }));
}

/**
 * A mutation hook that provides a centralized sign-out function.
 * It handles signing out the user via the auth client, clearing the
 * session from the TanStack Query cache, and navigating to the auth page.
 */
export function useSignOutMutation() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation(() => ({
    mutationFn: () => authClient.signOut(),
    onSuccess: () => {
      // Manually and synchronously update the cache to reflect the logged-out state.
      queryClient.setQueryData(['session'], null);
      // Navigate to the auth page after sign out.
      navigate({ to: '/' });
    },
    onError: (error: Error) => {
      // In a real app, you might use a more robust notification system.
      alert(`Sign out failed: ${error.message}`);
    },
  }));
}

/**
 * Get current user from route context
 * Convenience hook that provides reactive access to the current user
 */
export function useCurrentUser() {
  const context = useRouteContext({ from: '/dashboard' });
  return createMemo(() => context()?.session?.user);
}

/**
 * Get current user from query cache (for account page)
 * This version syncs with optimistic updates from mutations
 */
export function useCurrentUserFromQuery() {
  const sessionQuery = useQuery(() => sessionQueryOptions());
  return createMemo(() => sessionQuery.data?.user);
}

/**
 * Get current user ID from route context
 * Convenience hook that provides reactive access to the current user ID
 */
export function useCurrentUserId() {
  const context = useRouteContext({ from: '/dashboard' });
  return createMemo(() => context()?.session?.user?.id);
}

/**
 * Format user ID as a readable fallback name
 */
export function formatUserIdAsName(userId: string): string {
  return `User-${userId.slice(-4).toUpperCase()}`;
}