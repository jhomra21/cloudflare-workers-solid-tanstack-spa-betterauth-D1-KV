import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, For, Show, createEffect } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Icon } from "~/components/ui/icon";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { NoteCard } from "~/components/NoteCard";
import { NoteEditor } from "~/components/NoteEditor";
import { 
  useNotesQuery, 
  useCreateNoteMutation, 
  useUpdateNoteMutation, 
  useDeleteNoteMutation,
  notesQueryOptions,
  type Note,
  type NoteInput,
  type NoteUpdateInput
} from "~/lib/notes-actions";
import { Transition, TransitionGroup } from "solid-transition-group";

export const Route = createFileRoute('/dashboard/notes')({
  loader: async ({ context }) => {
    const queryClient = context.queryClient;
    const notes = await queryClient.ensureQueryData(notesQueryOptions());
    return { notes };
  },
  component: NotesPage,
});

function NotesPage() {
  const loaderData = Route.useLoaderData();
  const notesQuery = useNotesQuery();

  const [notes, setNotes] = createStore<Note[]>(loaderData().notes);

  createEffect(() => {
    if (notesQuery.data) {
      setNotes(reconcile(notesQuery.data, { key: "id" }));
    }
  });

  const [isEditorOpen, setIsEditorOpen] = createSignal(false);
  const [editedNote, setEditedNote] = createSignal<NoteInput | NoteUpdateInput>({ title: '', content: '' });
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = createSignal(false);
  const [noteToDelete, setNoteToDelete] = createSignal<Note | undefined>(undefined);

  const createNoteMutation = useCreateNoteMutation();
  const updateNoteMutation = useUpdateNoteMutation();
  const deleteNoteMutation = useDeleteNoteMutation();

  const handleCreateNote = () => {
    setEditedNote({ title: '', content: '' });
    setIsEditorOpen(true);
  };

  const handleEditNote = (note: Note) => {
    setEditedNote(note);
    setIsEditorOpen(true);
  };

  const handleSaveNote = () => {
    const noteData = editedNote();
    if ('id' in noteData) {
      updateNoteMutation.mutate(noteData as NoteUpdateInput & { id: string });
    } else {
      createNoteMutation.mutate(noteData as NoteInput);
    }
    setIsEditorOpen(false);
  };

  const handleArchiveNote = (note: Note) => {
    const newStatus = note.status === 'active' ? 'archived' : 'active';
    updateNoteMutation.mutate({ 
      id: note.id, 
      status: newStatus 
    });
  };

  const handleDeleteRequest = (note: Note) => {
    setNoteToDelete(note);
    setIsDeleteConfirmOpen(true);
  };
  
  const confirmDelete = () => {
    if (noteToDelete()) {
      deleteNoteMutation.mutate(noteToDelete()!.id);
    }
    setIsDeleteConfirmOpen(false);
  };

  return (
    <div class="container py-8 px-4 mx-auto max-w-5xl">
      <div class="mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div class="sm:text-left w-full">
          <h1 class="text-2xl font-semibold tracking-tight">Notes</h1>
          <p class="text-muted-foreground mt-1">
            Create, edit, and manage your personal notes.
          </p>
        </div>
        
        <Button variant="sf-compute" onClick={handleCreateNote} class="w-full sm:w-auto">
          <Icon name="plus" class="h-5 w-5 mr-2" />
          New Note
        </Button>
      </div>
      
      <Show 
        when={!notesQuery.isLoading && !notesQuery.isError} 
        fallback={
          <div class="flex justify-center p-8">
            <Show 
              when={!notesQuery.isError} 
              fallback={<p>Error loading notes</p>}
            >
              <p>Loading notes...</p>
            </Show>
          </div>
        }
      >
        <Transition
          mode="outin"
          onEnter={(el, done) => {
            const a = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-in-out" });
            a.finished.then(done);
          }}
          onExit={(el, done) => {
            const a = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, easing: "ease-in-out" });
            a.finished.then(done);
          }}
        >
          <Show
            when={notes.length > 0}
            fallback={
              <Card class="flex flex-col items-center justify-center py-12 px-4">
                <Icon name="stickynote" class="h-12 w-12 text-muted-foreground mb-4" />
                <h3 class="text-lg font-medium mb-2">No notes yet</h3>
                <p class="text-muted-foreground text-center mb-6">
                  Create your first note to get started
                </p>
                <Button onClick={handleCreateNote}>Create Note</Button>
              </Card>
            }
          >
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <TransitionGroup
                onEnter={(el, done) => {
                  const a = el.animate(
                    [
                      { opacity: 0, transform: 'scale(0.9)' },
                      { opacity: 1, transform: 'scale(1)' }
                    ],
                    { duration: 250, easing: 'ease-in-out' }
                  );
                  a.finished.then(done);
                }}
                onExit={(el, done) => {
                  const a = el.animate(
                    [
                      { opacity: 1, transform: 'scale(1)' },
                      { opacity: 0, transform: 'scale(0.9)' }
                    ],
                    { duration: 200, easing: 'ease-in-out' }
                  );
                  a.finished.then(done);
                }}
              >
                <For each={notes}>
                  {(note) => (
                    <NoteCard 
                      note={note} 
                      onEdit={handleEditNote}
                      onArchive={handleArchiveNote}
                      onDelete={handleDeleteRequest}
                    />
                  )}
                </For>
              </TransitionGroup>
            </div>
          </Show>
        </Transition>
      </Show>
 
      <NoteEditor
        isOpen={isEditorOpen()}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveNote}
        note={editedNote()}
        setNote={setEditedNote}
      />

      <Dialog open={isDeleteConfirmOpen()} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the note titled "{noteToDelete()?.title}".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 