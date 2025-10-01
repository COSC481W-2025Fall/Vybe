// Test helper utilities for better test maintainability
export const testHelpers = {
  // Mock Spotify API responses
  mockSpotifyUser: {
    display_name: 'Test User',
    images: [{ url: 'https://example.com/avatar.jpg' }]
  },

  mockSpotifyRecentTracks: {
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
  },

  // Common test selectors
  selectors: {
    navbar: {
      brand: 'Vybe',
      homeLink: 'Home',
      groupsLink: 'Groups',
      playlistLink: 'Playlist',
      libraryLink: 'Library',
      profileLink: 'Profile'
    },
    library: {
      title: 'Your Library',
      subtitle: 'Your listening history and saved playlists',
      recentTab: 'Recent History',
      savedTab: 'Saved Playlists',
      noPlaylistsMessage: "You don't have any saved playlists yet.",
      noRecentPlaysMessage: 'No recent plays yet.'
    }
  },

  // Test data generators
  generateTimeAgoTestCases: () => [
    { minutes: 1, expected: '1 min ago' },
    { minutes: 5, expected: '5 mins ago' },
    { minutes: 60, expected: '1 hour ago' },
    { minutes: 120, expected: '2 hours ago' },
    { minutes: 1440, expected: '1 day ago' },
    { minutes: 4320, expected: '3 days ago' },
    { minutes: 10080, expected: '1 week ago' },
    { minutes: 20160, expected: '2 weeks ago' }
  ]
}
