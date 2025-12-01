import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import LibraryView from '@/components/LibraryView'
import { testAccessibility } from '@/test/test-utils'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => {
  const mockSupabaseUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: {
      full_name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg'
    },
    identities: [{ provider: 'spotify' }]
  }

  return {
    supabaseBrowser: vi.fn(() => ({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockSupabaseUser },
          error: null
        })
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { last_used_provider: 'spotify' },
              error: null
            })
          }))
        }))
      }))
    }))
  }
})

// Mock fetch for API calls
global.fetch = vi.fn()

describe('LibraryView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    Object.defineProperty(window, 'location', {
      value: { search: '?from=spotify' },
      writable: true,
      configurable: true
    })

    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/spotify/me/player/recently-played')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: [],
            next: null
          })
        })
      }
      
      if (url.includes('/api/spotify/me/playlists')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: []
          })
        })
      }
      
      if (url.includes('/api/spotify/me')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            display_name: 'Test User',
            images: []
          })
        })
      }
      
      return Promise.resolve({ ok: false, status: 404 })
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders the library header', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Your Library')).toBeInTheDocument()
      })
    })

    it('shows tabs for different views', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Recent History' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Saved Playlists' })).toBeInTheDocument()
      })
    })
  })

  describe('Tab Navigation', () => {
    it('shows Recent History tab by default', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Recent Listening History')).toBeInTheDocument()
      })
    })

    it('switches to Saved Playlists tab when clicked', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Recent Listening History')).toBeInTheDocument()
      })

      const savedPlaylistsTab = screen.getByRole('button', { name: 'Saved Playlists' })
      await userEvent.click(savedPlaylistsTab)

      await waitFor(() => {
        expect(screen.getByText('Your Playlists')).toBeInTheDocument()
      })
    })
  })

  describe('Empty States', () => {
    it('shows empty state when no recent plays exist', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('No recent plays yet')).toBeInTheDocument()
      })
    })

    it('shows empty state when no playlists exist', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Recent Listening History')).toBeInTheDocument()
      })

      const savedPlaylistsTab = screen.getByRole('button', { name: 'Saved Playlists' })
      await userEvent.click(savedPlaylistsTab)

      await waitFor(() => {
        expect(screen.getByText('No playlists found')).toBeInTheDocument()
      })
    })
  })

  describe('Page Structure', () => {
    it('renders main container', async () => {
      const { container } = render(<LibraryView />)

      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument()
      })
    })

    it('has description text', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Your listening history and saved playlists')).toBeInTheDocument()
      })
    })
  })

  describe('Tab Buttons', () => {
    it('Recent History tab is clickable', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        const tab = screen.getByRole('button', { name: 'Recent History' })
        expect(tab).not.toBeDisabled()
      })
    })

    it('Saved Playlists tab is clickable', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        const tab = screen.getByRole('button', { name: 'Saved Playlists' })
        expect(tab).not.toBeDisabled()
      })
    })
  })
})
