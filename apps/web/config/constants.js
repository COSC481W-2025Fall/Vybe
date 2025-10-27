// Centralized configuration constants
export const CONFIG = {
  // Base URLs
  BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://yourdomain.com' 
    : 'http://localhost:3000',
  
  // API Configuration
  API_TIMEOUT: 30000,
  API_RETRY_ATTEMPTS: 3,
  
  // Spotify Configuration
  SPOTIFY_TOKEN_URL: 'https://accounts.spotify.com/api/token',
  SPOTIFY_API_BASE: 'https://api.spotify.com/v1',
  
  // Test Configuration
  TEST_TIMEOUT: 120000, // 2 minutes
  E2E_TIMEOUT: 30000,   // 30 seconds
  
  // Development Configuration
  DEV_SERVER_PORT: 3000,
  DEV_SERVER_HOST: 'localhost',
  
  // Authentication
  AUTH_REDIRECT_PATH: '/sign-in',
  DEFAULT_REDIRECT_PATH: '/library',
  
  // Public Routes (matching middleware.js)
  PUBLIC_ROUTES: [
    '/',
    '/home',
    '/auth/callback',
    '/sign-in',
    '/favicon.ico',
    '/api/health',
  ],
  
  // Navigation Links (matching Navbar.jsx)
  NAV_LINKS: [
    { href: '/home', label: 'Home' },
    { href: '/groups', label: 'Groups' },
    { href: '/playlist', label: 'Playlist' },
    { href: '/library', label: 'Library' },
    { href: '/profile', label: 'Profile' },
    { href: '/settings', label: 'Settings' },
  ],
  
  // Library Tabs (matching LibraryView.jsx)
  LIBRARY_TABS: [
    { key: 'recent', label: 'Recent History' },
    { key: 'saved', label: 'Saved Playlists' },
  ],
};

// Environment-specific configurations
export const ENV_CONFIG = {
  development: {
    LOG_LEVEL: 'debug',
    ENABLE_DEVTOOLS: true,
  },
  production: {
    LOG_LEVEL: 'error',
    ENABLE_DEVTOOLS: false,
  },
  test: {
    LOG_LEVEL: 'silent',
    ENABLE_DEVTOOLS: false,
  },
};

// Get current environment config
export const getEnvConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  return ENV_CONFIG[env] || ENV_CONFIG.development;
};
