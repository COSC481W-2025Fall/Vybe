import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SongSearchModal from '@/components/SongSearchModal';
import { supabaseBrowser } from '@/lib/supabase/client';
import { testAccessibility } from '@/test/test-utils';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabaseBrowser: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

describe('SongSearchModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSelectSong = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    supabaseBrowser.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: {
                identities: [{ provider: 'spotify' }],
              },
            },
          },
        }),
      },
    });
  });

  it('renders modal with close button', () => {
    render(<SongSearchModal onClose={mockOnClose} onSelectSong={mockOnSelectSong} />);

    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    render(<SongSearchModal onClose={mockOnClose} onSelectSong={mockOnSelectSong} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    await userEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('searches for songs when typing', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tracks: {
          items: [
            {
              id: 'song1',
              name: 'Test Song',
              artists: [{ name: 'Test Artist' }],
              album: { images: [{ url: 'cover.jpg' }] },
              duration_ms: 200000,
            },
          ],
        },
      }),
    });

    render(<SongSearchModal onClose={mockOnClose} onSelectSong={mockOnSelectSong} />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    await userEvent.type(searchInput, 'test');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('detects Spotify provider', async () => {
    supabaseBrowser.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: {
                identities: [{ provider: 'spotify' }],
              },
            },
          },
        }),
      },
    });

    render(<SongSearchModal onClose={mockOnClose} onSelectSong={mockOnSelectSong} />);

    await waitFor(() => {
      expect(supabaseBrowser).toHaveBeenCalled();
    });
  });

  it('detects Google provider', async () => {
    supabaseBrowser.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: {
                identities: [{ provider: 'google' }],
              },
            },
          },
        }),
      },
    });

    render(<SongSearchModal onClose={mockOnClose} onSelectSong={mockOnSelectSong} />);

    await waitFor(() => {
      expect(supabaseBrowser).toHaveBeenCalled();
    });
  });

  it('calls onSelectSong when song is clicked', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tracks: {
          items: [
            {
              id: 'song1',
              name: 'Test Song',
              artists: [{ name: 'Test Artist' }],
              album: { images: [{ url: 'cover.jpg' }] },
              duration_ms: 200000,
            },
          ],
        },
      }),
    });

    render(<SongSearchModal onClose={mockOnClose} onSelectSong={mockOnSelectSong} />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    await userEvent.type(searchInput, 'test');

    await waitFor(() => {
      expect(screen.getByText('Test Song')).toBeInTheDocument();
    });

    const songButton = screen.getByText('Test Song');
    await userEvent.click(songButton);

    expect(mockOnSelectSong).toHaveBeenCalled();
  });

  it('displays error message on search failure', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<SongSearchModal onClose={mockOnClose} onSelectSong={mockOnSelectSong} />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    await userEvent.type(searchInput, 'test');

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('shows loading state during search', async () => {
    global.fetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<SongSearchModal onClose={mockOnClose} onSelectSong={mockOnSelectSong} />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    await userEvent.type(searchInput, 'test');

    await waitFor(() => {
      expect(screen.getByText(/searching/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('debounces search input', async () => {
    vi.useFakeTimers();
    
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        tracks: { items: [] },
      }),
    });

    render(<SongSearchModal onClose={mockOnClose} onSelectSong={mockOnSelectSong} />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    await userEvent.type(searchInput, 't');
    await userEvent.type(searchInput, 'e');
    await userEvent.type(searchInput, 's');
    await userEvent.type(searchInput, 't');

    vi.advanceTimersByTime(500);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    vi.useRealTimers();
  });
});

