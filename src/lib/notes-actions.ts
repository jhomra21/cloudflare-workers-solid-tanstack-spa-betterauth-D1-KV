import { useQueryClient, useMutation, useQuery } from '@tanstack/solid-query';
import { toast } from 'solid-sonner';

// Type definitions for notes
export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface NoteInput {
  title: string;
  content?: string;
}

export interface NoteUpdateInput {
  title?: string;
  content?: string;
  status?: 'active' | 'archived';
}

export interface NoteAnalytics {
  totalNotes: number;
  activeNotes: number;
  archivedNotes: number;
  recentNotes: number; // Notes created in the last 7 days
  avgContentLength: number; // Average length of note content
}

// Query keys for consistent cache management
export const noteKeys = {
  all: ['notes'] as const,
  lists: () => [...noteKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...noteKeys.lists(), { filters }] as const,
  details: () => [...noteKeys.all, 'detail'] as const,
  detail: (id: string) => [...noteKeys.details(), id] as const,
  analytics: () => [...noteKeys.all, 'analytics'] as const,
};

// Get all notes query
export function useNotesQuery() {
  return useQuery(() => ({
    queryKey: noteKeys.lists(),
    queryFn: async () => {
      const response = await fetch('/api/notes/');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch notes');
      }
      return response.json().then((data) => data.notes || []);
    },
  }));
}

// Get single note query
export function useNoteQuery(id: string) {
  return useQuery(() => ({
    queryKey: noteKeys.detail(id),
    queryFn: async () => {
      const response = await fetch(`/api/notes/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch note');
      }
      return response.json();
    },
    enabled: !!id,
  }));
}

// Create note mutation
export function useCreateNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation(() => ({
    mutationFn: async (note: NoteInput) => {
      const response = await fetch('/api/notes/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create note');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate the notes list to refetch
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
      toast.success('Note created successfully');
      return data;
    },
    onError: (error: Error) => {
      toast.error(`Failed to create note: ${error.message}`);
    },
  }));
}

// Update note mutation with optimistic updates
export function useUpdateNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation(() => ({
    mutationFn: async ({ id, ...data }: NoteUpdateInput & { id: string }) => {
      const response = await fetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update note');
      }

      return response.json();
    },
    onMutate: async (updatedNote) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: noteKeys.detail(updatedNote.id) });
      await queryClient.cancelQueries({ queryKey: noteKeys.lists() });

      // Snapshot the previous values
      const previousNote = queryClient.getQueryData(noteKeys.detail(updatedNote.id));
      const previousNotes = queryClient.getQueryData(noteKeys.lists());

      // Optimistically update the cache
      queryClient.setQueryData(noteKeys.detail(updatedNote.id), (old: Note | undefined) => {
        if (!old) return old;
        return {
          ...old,
          ...updatedNote,
          updatedAt: new Date().toISOString(), // Optimistic update of timestamps
        };
      });

      queryClient.setQueryData(noteKeys.lists(), (old: Note[] = []) => {
        return old.map(note => 
          note.id === updatedNote.id
            ? { ...note, ...updatedNote, updatedAt: new Date().toISOString() }
            : note
        );
      });

      // Return a context object with the snapshotted values
      return { previousNote, previousNotes };
    },
    onError: (err, updatedNote, context) => {
      // If the mutation fails, revert back to previous values
      if (context?.previousNote) {
        queryClient.setQueryData(noteKeys.detail(updatedNote.id), context.previousNote);
      }
      if (context?.previousNotes) {
        queryClient.setQueryData(noteKeys.lists(), context.previousNotes);
      }
      toast.error(`Failed to update note: ${err.message}`);
    },
    onSettled: (data, error, { id }) => {
      // Invalidate related queries to refetch fresh data
      // queryClient.invalidateQueries({ queryKey: noteKeys.detail(id) });
      // queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
      
      if (!error) {
        toast.success('Note updated successfully');
      }
    },
  }));
}

// Delete note mutation
export function useDeleteNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation(() => ({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/notes/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete note');
      }

      return response.json();
    },
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: noteKeys.lists() });

      // Snapshot the current state
      const previousNotes = queryClient.getQueryData(noteKeys.lists());

      // Optimistically remove the note from the list
      queryClient.setQueryData(noteKeys.lists(), (old: Note[] = []) => {
        return old.filter(note => note.id !== id);
      });

      // Return context with snapshotted value
      return { previousNotes };
    },
    onError: (err, id, context) => {
      // If the mutation fails, revert back to previous values
      if (context?.previousNotes) {
        queryClient.setQueryData(noteKeys.lists(), context.previousNotes);
      }
      toast.error(`Failed to delete note: ${err.message}`);
    },
    onSettled: () => {
      // Invalidate lists to refetch with updated data
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: noteKeys.analytics() });
    },
    onSuccess: () => {
      toast.success('Note deleted successfully');
    },
  }));
}

// Get note analytics query
export function useNoteAnalyticsQuery() {
  return useQuery(() => ({
    queryKey: noteKeys.analytics(),
    queryFn: async () => {
      const response = await fetch('/api/notes/analytics');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch note analytics');
      }
      return response.json() as Promise<NoteAnalytics>;
    },
  }));
}

// Archive/unarchive note mutation (convenience wrapper around update)
export function useToggleNoteArchiveMutation() {
  const updateNoteMutation = useUpdateNoteMutation();
  
  return useMutation(() => ({
    mutationFn: async ({ id, currentStatus }: { id: string, currentStatus: 'active' | 'archived' }) => {
      const newStatus = currentStatus === 'active' ? 'archived' : 'active';
      return updateNoteMutation.mutate({ id, status: newStatus });
    },
  }));
} 