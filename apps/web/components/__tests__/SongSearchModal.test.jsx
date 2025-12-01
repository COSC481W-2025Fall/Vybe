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
        tracks: [
          {
            id: 'song1',
            name: 'Test Song',
            artists: [{ name: 'Test Artist' }],
            album: { images: [{ url: 'cover.jpg' }], name: 'Test Album' },
            duration_ms: 200000,
            external_urls: { spotify: 'https://spotify.com/track/song1' },
          },
        ],
      }),
    });

    render(<SongSearchModal onClose={mockOnClose} onSelectSong={mockOnSelectSong} />);

    // Wait for provider to be set
    await waitFor(() => {
      expect(supabaseBrowser).toHaveBeenCalled();
    });

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
    // Mock search fetch
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tracks: [
          {
            id: 'song1',
            name: 'Test Song',
            artists: [{ name: 'Test Artist' }],
            album: { images: [{ url: 'cover.jpg' }], name: 'Test Album' },
            duration_ms: 200000,
            external_urls: { spotify: 'https://spotify.com/track/song1' },
          },
        ],
      }),
    });

    // Mock YouTube fetch (called when selecting a Spotify song)
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        videoUrl: 'https://www.youtube.com/watch?v=test123',
      }),
    });

    render(<SongSearchModal onClose={mockOnClose} onSelectSong={mockOnSelectSong} />);

    // Wait for provider to be set
    await waitFor(() => {
      expect(supabaseBrowser).toHaveBeenCalled();
    });

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

    // Wait for provider to be set
    await waitFor(() => {
      expect(supabaseBrowser).toHaveBeenCalled();
    });

    const searchInput = screen.getByPlaceholderText(/search/i);
    await userEvent.type(searchInput, 'test');

    await waitFor(() => {
      expect(screen.getByText(/failed to search/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('shows loading state during search', async () => {
    global.fetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { container } = render(<SongSearchModal onClose={mockOnClose} onSelectSong={mockOnSelectSong} />);

    // Wait for provider to be set
    await waitFor(() => {
      expect(supabaseBrowser).toHaveBeenCalled();
    });

    const searchInput = screen.getByPlaceholderText(/search/i);
    await userEvent.type(searchInput, 'test');

    // Wait for loading spinner to appear (check for the spinner element with animate-spin class)
    await waitFor(() => {
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('debounces search input', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        tracks: [],
      }),
    });

    render(<SongSearchModal onClose={mockOnClose} onSelectSong={mockOnSelectSong} />);

    // Wait for provider to be set
    await waitFor(() => {
      expect(supabaseBrowser).toHaveBeenCalled();
    });

    const searchInput = screen.getByPlaceholderText(/search/i);
    
    // Type characters quickly - should only trigger one search after debounce
    await userEvent.type(searchInput, 't');
    await userEvent.type(searchInput, 'e');
    await userEvent.type(searchInput, 's');
    await userEvent.type(searchInput, 't');

    // Wait for debounce delay (500ms) plus a small buffer
    // Note: The component now searches both Spotify and YouTube in parallel, so expect 2 calls
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    }, { timeout: 1500 });
  });

  it('renders search input field', () => {
    render(<SongSearchModal onClose={mockOnClose} onSelectSong={mockOnSelectSong} />);
    
    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('has close button', () => {
    render(<SongSearchModal onClose={mockOnClose} onSelectSong={mockOnSelectSong} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(closeButton).toBeInTheDocument();
  });

  it('search input accepts text', async () => {
    render(<SongSearchModal onClose={mockOnClose} onSelectSong={mockOnSelectSong} />);
    
    const searchInput = screen.getByPlaceholderText(/search/i);
    await userEvent.type(searchInput, 'hello');
    
    expect(searchInput).toHaveValue('hello');
  });

  it('renders modal container', () => {
    const { container } = render(<SongSearchModal onClose={mockOnClose} onSelectSong={mockOnSelectSong} />);
    
    expect(container.firstChild).toBeInTheDocument();
  });
});

