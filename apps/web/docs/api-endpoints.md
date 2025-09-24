# API Endpoints Documentation

## Authentication Endpoints

### POST /api/auth/callback
Handles OAuth callback from external providers.
- **Providers**: Spotify, Google/YouTube
- **Response**: Redirects to appropriate page

### POST /api/sign-out
Signs out the current user.
- **Response**: Redirects to home page

## Music Integration Endpoints

### GET /api/spotify/[...path]
Proxies requests to Spotify Web API.
- **Authentication**: Requires Spotify OAuth token
- **Usage**: Fetch user playlists, recently played tracks

### POST /api/youtube/import-history
Imports user's YouTube watch history.
- **Authentication**: Requires Google OAuth token
- **Response**: Import job status

## Group Management Endpoints

### GET /api/groups
Lists groups the user belongs to.
- **Authentication**: Required
- **Response**: Array of group objects

### POST /api/groups
Creates a new collaborative group.
- **Authentication**: Required
- **Body**: `{ name: string, description?: string }`
- **Response**: Created group object

### POST /api/groups/join
Joins a group using a join code.
- **Authentication**: Required
- **Body**: `{ joinCode: string }`
- **Response**: Success/error status

## Playlist Endpoints

### GET /api/playlists
Lists user's playlists.
- **Authentication**: Required
- **Query**: `?group=groupId` (optional)
- **Response**: Array of playlist objects

### POST /api/playlists
Creates a new playlist.
- **Authentication**: Required
- **Body**: `{ name: string, description?: string, groupId?: string }`
- **Response**: Created playlist object

### POST /api/playlists/generate
Generates a collaborative playlist for a group.
- **Authentication**: Required
- **Body**: `{ groupId: string, preferences?: object }`
- **Response**: Generated playlist object

## Play History Endpoints

### GET /api/play-history
Retrieves user's play history.
- **Authentication**: Required
- **Query**: `?limit=50&offset=0`
- **Response**: Array of play history entries

### POST /api/play-history
Records a new play history entry.
- **Authentication**: Required
- **Body**: `{ songId: string, playedAt: string }`
- **Response**: Created entry object
