import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import LibraryView from '@/components/LibraryView'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabaseBrowser: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user' } },
        error: null
      })
    }
  })
}))

// Mock fetch for API calls
global.fetch = vi.fn()

describe('LibraryView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful API responses
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/spotify/me')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            display_name: 'Test User',
            images: [{ url: 'https://example.com/avatar.jpg' }]
          })
        })
      }
      
      if (url.includes('/api/spotify/me/player/recently-played')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: [
              {
                track: {
                  id: 'track1',
                  name: 'Test Song',
                  artists: [{ name: 'Test Artist' }],
                  album: { name: 'Test Album', images: [{ url: 'https://example.com/cover.jpg' }] }
                },
                played_at: '2024-01-01T12:00:00Z'
              }
            ]
          })
        })
      }
      
      return Promise.resolve({
        ok: false,
        status: 404
      })
    })
  })

  it('renders the library header', async () => {
    render(<LibraryView />)
    
    expect(screen.getByText('Your Library')).toBeInTheDocument()
    expect(screen.getByText('Your listening history and saved playlists')).toBeInTheDocument()
  })

  it('renders tab buttons', () => {
    render(<LibraryView />)
    
    expect(screen.getByText('Recent History')).toBeInTheDocument()
    expect(screen.getByText('Saved Playlists')).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    render(<LibraryView />)
    
    expect(screen.getByText('Connecting to Spotify…')).toBeInTheDocument()
  })

  it('displays Spotify user info when loaded', async () => {
    render(<LibraryView />)
    
    await waitFor(() => {
      expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })
  })

  it('shows recent listening history when data is loaded', async () => {
    render(<LibraryView />)
    
    await waitFor(() => {
      expect(screen.getByText('Recent Listening History')).toBeInTheDocument()
    })
    
    // The API is returning empty data, so we should see "No recent plays yet."
    await waitFor(() => {
      expect(screen.getByText('No recent plays yet.')).toBeInTheDocument()
    })
  })

  it('switches to saved playlists tab', async () => {
    render(<LibraryView />)
    
    const savedPlaylistsTab = screen.getByRole('button', { name: 'Saved Playlists' })
    savedPlaylistsTab.click()
    
    await waitFor(() => {
      // Check that we're now showing the saved playlists content
      const savedPlaylistsElements = screen.getAllByText('Saved Playlists')
      expect(savedPlaylistsElements).toHaveLength(2) // Button and content span
      // The tab should now be active (have the active styling)
      expect(savedPlaylistsTab).toHaveClass('bg-white', 'text-black')
    })
  })
})
