import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../app/api/export-playlist/route';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { getValidAccessToken } from '@/lib/spotify';
import { convertTracksToSpotifyUris } from '@/lib/services/spotifyExport';

// Mock dependencies
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: vi.fn(),
}));

vi.mock('@/lib/spotify', () => ({
  getValidAccessToken: vi.fn(),
}));

vi.mock('@/lib/services/spotifyExport', () => ({
  convertTracksToSpotifyUris: vi.fn(),
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('POST /api/export-playlist', () => {
  let mockSupabase;
  let mockRequest;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock Supabase client
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    };

    createRouteHandlerClient.mockReturnValue(mockSupabase);
    cookies.mockResolvedValue({});

    // Setup mock request
    mockRequest = {
      json: vi.fn(),
    };
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if Spotify is not connected', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      getValidAccessToken.mockRejectedValue({
        code: 'NO_TOKENS',
        message: 'No Spotify tokens found',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Spotify not connected');
    });
  });

  describe('Mode 1: Direct Export', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      getValidAccessToken.mockResolvedValue('mock-access-token');

      // Mock Spotify API responses
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'spotify-user-123' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'playlist-123',
            name: 'Test Playlist',
            description: 'Test Description',
            external_urls: { spotify: 'https://open.spotify.com/playlist/123' },
            uri: 'spotify:playlist:123',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        });
    });

    it('should create playlist with valid track URIs', async () => {
      mockRequest.json.mockResolvedValue({
        name: 'My Playlist',
        description: 'My Description',
        tracks: [
          'spotify:track:4iV5W9uYEdYUVa79Axb7Rh',
          'spotify:track:1301WleyT98MSxVHPZCA6M',
        ],
        isPublic: false,
        isCollaborative: false,
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.playlist.name).toBe('Test Playlist');
      expect(data.playlist.tracks.total).toBe(2);
      expect(data.stats).toBeUndefined();

      // Verify fetch calls
      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        'https://api.spotify.com/v1/me',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-access-token',
          }),
        })
      );
    });

    it('should return 400 if playlist name is missing', async () => {
      mockRequest.json.mockResolvedValue({
        tracks: ['spotify:track:4iV5W9uYEdYUVa79Axb7Rh'],
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Playlist name is required');
    });

    it('should return 400 if tracks array is empty', async () => {
      mockRequest.json.mockResolvedValue({
        name: 'My Playlist',
        tracks: [],
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('At least one track is required');
    });

    it('should return 400 if track URIs have invalid format', async () => {
      mockRequest.json.mockResolvedValue({
        name: 'My Playlist',
        tracks: ['invalid-uri', 'spotify:track:4iV5W9uYEdYUVa79Axb7Rh'],
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid track URIs found');
    });

    it('should handle batch track addition (100+ tracks)', async () => {
      // Create 150 track URIs
      const tracks = Array.from({ length: 150 }, (_, i) => 
        `spotify:track:${'A'.repeat(22)}${i.toString().padStart(2, '0')}`
      );

      mockRequest.json.mockResolvedValue({
        name: 'Large Playlist',
        tracks,
      });

      // Mock additional fetch calls for track batches
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'spotify-user-123' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'playlist-123',
            name: 'Large Playlist',
            description: '',
            external_urls: { spotify: 'https://open.spotify.com/playlist/123' },
            uri: 'spotify:playlist:123',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.playlist.tracks.total).toBe(150);
      // Should have 2 batch calls (100 + 50)
      expect(global.fetch).toHaveBeenCalledTimes(4);
    });
  });

  describe('Mode 2: Export from Database Playlist', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      getValidAccessToken.mockResolvedValue('mock-access-token');

      // Mock Spotify API responses
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'spotify-user-123' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'playlist-123',
            name: 'Database Playlist',
            description: '',
            external_urls: { spotify: 'https://open.spotify.com/playlist/123' },
            uri: 'spotify:playlist:123',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        });
    });

    it('should export playlist from database', async () => {
      const mockPlaylist = {
        id: 'db-playlist-123',
        name: 'Database Playlist',
        platform: 'spotify',
        playlist_songs: [
          {
            id: 'song-1',
            title: 'Song 1',
            artist: 'Artist 1',
            external_id: 'track-id-1',
            position: 1,
            smart_sorted_order: null,
          },
          {
            id: 'song-2',
            title: 'Song 2',
            artist: 'Artist 2',
            external_id: 'track-id-2',
            position: 2,
            smart_sorted_order: null,
          },
        ],
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockPlaylist,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);
      convertTracksToSpotifyUris.mockResolvedValue([
        'spotify:track:4iV5W9uYEdYUVa79Axb7Rh',
        'spotify:track:1301WleyT98MSxVHPZCA6M',
      ]);

      mockRequest.json.mockResolvedValue({
        playlistId: 'db-playlist-123',
        description: 'Custom Description',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.stats).toEqual({
        totalTracks: 2,
        exportedTracks: 2,
        missingTracks: 0,
      });
      expect(mockSupabase.from).toHaveBeenCalledWith('group_playlists');
      expect(convertTracksToSpotifyUris).toHaveBeenCalledWith(
        mockPlaylist.playlist_songs,
        'spotify',
        'mock-access-token'
      );
    });

    it('should return 404 if playlist not found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      mockRequest.json.mockResolvedValue({
        playlistId: 'non-existent-id',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Playlist not found');
    });

    it('should return 400 if playlist has no tracks', async () => {
      const mockPlaylist = {
        id: 'db-playlist-123',
        name: 'Empty Playlist',
        platform: 'spotify',
        playlist_songs: [],
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockPlaylist,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      mockRequest.json.mockResolvedValue({
        playlistId: 'db-playlist-123',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Playlist has no tracks');
    });

    it('should return 400 if no tracks could be found on Spotify', async () => {
      const mockPlaylist = {
        id: 'db-playlist-123',
        name: 'Playlist',
        platform: 'youtube',
        playlist_songs: [
          {
            id: 'song-1',
            title: 'Unknown Song',
            artist: 'Unknown Artist',
            external_id: null,
            position: 1,
            smart_sorted_order: null,
          },
        ],
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockPlaylist,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);
      convertTracksToSpotifyUris.mockResolvedValue([]);

      mockRequest.json.mockResolvedValue({
        playlistId: 'db-playlist-123',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('No tracks could be found on Spotify');
    });

    it('should sort tracks by smart_sorted_order when available', async () => {
      const mockPlaylist = {
        id: 'db-playlist-123',
        name: 'Sorted Playlist',
        platform: 'spotify',
        playlist_songs: [
          {
            id: 'song-1',
            title: 'Song 1',
            artist: 'Artist 1',
            external_id: 'track-id-1',
            position: 2,
            smart_sorted_order: 1,
          },
          {
            id: 'song-2',
            title: 'Song 2',
            artist: 'Artist 2',
            external_id: 'track-id-2',
            position: 1,
            smart_sorted_order: 2,
          },
        ],
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockPlaylist,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);
      convertTracksToSpotifyUris.mockResolvedValue([
        'spotify:track:uri1',
        'spotify:track:uri2',
      ]);

      mockRequest.json.mockResolvedValue({
        playlistId: 'db-playlist-123',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Verify convertTracksToSpotifyUris was called with sorted tracks
      const sortedSongs = [...mockPlaylist.playlist_songs].sort((a, b) => {
        if (a.smart_sorted_order !== null && b.smart_sorted_order !== null) {
          return a.smart_sorted_order - b.smart_sorted_order;
        }
        if (a.smart_sorted_order !== null) return -1;
        if (b.smart_sorted_order !== null) return 1;
        return a.position - b.position;
      });
      expect(convertTracksToSpotifyUris).toHaveBeenCalledWith(
        sortedSongs,
        'spotify',
        'mock-access-token'
      );
    });

    it('should use provided name override when provided', async () => {
      const mockPlaylist = {
        id: 'db-playlist-123',
        name: 'Original Name',
        platform: 'spotify',
        playlist_songs: [
          {
            id: 'song-1',
            title: 'Song 1',
            artist: 'Artist 1',
            external_id: 'track-id-1',
            position: 1,
            smart_sorted_order: null,
          },
        ],
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockPlaylist,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);
      convertTracksToSpotifyUris.mockResolvedValue(['spotify:track:uri1']);

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'spotify-user-123' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'playlist-123',
            name: 'Override Name',
            description: '',
            external_urls: { spotify: 'https://open.spotify.com/playlist/123' },
            uri: 'spotify:playlist:123',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        });

      mockRequest.json.mockResolvedValue({
        playlistId: 'db-playlist-123',
        name: 'Override Name',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Verify the override name was used in the playlist creation
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        'https://api.spotify.com/v1/users/spotify-user-123/playlists',
        expect.objectContaining({
          body: expect.stringContaining('"name":"Override Name"'),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle Spotify API errors when getting user profile', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      getValidAccessToken.mockResolvedValue('mock-access-token');

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      mockRequest.json.mockResolvedValue({
        name: 'Test Playlist',
        tracks: ['spotify:track:4iV5W9uYEdYUVa79Axb7Rh'],
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Failed to get Spotify user profile');
    });

    it('should handle Spotify API errors when creating playlist', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      getValidAccessToken.mockResolvedValue('mock-access-token');

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'spotify-user-123' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: async () => 'Bad Request',
        });

      mockRequest.json.mockResolvedValue({
        name: 'Test Playlist',
        tracks: ['spotify:track:4iV5W9uYEdYUVa79Axb7Rh'],
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Failed to create Spotify playlist');
    });

    it('should handle unexpected errors', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Database error'));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});

