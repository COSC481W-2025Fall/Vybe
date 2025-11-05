import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { axe } from 'jest-axe'
import LibraryView from '@/components/LibraryView'
import {
  testAccessibility,
  createMockUser,
  createMockRecentlyPlayed,
  testData
} from '@/test/test-utils'

// Mock Supabase client
const mockSupabaseUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg'
  },
  identities: []
}

const mockSupabaseBrowser = vi.fn(() => ({
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
          data: { last_used_provider: null },
          error: null
        })
      }))
    }))
  }))
}))

vi.mock('@/lib/supabase/client', () => ({
  supabaseBrowser: mockSupabaseBrowser
}))

// Mock fetch for API calls
global.fetch = vi.fn()

describe('LibraryView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset window.location
    Object.defineProperty(window, 'location', {
      value: { search: '' },
      writable: true,
      configurable: true
    })
    
    // Reset Supabase user
    mockSupabaseUser.identities = []
    mockSupabaseBrowser.mockReturnValue({
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
              data: { last_used_provider: null },
              error: null
            })
          }))
        }))
      }))
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ==================== HELPER FUNCTIONS ====================
  
  function setupSpotifyProvider() {
    Object.defineProperty(window, 'location', {
      value: { search: '?from=spotify' },
      writable: true,
      configurable: true
    })
    
    mockSupabaseUser.identities = [
      { provider: 'spotify' }
    ]
    
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/spotify/me')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            display_name: 'Spotify User',
            images: [{ url: 'https://example.com/spotify-avatar.jpg' }],
            email: 'spotify@example.com'
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
                  name: 'Test Song 1',
                  artists: [{ name: 'Artist 1' }],
                  album: {
                    name: 'Album 1',
                    images: [
                      { url: 'https://example.com/cover-large.jpg', height: 640 },
                      { url: 'https://example.com/cover-medium.jpg', height: 300 },
                      { url: 'https://example.com/cover-small.jpg', height: 64 }
                    ]
                  }
                },
                played_at: new Date(Date.now() - 5 * 60000).toISOString() // 5 mins ago
              }
            ],
            next: 'https://api.spotify.com/v1/me/player/recently-played?before=xyz'
          })
        })
      }
      
      if (url.includes('/api/spotify/me/playlists')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: [
              {
                id: 'playlist1',
                name: 'My Spotify Playlist',
                description: 'A test playlist',
                images: [{ url: 'https://example.com/playlist-cover.jpg' }],
                tracks: { total: 10 },
                owner: { display_name: 'Spotify User' },
                public: true
              }
            ]
          })
        })
      }
      
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('Not found') })
    })
  }

  function setupGoogleProvider() {
    Object.defineProperty(window, 'location', {
      value: { search: '?from=google' },
      writable: true,
      configurable: true
    })
    
    mockSupabaseUser.identities = [
      { provider: 'google' }
    ]
    
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/youtube/youtube/v3/playlists')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: [
              {
                id: 'youtube-playlist1',
                snippet: {
                  title: 'My YouTube Playlist',
                  description: 'A test YouTube playlist',
                  thumbnails: {
                    high: { url: 'https://example.com/youtube-playlist-cover.jpg' },
                    medium: { url: 'https://example.com/youtube-playlist-cover-medium.jpg' },
                    default: { url: 'https://example.com/youtube-playlist-cover-default.jpg' }
                  },
                  channelTitle: 'YouTube User',
                  privacyStatus: 'public'
                },
                contentDetails: {
                  itemCount: 15
                }
              }
            ]
          })
        })
      }
      
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('Not found') })
    })
  }

  function setupBothProviders() {
    Object.defineProperty(window, 'location', {
      value: { search: '' },
      writable: true,
      configurable: true
    })
    
    mockSupabaseUser.identities = [
      { provider: 'spotify' },
      { provider: 'google' }
    ]
    
    mockSupabaseBrowser.mockReturnValue({
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
              data: { last_used_provider: 'spotify' }, // Default preference
              error: null
            })
          }))
        }))
      }))
    })
    
    setupSpotifyProvider()
  }

  function setupNoProvider() {
    Object.defineProperty(window, 'location', {
      value: { search: '' },
      writable: true,
      configurable: true
    })
    
    mockSupabaseUser.identities = []
    
    mockSupabaseBrowser.mockReturnValue({
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
              data: null,
              error: null
            })
          }))
        }))
      }))
    })
  }

  // ==================== BASIC RENDERING TESTS ====================
  
  describe('Basic Rendering', () => {
    it('renders the library header', async () => {
      setupSpotifyProvider()
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Your Library')).toBeInTheDocument()
        expect(screen.getByText('Your listening history and saved playlists')).toBeInTheDocument()
      })
    })

    it('renders both tab buttons', async () => {
      setupSpotifyProvider()
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: 'Recent History' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Saved Playlists' })).toBeInTheDocument()
    })

    it('shows loading state initially', async () => {
      setupSpotifyProvider()
      
      // Mock slow API response
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/spotify/me')) {
          return new Promise(resolve =>
            setTimeout(() => resolve({
              ok: true,
              json: () => Promise.resolve({
                display_name: 'Test User',
                images: [{ url: 'https://example.com/avatar.jpg' }]
              })
            }), 100)
          )
        }
        return Promise.resolve({ ok: false, status: 404 })
      })

      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText(/Connecting to/)).toBeInTheDocument()
      })
    })
  })

  // ==================== VIEW MODE TESTS ====================
  
  describe('View Modes', () => {
    describe('Recent History View', () => {
      it('displays recent history by default', async () => {
        setupSpotifyProvider()
        
        global.fetch.mockImplementation((url) => {
          if (url.includes('/api/spotify/me')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                display_name: 'Test User',
                images: []
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
                      name: 'Song 1',
                      artists: [{ name: 'Artist 1' }],
                      album: {
                        name: 'Album 1',
                        images: [{ url: 'https://example.com/cover.jpg' }]
                      }
                    },
                    played_at: new Date().toISOString()
                  }
                ],
                next: null
              })
            })
          }
          
          return Promise.resolve({ ok: false, status: 404 })
        })

        render(<LibraryView />)

        await waitFor(() => {
          expect(screen.getByText('Recent Listening History')).toBeInTheDocument()
        })

        await waitFor(() => {
          expect(screen.getByText('Song 1')).toBeInTheDocument()
          expect(screen.getByText('Artist 1')).toBeInTheDocument()
          expect(screen.getByText('Album 1')).toBeInTheDocument()
        })
      })

      it('shows empty state when no recent plays exist', async () => {
        setupSpotifyProvider()
        
        global.fetch.mockImplementation((url) => {
          if (url.includes('/api/spotify/me')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                display_name: 'Test User',
                images: []
              })
            })
          }
          
          if (url.includes('/api/spotify/me/player/recently-played')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                items: [],
                next: null
              })
            })
          }
          
          return Promise.resolve({ ok: false, status: 404 })
        })

        render(<LibraryView />)

        await waitFor(() => {
          expect(screen.getByText('No recent plays yet')).toBeInTheDocument()
        })
      })

      it('shows Google-specific message when logged in with Google', async () => {
        setupGoogleProvider()
        render(<LibraryView />)

        await waitFor(() => {
          expect(screen.getByText(/YouTube doesn't provide access to your watch history/)).toBeInTheDocument()
        })
      })

      it('displays load more button when hasMore is true', async () => {
        setupSpotifyProvider()
        
        global.fetch.mockImplementation((url) => {
          if (url.includes('/api/spotify/me')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                display_name: 'Test User',
                images: []
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
                      name: 'Song 1',
                      artists: [{ name: 'Artist 1' }],
                      album: {
                        name: 'Album 1',
                        images: [{ url: 'https://example.com/cover.jpg' }]
                      }
                    },
                    played_at: new Date().toISOString()
                  }
                ],
                next: 'https://api.spotify.com/v1/me/player/recently-played?before=xyz'
              })
            })
          }
          
          return Promise.resolve({ ok: false, status: 404 })
        })

        render(<LibraryView />)

        await waitFor(() => {
          expect(screen.getByText('Load more history')).toBeInTheDocument()
        })
      })

      it('loads more history when load more button is clicked', async () => {
        setupSpotifyProvider()
        
        const firstPage = [
          {
            track: {
              id: 'track1',
              name: 'Song 1',
              artists: [{ name: 'Artist 1' }],
              album: {
                name: 'Album 1',
                images: [{ url: 'https://example.com/cover.jpg' }]
              }
            },
            played_at: new Date(Date.now() - 60000).toISOString()
          }
        ]

        global.fetch.mockImplementation((url) => {
          if (url.includes('/api/spotify/me')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                display_name: 'Test User',
                images: []
              })
            })
          }
          
          if (url.includes('/api/spotify/me/player/recently-played')) {
            const hasBefore = url.includes('before=')
            
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                items: hasBefore ? [
                  {
                    track: {
                      id: 'track2',
                      name: 'Song 2',
                      artists: [{ name: 'Artist 2' }],
                      album: {
                        name: 'Album 2',
                        images: [{ url: 'https://example.com/cover2.jpg' }]
                      }
                    },
                    played_at: new Date(Date.now() - 120000).toISOString()
                  }
                ] : firstPage,
                next: hasBefore ? null : 'https://api.spotify.com/v1/me/player/recently-played?before=xyz'
              })
            })
          }
          
          return Promise.resolve({ ok: false, status: 404 })
        })

        render(<LibraryView />)

        await waitFor(() => {
          expect(screen.getByText('Song 1')).toBeInTheDocument()
        })

        const loadMoreButton = screen.getByRole('button', { name: 'Load more history' })
        await userEvent.click(loadMoreButton)

        await waitFor(() => {
          expect(screen.getByText('Song 2')).toBeInTheDocument()
        })
      })

      it('shows loading state when loading more', async () => {
        setupSpotifyProvider()
        
        global.fetch.mockImplementation((url) => {
          if (url.includes('/api/spotify/me')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                display_name: 'Test User',
                images: []
              })
            })
          }
          
          if (url.includes('/api/spotify/me/player/recently-played')) {
            const hasBefore = url.includes('before=')
            
            if (hasBefore) {
              return new Promise(resolve =>
                setTimeout(() => resolve({
                  ok: true,
                  json: () => Promise.resolve({
                    items: [
                      {
                        track: {
                          id: 'track2',
                          name: 'Song 2',
                          artists: [{ name: 'Artist 2' }],
                          album: {
                            name: 'Album 2',
                            images: [{ url: 'https://example.com/cover2.jpg' }]
                          }
                        },
                        played_at: new Date().toISOString()
                      }
                    ],
                    next: null
                  })
                }), 100)
              )
            }
            
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                items: [
                  {
                    track: {
                      id: 'track1',
                      name: 'Song 1',
                      artists: [{ name: 'Artist 1' }],
                      album: {
                        name: 'Album 1',
                        images: [{ url: 'https://example.com/cover.jpg' }]
                      }
                    },
                    played_at: new Date().toISOString()
                  }
                ],
                next: 'https://api.spotify.com/v1/me/player/recently-played?before=xyz'
              })
            })
          }
          
          return Promise.resolve({ ok: false, status: 404 })
        })

        render(<LibraryView />)

        await waitFor(() => {
          expect(screen.getByText('Song 1')).toBeInTheDocument()
        })

        const loadMoreButton = screen.getByRole('button', { name: 'Load more history' })
        await userEvent.click(loadMoreButton)

        await waitFor(() => {
          expect(screen.getByText('Loading…')).toBeInTheDocument()
        })
      })
    })

    describe('Saved Playlists View', () => {
      it('switches to saved playlists tab when clicked', async () => {
        setupSpotifyProvider()
        render(<LibraryView />)

        await waitFor(() => {
          expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
        })

        const savedPlaylistsTab = screen.getByRole('button', { name: 'Saved Playlists' })
        await userEvent.click(savedPlaylistsTab)

        await waitFor(() => {
          expect(screen.getByText('Your Playlists')).toBeInTheDocument()
          expect(savedPlaylistsTab).toHaveClass('bg-white', 'text-black')
        })
      })

      it('displays Spotify playlists when provider is Spotify', async () => {
        setupSpotifyProvider()
        render(<LibraryView />)

        await waitFor(() => {
          expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
        })

        const savedPlaylistsTab = screen.getByRole('button', { name: 'Saved Playlists' })
        await userEvent.click(savedPlaylistsTab)

        await waitFor(() => {
          expect(screen.getByText('Your Playlists')).toBeInTheDocument()
          expect(screen.getByText('My Spotify Playlist')).toBeInTheDocument()
          expect(screen.getByText('A test playlist')).toBeInTheDocument()
          expect(screen.getByText('10 tracks • by Spotify User')).toBeInTheDocument()
        })
      })

      it('displays YouTube playlists when provider is Google', async () => {
        setupGoogleProvider()
        render(<LibraryView />)

        await waitFor(() => {
          expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
        })

        const savedPlaylistsTab = screen.getByRole('button', { name: 'Saved Playlists' })
        await userEvent.click(savedPlaylistsTab)

        await waitFor(() => {
          expect(screen.getByText('Your Playlists')).toBeInTheDocument()
          expect(screen.getByText('My YouTube Playlist')).toBeInTheDocument()
          expect(screen.getByText('A test YouTube playlist')).toBeInTheDocument()
          expect(screen.getByText('15 tracks • by YouTube User')).toBeInTheDocument()
        })
      })

      it('shows empty state when no playlists exist', async () => {
        setupSpotifyProvider()
        
        global.fetch.mockImplementation((url) => {
          if (url.includes('/api/spotify/me')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                display_name: 'Test User',
                images: []
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
          
          return Promise.resolve({ ok: false, status: 404 })
        })

        render(<LibraryView />)

        await waitFor(() => {
          expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
        })

        const savedPlaylistsTab = screen.getByRole('button', { name: 'Saved Playlists' })
        await userEvent.click(savedPlaylistsTab)

        await waitFor(() => {
          expect(screen.getByText('No playlists found')).toBeInTheDocument()
        })
      })

      it('shows loading state when loading playlists', async () => {
        setupSpotifyProvider()
        
        global.fetch.mockImplementation((url) => {
          if (url.includes('/api/spotify/me')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                display_name: 'Test User',
                images: []
              })
            })
          }
          
          if (url.includes('/api/spotify/me/playlists')) {
            return new Promise(resolve =>
              setTimeout(() => resolve({
                ok: true,
                json: () => Promise.resolve({
                  items: [
                    {
                      id: 'playlist1',
                      name: 'Test Playlist',
                      description: 'Test',
                      images: [],
                      tracks: { total: 0 },
                      owner: { display_name: 'User' },
                      public: false
                    }
                  ]
                })
              }), 100)
            )
          }
          
          return Promise.resolve({ ok: false, status: 404 })
        })

        render(<LibraryView />)

        await waitFor(() => {
          expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
        })

        const savedPlaylistsTab = screen.getByRole('button', { name: 'Saved Playlists' })
        await userEvent.click(savedPlaylistsTab)

        await waitFor(() => {
          expect(screen.getByText(/Loading your playlists/)).toBeInTheDocument()
        })
      })

      it('only loads playlists once when tab is clicked', async () => {
        setupSpotifyProvider()
        
        let playlistCallCount = 0
        
        global.fetch.mockImplementation((url) => {
          if (url.includes('/api/spotify/me')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                display_name: 'Test User',
                images: []
              })
            })
          }
          
          if (url.includes('/api/spotify/me/playlists')) {
            playlistCallCount++
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                items: [
                  {
                    id: 'playlist1',
                    name: 'Test Playlist',
                    description: 'Test',
                    images: [],
                    tracks: { total: 0 },
                    owner: { display_name: 'User' },
                    public: false
                  }
                ]
              })
            })
          }
          
          return Promise.resolve({ ok: false, status: 404 })
        })

        render(<LibraryView />)

        await waitFor(() => {
          expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
        })

        const savedPlaylistsTab = screen.getByRole('button', { name: 'Saved Playlists' })
        
        // Click multiple times
        await userEvent.click(savedPlaylistsTab)
        await userEvent.click(savedPlaylistsTab)
        await userEvent.click(savedPlaylistsTab)

        await waitFor(() => {
          expect(screen.getByText('Test Playlist')).toBeInTheDocument()
        })

        // Should only load once since playlists.length > 0 after first load
        expect(playlistCallCount).toBe(1)
      })
    })
  })

  // ==================== PROVIDER TESTS ====================
  
  describe('Provider Detection', () => {
    it('uses URL parameter when present (highest priority)', async () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?from=google' },
        writable: true,
        configurable: true
      })
      
      mockSupabaseUser.identities = [
        { provider: 'spotify' },
        { provider: 'google' }
      ]
      
      mockSupabaseBrowser.mockReturnValue({
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
      })
      
      setupGoogleProvider()
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
      })

      const savedPlaylistsTab = screen.getByRole('button', { name: 'Saved Playlists' })
      await userEvent.click(savedPlaylistsTab)

      await waitFor(() => {
        expect(screen.getByText('My YouTube Playlist')).toBeInTheDocument()
      })
    })

    it('uses database preference when URL parameter is absent', async () => {
      Object.defineProperty(window, 'location', {
        value: { search: '' },
        writable: true,
        configurable: true
      })
      
      mockSupabaseUser.identities = [
        { provider: 'spotify' },
        { provider: 'google' }
      ]
      
      mockSupabaseBrowser.mockReturnValue({
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
                data: { last_used_provider: 'google' },
                error: null
              })
            }))
          }))
        }))
      })
      
      setupGoogleProvider()
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
      })

      const savedPlaylistsTab = screen.getByRole('button', { name: 'Saved Playlists' })
      await userEvent.click(savedPlaylistsTab)

      await waitFor(() => {
        expect(screen.getByText('My YouTube Playlist')).toBeInTheDocument()
      })
    })

    it('defaults to Spotify when both providers are linked and no preference exists', async () => {
      Object.defineProperty(window, 'location', {
        value: { search: '' },
        writable: true,
        configurable: true
      })
      
      mockSupabaseUser.identities = [
        { provider: 'spotify' },
        { provider: 'google' }
      ]
      
      mockSupabaseBrowser.mockReturnValue({
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
                data: null,
                error: null
              })
            }))
          }))
        }))
      })
      
      setupSpotifyProvider()
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
      })
    })

    it('uses only linked provider when only one is linked', async () => {
      Object.defineProperty(window, 'location', {
        value: { search: '' },
        writable: true,
        configurable: true
      })
      
      mockSupabaseUser.identities = [
        { provider: 'google' }
      ]
      
      mockSupabaseBrowser.mockReturnValue({
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
                data: null,
                error: null
              })
            }))
          }))
        }))
      })
      
      setupGoogleProvider()
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
      })

      const savedPlaylistsTab = screen.getByRole('button', { name: 'Saved Playlists' })
      await userEvent.click(savedPlaylistsTab)

      await waitFor(() => {
        expect(screen.getByText('My YouTube Playlist')).toBeInTheDocument()
      })
    })

    it('shows connect account message when no provider is linked', async () => {
      setupNoProvider()
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('No Music Account Connected')).toBeInTheDocument()
        expect(screen.getByText(/Connect your Spotify or YouTube account/)).toBeInTheDocument()
        const settingsLink = screen.getByRole('link', { name: /Go to Settings/i })
        expect(settingsLink).toHaveAttribute('href', '/settings')
      })
    })

    it('displays user info correctly for Spotify provider', async () => {
      setupSpotifyProvider()
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
        expect(screen.getByText('Spotify User')).toBeInTheDocument()
        expect(screen.getByText('(Spotify)')).toBeInTheDocument()
        expect(screen.getByAltText('Spotify avatar')).toBeInTheDocument()
      })
    })

    it('displays user info correctly for Google provider', async () => {
      setupGoogleProvider()
      
      mockSupabaseUser.user_metadata = {
        full_name: 'Google User',
        avatar_url: 'https://example.com/google-avatar.jpg'
      }
      
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
        expect(screen.getByText('Google User')).toBeInTheDocument()
        expect(screen.getByText('(Google)')).toBeInTheDocument()
      })
    })

    it('handles missing user metadata gracefully', async () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?from=google' },
        writable: true,
        configurable: true
      })
      
      mockSupabaseUser.identities = [{ provider: 'google' }]
      mockSupabaseUser.user_metadata = {}
      mockSupabaseUser.email = 'user@example.com'
      
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
      })
    })
  })

  // ==================== ERROR HANDLING TESTS ====================
  
  describe('Error Handling', () => {
    it('displays error when user profile fetch fails', async () => {
      setupSpotifyProvider()
      
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/spotify/me')) {
          return Promise.resolve({
            ok: false,
            status: 401,
            text: () => Promise.resolve('Unauthorized')
          })
        }
        return Promise.resolve({ ok: false, status: 404 })
      })

      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText(/HTTP 401/)).toBeInTheDocument()
      })
    })

    it('displays error when recent history fetch fails', async () => {
      setupSpotifyProvider()
      
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/spotify/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              display_name: 'Test User',
              images: []
            })
          })
        }
        
        if (url.includes('/api/spotify/me/player/recently-played')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            text: () => Promise.resolve('Internal Server Error')
          })
        }
        
        return Promise.resolve({ ok: false, status: 404 })
      })

      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText(/HTTP 500/)).toBeInTheDocument()
      })
    })

    it('displays error when playlists fetch fails', async () => {
      setupSpotifyProvider()
      
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/spotify/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              display_name: 'Test User',
              images: []
            })
          })
        }
        
        if (url.includes('/api/spotify/me/playlists')) {
          return Promise.resolve({
            ok: false,
            status: 403,
            text: () => Promise.resolve('Forbidden')
          })
        }
        
        return Promise.resolve({ ok: false, status: 404 })
      })

      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
      })

      const savedPlaylistsTab = screen.getByRole('button', { name: 'Saved Playlists' })
      await userEvent.click(savedPlaylistsTab)

      await waitFor(() => {
        expect(screen.getByText(/HTTP 403/)).toBeInTheDocument()
      })
    })

    it('handles network errors gracefully', async () => {
      setupSpotifyProvider()
      
      global.fetch.mockImplementation(() => {
        return Promise.reject(new Error('Network error'))
      })

      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument()
      })
    })

    it('handles malformed API responses gracefully', async () => {
      setupSpotifyProvider()
      
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/spotify/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              display_name: 'Test User',
              images: []
            })
          })
        }
        
        if (url.includes('/api/spotify/me/player/recently-played')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.reject(new Error('Invalid JSON'))
          })
        }
        
        return Promise.resolve({ ok: false, status: 404 })
      })

      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText(/Invalid JSON/)).toBeInTheDocument()
      })
    })
  })

  // ==================== EDGE CASES ====================
  
  describe('Edge Cases', () => {
    it('handles missing track data gracefully', async () => {
      setupSpotifyProvider()
      
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/spotify/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              display_name: 'Test User',
              images: []
            })
          })
        }
        
        if (url.includes('/api/spotify/me/player/recently-played')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              items: [
                {
                  track: null,
                  played_at: new Date().toISOString()
                },
                {
                  track: {
                    id: null,
                    name: null,
                    artists: null,
                    album: null
                  },
                  played_at: new Date().toISOString()
                }
              ],
              next: null
            })
          })
        }
        
        return Promise.resolve({ ok: false, status: 404 })
      })

      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Recent Listening History')).toBeInTheDocument()
      })
    })

    it('handles missing album images gracefully', async () => {
      setupSpotifyProvider()
      
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/spotify/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              display_name: 'Test User',
              images: []
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
                    name: 'Song 1',
                    artists: [{ name: 'Artist 1' }],
                    album: {
                      name: 'Album 1',
                      images: []
                    }
                  },
                  played_at: new Date().toISOString()
                }
              ],
              next: null
            })
          })
        }
        
        return Promise.resolve({ ok: false, status: 404 })
      })

      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Song 1')).toBeInTheDocument()
      })
    })

    it('handles playlist without cover image', async () => {
      setupSpotifyProvider()
      
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/spotify/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              display_name: 'Test User',
              images: []
            })
          })
        }
        
        if (url.includes('/api/spotify/me/playlists')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              items: [
                {
                  id: 'playlist1',
                  name: 'Test Playlist',
                  description: 'Test',
                  images: [],
                  tracks: { total: 5 },
                  owner: { display_name: 'User' },
                  public: false
                }
              ]
            })
          })
        }
        
        return Promise.resolve({ ok: false, status: 404 })
      })

      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
      })

      const savedPlaylistsTab = screen.getByRole('button', { name: 'Saved Playlists' })
      await userEvent.click(savedPlaylistsTab)

      await waitFor(() => {
        expect(screen.getByText('Test Playlist')).toBeInTheDocument()
      })
    })

    it('handles YouTube playlist with different thumbnail sizes', async () => {
      setupGoogleProvider()
      
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/youtube/youtube/v3/playlists')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              items: [
                {
                  id: 'youtube-playlist1',
                  snippet: {
                    title: 'YouTube Playlist',
                    description: 'Test',
                    thumbnails: {
                      default: { url: 'https://example.com/default.jpg' }
                      // Missing high and medium
                    },
                    channelTitle: 'User',
                    privacyStatus: 'private'
                  },
                  contentDetails: {
                    itemCount: 10
                  }
                }
              ]
            })
          })
        }
        
        return Promise.resolve({ ok: false, status: 404 })
      })

      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
      })

      const savedPlaylistsTab = screen.getByRole('button', { name: 'Saved Playlists' })
      await userEvent.click(savedPlaylistsTab)

      await waitFor(() => {
        expect(screen.getByText('YouTube Playlist')).toBeInTheDocument()
      })
    })

    it('handles empty items array from API', async () => {
      setupSpotifyProvider()
      
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/spotify/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              display_name: 'Test User',
              images: []
            })
          })
        }
        
        if (url.includes('/api/spotify/me/player/recently-played')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              items: [],
              next: null
            })
          })
        }
        
        return Promise.resolve({ ok: false, status: 404 })
      })

      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('No recent plays yet')).toBeInTheDocument()
      })
    })

    it('handles missing next cursor for pagination', async () => {
      setupSpotifyProvider()
      
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/spotify/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              display_name: 'Test User',
              images: []
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
                    name: 'Song 1',
                    artists: [{ name: 'Artist 1' }],
                    album: {
                      name: 'Album 1',
                      images: [{ url: 'https://example.com/cover.jpg' }]
                    }
                  },
                  played_at: new Date().toISOString()
                }
              ]
              // Missing next property
            })
          })
        }
        
        return Promise.resolve({ ok: false, status: 404 })
      })

      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Song 1')).toBeInTheDocument()
      })

      // Should not show load more button
      expect(screen.queryByRole('button', { name: 'Load more history' })).not.toBeInTheDocument()
    })

    it('handles large number of playlists', async () => {
      setupSpotifyProvider()
      
      const manyPlaylists = Array.from({ length: 50 }, (_, i) => ({
        id: `playlist${i}`,
        name: `Playlist ${i + 1}`,
        description: `Description ${i + 1}`,
        images: [{ url: `https://example.com/cover${i}.jpg` }],
        tracks: { total: i * 10 },
        owner: { display_name: 'User' },
        public: i % 2 === 0
      }))
      
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/spotify/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              display_name: 'Test User',
              images: []
            })
          })
        }
        
        if (url.includes('/api/spotify/me/playlists')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              items: manyPlaylists
            })
          })
        }
        
        return Promise.resolve({ ok: false, status: 404 })
      })

      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
      })

      const savedPlaylistsTab = screen.getByRole('button', { name: 'Saved Playlists' })
      await userEvent.click(savedPlaylistsTab)

      await waitFor(() => {
        expect(screen.getByText('Playlist 1')).toBeInTheDocument()
        expect(screen.getByText('Playlist 50')).toBeInTheDocument()
      })
    })
  })

  // ==================== DATA MAPPING TESTS ====================
  
  describe('Data Mapping', () => {
    it('correctly maps Spotify track data', async () => {
      setupSpotifyProvider()
      
      const testTrack = {
        track: {
          id: 'track-id-123',
          name: 'Track Name',
          artists: [
            { name: 'Artist 1' },
            { name: 'Artist 2' }
          ],
          album: {
            name: 'Album Name',
            images: [
              { url: 'https://example.com/large.jpg', height: 640 },
              { url: 'https://example.com/medium.jpg', height: 300 },
              { url: 'https://example.com/small.jpg', height: 64 }
            ]
          }
        },
        played_at: '2024-01-01T12:00:00Z'
      }
      
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/spotify/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              display_name: 'Test User',
              images: []
            })
          })
        }
        
        if (url.includes('/api/spotify/me/player/recently-played')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              items: [testTrack],
              next: null
            })
          })
        }
        
        return Promise.resolve({ ok: false, status: 404 })
      })

      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Track Name')).toBeInTheDocument()
        expect(screen.getByText('Artist 1, Artist 2')).toBeInTheDocument()
        expect(screen.getByText('Album Name')).toBeInTheDocument()
      })
    })

    it('correctly maps Spotify playlist data', async () => {
      setupSpotifyProvider()
      
      const testPlaylist = {
        id: 'playlist-id-123',
        name: 'Playlist Name',
        description: 'Playlist Description',
        images: [{ url: 'https://example.com/playlist.jpg' }],
        tracks: { total: 25 },
        owner: { display_name: 'Owner Name' },
        public: true
      }
      
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/spotify/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              display_name: 'Test User',
              images: []
            })
          })
        }
        
        if (url.includes('/api/spotify/me/playlists')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              items: [testPlaylist]
            })
          })
        }
        
        return Promise.resolve({ ok: false, status: 404 })
      })

      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
      })

      const savedPlaylistsTab = screen.getByRole('button', { name: 'Saved Playlists' })
      await userEvent.click(savedPlaylistsTab)

      await waitFor(() => {
        expect(screen.getByText('Playlist Name')).toBeInTheDocument()
        expect(screen.getByText('Playlist Description')).toBeInTheDocument()
        expect(screen.getByText('25 tracks • by Owner Name')).toBeInTheDocument()
        expect(screen.getByText('Public')).toBeInTheDocument()
      })
    })

    it('correctly maps YouTube playlist data', async () => {
      setupGoogleProvider()
      
      const testPlaylist = {
        id: 'youtube-playlist-id-123',
        snippet: {
          title: 'YouTube Playlist',
          description: 'YouTube Description',
          thumbnails: {
            high: { url: 'https://example.com/youtube-high.jpg' }
          },
          channelTitle: 'Channel Name',
          privacyStatus: 'public'
        },
        contentDetails: {
          itemCount: 30
        }
      }
      
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/youtube/youtube/v3/playlists')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              items: [testPlaylist]
            })
          })
        }
        
        return Promise.resolve({ ok: false, status: 404 })
      })

      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
      })

      const savedPlaylistsTab = screen.getByRole('button', { name: 'Saved Playlists' })
      await userEvent.click(savedPlaylistsTab)

      await waitFor(() => {
        expect(screen.getByText('YouTube Playlist')).toBeInTheDocument()
        expect(screen.getByText('YouTube Description')).toBeInTheDocument()
        expect(screen.getByText('30 tracks • by Channel Name')).toBeInTheDocument()
        expect(screen.getByText('Public')).toBeInTheDocument()
      })
    })

    it('handles missing optional fields in mapping', async () => {
      setupSpotifyProvider()
      
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/spotify/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              display_name: 'Test User',
              images: []
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
                    name: 'Song',
                    artists: [],
                    album: {
                      name: '',
                      images: []
                    }
                  },
                  played_at: new Date().toISOString()
                }
              ],
              next: null
            })
          })
        }
        
        return Promise.resolve({ ok: false, status: 404 })
      })

      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Song')).toBeInTheDocument()
      })
    })
  })

  // ==================== TIME AGO TESTS ====================
  
  describe('Time Display', () => {
    it('displays correct time ago for recent plays', async () => {
      setupSpotifyProvider()
      
      const now = Date.now()
      const fiveMinutesAgo = new Date(now - 5 * 60000).toISOString()
      const oneHourAgo = new Date(now - 60 * 60000).toISOString()
      const oneDayAgo = new Date(now - 24 * 60 * 60000).toISOString()
      
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/spotify/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              display_name: 'Test User',
              images: []
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
                    name: 'Song 1',
                    artists: [{ name: 'Artist 1' }],
                    album: {
                      name: 'Album 1',
                      images: [{ url: 'https://example.com/cover.jpg' }]
                    }
                  },
                  played_at: fiveMinutesAgo
                },
                {
                  track: {
                    id: 'track2',
                    name: 'Song 2',
                    artists: [{ name: 'Artist 2' }],
                    album: {
                      name: 'Album 2',
                      images: [{ url: 'https://example.com/cover2.jpg' }]
                    }
                  },
                  played_at: oneHourAgo
                },
                {
                  track: {
                    id: 'track3',
                    name: 'Song 3',
                    artists: [{ name: 'Artist 3' }],
                    album: {
                      name: 'Album 3',
                      images: [{ url: 'https://example.com/cover3.jpg' }]
                    }
                  },
                  played_at: oneDayAgo
                }
              ],
              next: null
            })
          })
        }
        
        return Promise.resolve({ ok: false, status: 404 })
      })

      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText(/5 mins ago/)).toBeInTheDocument()
        expect(screen.getByText(/1 hour ago/)).toBeInTheDocument()
        expect(screen.getByText(/1 day ago/)).toBeInTheDocument()
      })
    })
  })

  // ==================== ACCESSIBILITY TESTS ====================
  
  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      setupSpotifyProvider()
      const { container } = render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
      })

      await testAccessibility(container)
    })

    it('has proper heading structure', async () => {
      setupSpotifyProvider()
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
      })

      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toHaveTextContent('Your Library')
    })

    it('has proper button roles for tab navigation', async () => {
      setupSpotifyProvider()
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
      })

      const recentTab = screen.getByRole('button', { name: 'Recent History' })
      const playlistsTab = screen.getByRole('button', { name: 'Saved Playlists' })

      expect(recentTab).toBeInTheDocument()
      expect(playlistsTab).toBeInTheDocument()
    })

    it('has proper alt text for images', async () => {
      setupSpotifyProvider()
      render(<LibraryView />)

      await waitFor(() => {
        const avatarImage = screen.getByAltText('Spotify avatar')
        expect(avatarImage).toBeInTheDocument()
      })
    })

    it('has proper alt text for track cover images', async () => {
      setupSpotifyProvider()
      
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/spotify/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              display_name: 'Test User',
              images: []
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
                  played_at: new Date().toISOString()
                }
              ],
              next: null
            })
          })
        }
        
        return Promise.resolve({ ok: false, status: 404 })
      })

      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByAltText('Test Song cover')).toBeInTheDocument()
      })
    })

    it('has proper alt text for playlist cover images', async () => {
      setupSpotifyProvider()
      
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/spotify/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              display_name: 'Test User',
              images: []
            })
          })
        }
        
        if (url.includes('/api/spotify/me/playlists')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              items: [
                {
                  id: 'playlist1',
                  name: 'Test Playlist',
                  description: 'Test',
                  images: [{ url: 'https://example.com/playlist-cover.jpg' }],
                  tracks: { total: 0 },
                  owner: { display_name: 'User' },
                  public: false
                }
              ]
            })
          })
        }
        
        return Promise.resolve({ ok: false, status: 404 })
      })

      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
      })

      const savedPlaylistsTab = screen.getByRole('button', { name: 'Saved Playlists' })
      await userEvent.click(savedPlaylistsTab)

      await waitFor(() => {
        expect(screen.getByAltText('Test Playlist cover')).toBeInTheDocument()
      })
    })

    it('supports keyboard navigation for tabs', async () => {
      setupSpotifyProvider()
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
      })

      const recentTab = screen.getByRole('button', { name: 'Recent History' })
      const playlistsTab = screen.getByRole('button', { name: 'Saved Playlists' })

      // Tab should be focusable
      recentTab.focus()
      expect(document.activeElement).toBe(recentTab)

      // Enter key should activate tab
      await userEvent.keyboard('{Enter}')
      expect(recentTab).toHaveClass('bg-white', 'text-black')
    })
  })

  // ==================== INTEGRATION TESTS ====================
  
  describe('Integration Scenarios', () => {
    it('handles full workflow: load Spotify data, switch tabs, load playlists', async () => {
      setupSpotifyProvider()
      render(<LibraryView />)

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
      })

      // Verify recent history is shown
      await waitFor(() => {
        expect(screen.getByText('Recent Listening History')).toBeInTheDocument()
      })

      // Switch to playlists tab
      const savedPlaylistsTab = screen.getByRole('button', { name: 'Saved Playlists' })
      await userEvent.click(savedPlaylistsTab)

      // Verify playlists are loaded
      await waitFor(() => {
        expect(screen.getByText('Your Playlists')).toBeInTheDocument()
        expect(screen.getByText('My Spotify Playlist')).toBeInTheDocument()
      })

      // Switch back to recent
      const recentTab = screen.getByRole('button', { name: 'Recent History' })
      await userEvent.click(recentTab)

      // Verify recent history is still shown
      await waitFor(() => {
        expect(screen.getByText('Recent Listening History')).toBeInTheDocument()
      })
    })

    it('handles provider switching scenario', async () => {
      // Start with Spotify
      setupSpotifyProvider()
      const { rerender } = render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
      })

      // Switch to Google provider
      setupGoogleProvider()
      rerender(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
      })

      const savedPlaylistsTab = screen.getByRole('button', { name: 'Saved Playlists' })
      await userEvent.click(savedPlaylistsTab)

      await waitFor(() => {
        expect(screen.getByText('My YouTube Playlist')).toBeInTheDocument()
      })
    })
  })
})
