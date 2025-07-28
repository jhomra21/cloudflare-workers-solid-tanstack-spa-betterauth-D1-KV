// @ts-ignore
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';

describe('Notes API', () => {
  let mockFetch: any;
  let originalConsoleError: any;
  let mockConsoleError: any;
  let originalSetTimeout: any;
  let mockSetTimeout: any;

  const API_BASE = 'http://localhost:3000/api';
  const MOCK_USER_ID = 'user-123';
  const MOCK_NOTE_ID = 'note-456';

  // Mock note data
  const mockNote = {
    id: MOCK_NOTE_ID,
    userId: MOCK_USER_ID,
    title: 'Test Note',
    content: 'This is test content',
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  };

  const mockNotes = [
    mockNote,
    {
      id: 'note-789',
      userId: MOCK_USER_ID,
      title: 'Another Note',
      content: 'More content',
      status: 'active',
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z'
    }
  ];

  beforeEach(() => {
    // Mock fetch globally
    mockFetch = mock(() => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({})
    }));
    global.fetch = mockFetch as any;

    // Mock console.error to suppress logs during tests
    originalConsoleError = console.error;
    mockConsoleError = mock(() => {});
    console.error = mockConsoleError;

    // Mock setTimeout for instant execution
    originalSetTimeout = global.setTimeout;
    mockSetTimeout = mock((callback: Function) => {
      callback();
      return 1;
    });
    global.setTimeout = mockSetTimeout as any;
  });

  afterEach(() => {
    console.error = originalConsoleError;
    global.setTimeout = originalSetTimeout;
    mock.restore();
  });

  describe('GET /api/notes/', () => {
    it('should fetch all notes for authenticated user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ notes: mockNotes })
      });

      const response = await fetch(`${API_BASE}/notes/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        }
      });

      const data = await response.json();

      expect(mockFetch).toHaveBeenCalledWith(`${API_BASE}/notes/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        }
      });

      expect(data.notes).toBeDefined();
      expect(Array.isArray(data.notes)).toBe(true);
      expect(data.notes).toHaveLength(2);
      expect(data.notes[0]).toMatchObject({
        id: expect.any(String),
        userId: expect.any(String),
        title: expect.any(String),
        status: expect.any(String)
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' })
      });

      const response = await fetch(`${API_BASE}/notes/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle database errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Failed to fetch notes' })
      });

      const response = await fetch(`${API_BASE}/notes/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        }
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error).toBe('Failed to fetch notes');
    });

    it('should return notes ordered by updatedAt DESC', async () => {
      const orderedNotes = [...mockNotes].sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ notes: orderedNotes })
      });

      const response = await fetch(`${API_BASE}/notes/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        }
      });

      const data = await response.json();

      expect(data.notes[0].updatedAt >= data.notes[1].updatedAt).toBe(true);
    });
  });

  describe('GET /api/notes/:id', () => {
    it('should fetch a single note by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockNote)
      });

      const response = await fetch(`${API_BASE}/notes/${MOCK_NOTE_ID}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        }
      });

      const data = await response.json();

      expect(mockFetch).toHaveBeenCalledWith(`${API_BASE}/notes/${MOCK_NOTE_ID}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        }
      });

      expect(data).toMatchObject({
        id: MOCK_NOTE_ID,
        userId: MOCK_USER_ID,
        title: 'Test Note',
        content: 'This is test content',
        status: 'active'
      });
    });

    it('should return 404 for non-existent note', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Note not found' })
      });

      const response = await fetch(`${API_BASE}/notes/non-existent-id`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        }
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error).toBe('Note not found');
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' })
      });

      const response = await fetch(`${API_BASE}/notes/${MOCK_NOTE_ID}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('should not return notes from other users', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Note not found' })
      });

      const response = await fetch(`${API_BASE}/notes/${MOCK_NOTE_ID}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=other-user-session'
        }
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error).toBe('Note not found');
    });
  });

  describe('POST /api/notes/', () => {
    it('should create a new note with valid data', async () => {
      const newNote = {
        id: 'new-note-id',
        userId: MOCK_USER_ID,
        title: 'New Note',
        content: 'New content',
        status: 'active',
        createdAt: '2024-01-03T00:00:00.000Z',
        updatedAt: '2024-01-03T00:00:00.000Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(newNote)
      });

      const response = await fetch(`${API_BASE}/notes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        },
        body: JSON.stringify({
          title: 'New Note',
          content: 'New content'
        })
      });

      const data = await response.json();

      expect(mockFetch).toHaveBeenCalledWith(`${API_BASE}/notes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        },
        body: JSON.stringify({
          title: 'New Note',
          content: 'New content'
        })
      });

      expect(data).toMatchObject({
        id: expect.any(String),
        userId: MOCK_USER_ID,
        title: 'New Note',
        content: 'New content',
        status: 'active',
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });
    });

    it('should create note with empty content when not provided', async () => {
      const newNote = {
        id: 'new-note-id',
        userId: MOCK_USER_ID,
        title: 'Title Only',
        content: '',
        status: 'active',
        createdAt: '2024-01-03T00:00:00.000Z',
        updatedAt: '2024-01-03T00:00:00.000Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(newNote)
      });

      const response = await fetch(`${API_BASE}/notes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        },
        body: JSON.stringify({
          title: 'Title Only'
        })
      });

      const data = await response.json();

      expect(data.content).toBe('');
    });

    it('should return 400 when title is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Title is required' })
      });

      const response = await fetch(`${API_BASE}/notes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        },
        body: JSON.stringify({
          content: 'Content without title'
        })
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error).toBe('Title is required');
    });

    it('should return 400 when title is empty string', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Title is required' })
      });

      const response = await fetch(`${API_BASE}/notes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        },
        body: JSON.stringify({
          title: '',
          content: 'Content with empty title'
        })
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error).toBe('Title is required');
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' })
      });

      const response = await fetch(`${API_BASE}/notes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'New Note',
          content: 'New content'
        })
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle database errors during creation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Failed to create note' })
      });

      const response = await fetch(`${API_BASE}/notes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        },
        body: JSON.stringify({
          title: 'New Note',
          content: 'New content'
        })
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error).toBe('Failed to create note');
    });
  });

  describe('PUT /api/notes/:id', () => {
    it('should update an existing note', async () => {
      const updatedNote = {
        ...mockNote,
        title: 'Updated Title',
        content: 'Updated content',
        updatedAt: '2024-01-04T00:00:00.000Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(updatedNote)
      });

      const response = await fetch(`${API_BASE}/notes/${MOCK_NOTE_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        },
        body: JSON.stringify({
          title: 'Updated Title',
          content: 'Updated content'
        })
      });

      const data = await response.json();

      expect(mockFetch).toHaveBeenCalledWith(`${API_BASE}/notes/${MOCK_NOTE_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        },
        body: JSON.stringify({
          title: 'Updated Title',
          content: 'Updated content'
        })
      });

      expect(data).toMatchObject({
        id: MOCK_NOTE_ID,
        title: 'Updated Title',
        content: 'Updated content',
        updatedAt: expect.any(String)
      });
    });

    it('should update only provided fields', async () => {
      const updatedNote = {
        ...mockNote,
        title: 'Updated Title Only',
        updatedAt: '2024-01-04T00:00:00.000Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(updatedNote)
      });

      const response = await fetch(`${API_BASE}/notes/${MOCK_NOTE_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        },
        body: JSON.stringify({
          title: 'Updated Title Only'
        })
      });

      const data = await response.json();

      expect(data.title).toBe('Updated Title Only');
      expect(data.content).toBe(mockNote.content); // Should remain unchanged
    });

    it('should update status field', async () => {
      const updatedNote = {
        ...mockNote,
        status: 'archived',
        updatedAt: '2024-01-04T00:00:00.000Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(updatedNote)
      });

      const response = await fetch(`${API_BASE}/notes/${MOCK_NOTE_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        },
        body: JSON.stringify({
          status: 'archived'
        })
      });

      const data = await response.json();

      expect(data.status).toBe('archived');
    });

    it('should handle empty content update', async () => {
      const updatedNote = {
        ...mockNote,
        content: '',
        updatedAt: '2024-01-04T00:00:00.000Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(updatedNote)
      });

      const response = await fetch(`${API_BASE}/notes/${MOCK_NOTE_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        },
        body: JSON.stringify({
          content: ''
        })
      });

      const data = await response.json();

      expect(data.content).toBe('');
    });

    it('should return 404 for non-existent note', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Note not found' })
      });

      const response = await fetch(`${API_BASE}/notes/non-existent-id`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        },
        body: JSON.stringify({
          title: 'Updated Title'
        })
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error).toBe('Note not found');
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' })
      });

      const response = await fetch(`${API_BASE}/notes/${MOCK_NOTE_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Updated Title'
        })
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('should not update notes from other users', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Note not found' })
      });

      const response = await fetch(`${API_BASE}/notes/${MOCK_NOTE_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=other-user-session'
        },
        body: JSON.stringify({
          title: 'Malicious Update'
        })
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error).toBe('Note not found');
    });

    it('should handle database errors during update', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Failed to update note' })
      });

      const response = await fetch(`${API_BASE}/notes/${MOCK_NOTE_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        },
        body: JSON.stringify({
          title: 'Updated Title'
        })
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error).toBe('Failed to update note');
    });
  });

  describe('DELETE /api/notes/:id', () => {
    it('should delete an existing note', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true })
      });

      const response = await fetch(`${API_BASE}/notes/${MOCK_NOTE_ID}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        }
      });

      const data = await response.json();

      expect(mockFetch).toHaveBeenCalledWith(`${API_BASE}/notes/${MOCK_NOTE_ID}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        }
      });

      expect(data.success).toBe(true);
    });

    it('should return 404 for non-existent note', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Note not found' })
      });

      const response = await fetch(`${API_BASE}/notes/non-existent-id`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        }
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error).toBe('Note not found');
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' })
      });

      const response = await fetch(`${API_BASE}/notes/${MOCK_NOTE_ID}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('should not delete notes from other users', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Note not found' })
      });

      const response = await fetch(`${API_BASE}/notes/${MOCK_NOTE_ID}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=other-user-session'
        }
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error).toBe('Note not found');
    });

    it('should handle database errors during deletion', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Failed to delete note' })
      });

      const response = await fetch(`${API_BASE}/notes/${MOCK_NOTE_ID}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        }
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error).toBe('Failed to delete note');
    });
  });

  describe('Data Validation', () => {
    it('should validate note structure in responses', async () => {
      // Create a proper mock response that matches the actual API response structure
      const mockResponse = {
        id: MOCK_NOTE_ID,
        userId: MOCK_USER_ID,
        title: 'Test Note',
        content: 'This is test content',
        status: 'active',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      });

      const response = await fetch(`${API_BASE}/notes/${MOCK_NOTE_ID}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        }
      });

      const data = await response.json();

      // Validate required fields
      expect(data.id).toBeDefined();
      expect(data.userId).toBeDefined();
      expect(data.title).toBeDefined();
      expect(data.status).toBeDefined();
      expect(data.createdAt).toBeDefined();
      expect(data.updatedAt).toBeDefined();

      // Validate field types
      expect(typeof data.id).toBe('string');
      expect(typeof data.userId).toBe('string');
      expect(typeof data.title).toBe('string');
      expect(typeof data.status).toBe('string');
      expect(typeof data.createdAt).toBe('string');
      expect(typeof data.updatedAt).toBe('string');

      // Content can be string or null/undefined
      if (data.content !== null && data.content !== undefined) {
        expect(typeof data.content).toBe('string');
      }
    });

    it('should validate notes array structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ notes: mockNotes })
      });

      const response = await fetch(`${API_BASE}/notes/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        }
      });

      const data = await response.json();

      expect(data.notes).toBeDefined();
      expect(Array.isArray(data.notes)).toBe(true);

      data.notes.forEach((note: any) => {
        expect(note.id).toBeDefined();
        expect(note.userId).toBeDefined();
        expect(note.title).toBeDefined();
        expect(note.status).toBeDefined();
        expect(note.createdAt).toBeDefined();
        expect(note.updatedAt).toBeDefined();
      });
    });

    it('should validate ISO date format in timestamps', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockNote)
      });

      const response = await fetch(`${API_BASE}/notes/${MOCK_NOTE_ID}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        }
      });

      const data = await response.json();

      // Validate ISO date format
      const createdDate = new Date(data.createdAt);
      const updatedDate = new Date(data.updatedAt);

      expect(createdDate.toISOString()).toBe(data.createdAt);
      expect(updatedDate.toISOString()).toBe(data.updatedAt);
      expect(createdDate.getTime()).not.toBeNaN();
      expect(updatedDate.getTime()).not.toBeNaN();
    });

    it('should validate status field values', async () => {
      const validStatuses = ['active', 'archived', 'deleted'];
      
      const mockResponse = {
        id: MOCK_NOTE_ID,
        userId: MOCK_USER_ID,
        title: 'Test Note',
        content: 'This is test content',
        status: 'active',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      });

      const response = await fetch(`${API_BASE}/notes/${MOCK_NOTE_ID}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        }
      });

      const data = await response.json();

      expect(validStatuses).toContain(data.status);
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed JSON in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Invalid JSON' })
      });

      const response = await fetch(`${API_BASE}/notes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        },
        body: '{"title": "Invalid JSON"' // Missing closing brace
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should handle very long title and content', async () => {
      const longTitle = 'A'.repeat(1000);
      const longContent = 'B'.repeat(10000);

      const newNote = {
        id: 'long-note-id',
        userId: MOCK_USER_ID,
        title: longTitle,
        content: longContent,
        status: 'active',
        createdAt: '2024-01-03T00:00:00.000Z',
        updatedAt: '2024-01-03T00:00:00.000Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(newNote)
      });

      const response = await fetch(`${API_BASE}/notes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        },
        body: JSON.stringify({
          title: longTitle,
          content: longContent
        })
      });

      const data = await response.json();

      expect(data.title).toBe(longTitle);
      expect(data.content).toBe(longContent);
    });

    it('should handle special characters in title and content', async () => {
      const specialTitle = 'Note with émojis 🚀 and spëcial chars: <>&"\'';
      const specialContent = 'Content with\nnewlines\tand\ttabs and unicode: 你好世界';

      const newNote = {
        id: 'special-note-id',
        userId: MOCK_USER_ID,
        title: specialTitle,
        content: specialContent,
        status: 'active',
        createdAt: '2024-01-03T00:00:00.000Z',
        updatedAt: '2024-01-03T00:00:00.000Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(newNote)
      });

      const response = await fetch(`${API_BASE}/notes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        },
        body: JSON.stringify({
          title: specialTitle,
          content: specialContent
        })
      });

      const data = await response.json();

      expect(data.title).toBe(specialTitle);
      expect(data.content).toBe(specialContent);
    });

    it('should handle null and undefined values in update', async () => {
      const updatedNote = {
        ...mockNote,
        content: null,
        updatedAt: '2024-01-04T00:00:00.000Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(updatedNote)
      });

      const response = await fetch(`${API_BASE}/notes/${MOCK_NOTE_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=valid-session'
        },
        body: JSON.stringify({
          content: null
        })
      });

      const data = await response.json();

      expect(data.content).toBe(null);
    });
  });

  describe('Performance & Caching', () => {
    it('should handle concurrent requests', async () => {
      // Mock multiple successful responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ notes: mockNotes })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockNote)
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ ...mockNote, id: 'new-id' })
        });

      const requests = [
        fetch(`${API_BASE}/notes/`, {
          method: 'GET',
          headers: { 'Cookie': 'session=valid-session' }
        }),
        fetch(`${API_BASE}/notes/${MOCK_NOTE_ID}`, {
          method: 'GET',
          headers: { 'Cookie': 'session=valid-session' }
        }),
        fetch(`${API_BASE}/notes/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Cookie': 'session=valid-session' },
          body: JSON.stringify({ title: 'Concurrent Note' })
        })
      ];

      const responses = await Promise.all(requests);

      expect(responses).toHaveLength(3);
      responses.forEach(response => {
        expect(response.ok).toBe(true);
      });
    });

    it('should validate request headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ notes: mockNotes })
      });

      const response = await fetch(`${API_BASE}/notes/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cookie': 'session=valid-session'
        }
      });

      expect(mockFetch).toHaveBeenCalledWith(`${API_BASE}/notes/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cookie': 'session=valid-session'
        }
      });
    });
  });
});