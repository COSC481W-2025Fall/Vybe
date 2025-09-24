'use client';

import { useState } from 'react';

/**
 * GoogleTestPage Component
 * 
 * This component provides a simple interface to test the Google OAuth integration.
 * It allows users to verify that their Google authentication is working correctly
 * and that they can access YouTube data through the API.
 * 
 * Features:
 * - Test Google OAuth connection
 * - Display YouTube channel information
 * - Show YouTube playlists
 * - Error handling and user feedback
 */
export default function GoogleTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Test Google OAuth integration
   * This function calls the test API endpoint to verify Google OAuth is working
   */
  const testGoogleAuth = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/google-test');
      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data);
      }
    } catch (err) {
      setError({
        error: 'Network error',
        details: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Google OAuth Test</h1>
          <p className="text-blue-200 text-lg">
            Test your Google authentication and YouTube API access
          </p>
        </div>

        {/* Test Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={testGoogleAuth}
            disabled={loading}
            className="bg-white text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                Testing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Test Google OAuth
              </>
            )}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            <div className="font-bold mb-2">❌ Test Failed</div>
            <div className="mb-2">{error.error}</div>
            {error.details && (
              <div className="text-sm text-red-600 mb-2">
                <strong>Details:</strong> {error.details}
              </div>
            )}
            {error.message && (
              <div className="text-sm text-red-600">
                <strong>Note:</strong> {error.message}
              </div>
            )}
          </div>
        )}

        {/* Success Display */}
        {result && (
          <div className="space-y-6">
            {/* Success Header */}
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
              <div className="font-bold mb-2">✅ Test Successful!</div>
              <div>{result.message}</div>
            </div>

            {/* User Information */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-semibold text-white mb-4">👤 User Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-200">
                <div>
                  <strong>ID:</strong> {result.data.user.id}
                </div>
                <div>
                  <strong>Email:</strong> {result.data.user.email}
                </div>
                <div>
                  <strong>Name:</strong> {result.data.user.name || 'Not provided'}
                </div>
                <div>
                  <strong>Provider:</strong> {result.data.user.provider}
                </div>
              </div>
            </div>

            {/* YouTube Channel Information */}
            {result.data.youtube.channel && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-4">📺 YouTube Channel</h3>
                <div className="flex items-start gap-4">
                  <img
                    src={result.data.youtube.channel.thumbnail}
                    alt="Channel thumbnail"
                    className="w-16 h-16 rounded-full"
                  />
                  <div className="text-blue-200">
                    <div className="font-semibold text-white text-lg">
                      {result.data.youtube.channel.title}
                    </div>
                    {result.data.youtube.channel.customUrl && (
                      <div className="text-sm text-blue-300">
                        @{result.data.youtube.channel.customUrl}
                      </div>
                    )}
                    {result.data.youtube.channel.description && (
                      <div className="mt-2 text-sm">
                        {result.data.youtube.channel.description}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* YouTube Playlists */}
            {result.data.youtube.playlists && result.data.youtube.playlists.length > 0 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-4">
                  📋 YouTube Playlists ({result.data.youtube.playlistsCount})
                </h3>
                <div className="grid gap-4">
                  {result.data.youtube.playlists.map((playlist) => (
                    <div key={playlist.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                      <img
                        src={playlist.thumbnail}
                        alt="Playlist thumbnail"
                        className="w-12 h-12 rounded"
                      />
                      <div className="flex-1 text-blue-200">
                        <div className="font-semibold text-white">{playlist.title}</div>
                        <div className="text-sm text-blue-300">
                          {playlist.channelTitle} • {new Date(playlist.publishedAt).toLocaleDateString()}
                        </div>
                        {playlist.description && (
                          <div className="text-sm mt-1 line-clamp-2">
                            {playlist.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-lg">
          <div className="font-bold mb-2">📝 Instructions</div>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Make sure you have signed in with Google using the sign-in page</li>
            <li>Grant YouTube access permissions when prompted</li>
            <li>Click the "Test Google OAuth" button above</li>
            <li>If successful, you'll see your YouTube channel and playlists</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
