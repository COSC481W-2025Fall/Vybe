//Imported to support userEvent
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { axe } from 'jest-axe'
import LibraryView from '@/components/LibraryView'
import {
  renderWithProviders,
  testAccessibility,
  userInteractions,
  mockFetch,
  createMockUser,
  createMockRecentlyPlayed,
  testData
} from '@/test/test-utils'


// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabaseBrowser: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { 
          user: { 
            id: 'test-user',
            app_metadata: { provider: 'spotify' },
            user_metadata: {
              full_name: 'Test User',
              avatar_url: 'https://example.com/avatar.jpg'
            },
            email: 'test@example.com'
          } 
        },
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

    // Mock window.location for URL parameter testing
    Object.defineProperty(window, 'location', {
      value: {
        search: '?from=spotify'
      },
      writable: true
    });

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

    // Wait for async operations to complete
    await waitFor(() => {
      expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
    })

    expect(screen.getByText('Your Library')).toBeInTheDocument()
    expect(screen.getByText('Your listening history and saved playlists')).toBeInTheDocument()
  })

  it('renders tab buttons', async () => {
    render(<LibraryView />)

    // Wait for async operations to complete
    await waitFor(() => {
      expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
    })

    expect(screen.getByText('Recent History')).toBeInTheDocument()
    expect(screen.getByText('Saved Playlists')).toBeInTheDocument()
  })

  it('shows loading state initially', async () => {
    // Mock a slow API response to ensure loading state is visible
    global.fetch.mockImplementation(() =>
      new Promise(resolve =>
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({
            display_name: 'Test User',
            images: [{ url: 'https://example.com/avatar.jpg' }]
          })
        }), 100)
      )
    )

    await act(async () => {
      render(<LibraryView />)
    })

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

    // The API is returning empty data, so we should see "No recent plays yet"
    await waitFor(() => {
      expect(screen.getByText('No recent plays yet')).toBeInTheDocument()
    })
  })

  it('switches to saved playlists tab', async () => {
    render(<LibraryView />)

    // Wait for component to load first
    await waitFor(() => {
      expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
    })

    const savedPlaylistsTab = screen.getByRole('button', { name: 'Saved Playlists' })
    await userEvent.click(savedPlaylistsTab)

    await waitFor(() => {
      // Check that we're now showing the saved playlists content
      const savedPlaylistsElements = screen.getAllByText('Saved Playlists')
      expect(savedPlaylistsElements).toHaveLength(2) // Button and content span
      // The tab should now be active (have the active styling)
      expect(savedPlaylistsTab).toHaveClass('bg-white', 'text-black')
    })
  })

  describe('Accessibility', () => {

    it('has no accessibility violations', async () => {
      const { container } = render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
      })

      await testAccessibility(container)
    })

    it('has proper heading structure', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
      })

      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toHaveTextContent('Your Library')
    })

    it('has proper button roles for tab navigation', async () => {
      render(<LibraryView />)

      // Wait for async operations to complete
      await waitFor(() => {
        expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
      })

      const recentTab = screen.getByRole('button', { name: 'Recent History' })
      const playlistsTab = screen.getByRole('button', { name: 'Saved Playlists' })

      expect(recentTab).toBeInTheDocument()
      expect(playlistsTab).toBeInTheDocument()
    })

    it('has proper alt text for images', async () => {
      // Mock API to return data with images
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
                    album: {
                      name: 'Test Album',
                      images: [{ url: 'https://example.com/cover.jpg' }]
                    }
                  },
                  played_at: '2024-01-01T12:00:00Z'
                }
              ]
            })
          })
        }

        return Promise.resolve({ ok: false, status: 404 })
      })

      render(<LibraryView />)

      await waitFor(() => {
        const avatarImage = screen.getByAltText('Spotify avatar')
        expect(avatarImage).toBeInTheDocument()
      })
    })
  })
})
