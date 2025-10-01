'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { validateYTMusicConnection, checkYTMusicBackendHealth } from '@/app/lib/ytmusic';

export default function SignInPage() {
  const supabase = supabaseBrowser();
  const [ytmusicStatus, setYtmusicStatus] = useState('idle'); // idle | checking | connected | not-connected | backend-offline
  const [showYTMusicSetup, setShowYTMusicSetup] = useState(false);
  const [ytmusicError, setYtmusicError] = useState('');

  const signInWithSpotify = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'spotify',
      options: {
        redirectTo: `${location.origin}/auth/callback?next=/library%3Ffrom%3Dspotify`,
        scopes: 'user-read-email user-read-private playlist-read-private user-read-recently-played',
      },
      queryParams: { show_dialog: 'true' },
    });
    if (error) console.error('Spotify login error:', error.message);
  };

  const checkYTMusicConnection = async () => {
    setYtmusicStatus('checking');
    setYtmusicError('');
    try {
      const isHealthy = await checkYTMusicBackendHealth();
      if (!isHealthy) {
        setYtmusicStatus('backend-offline');
        setYtmusicError('Service is temporarily unavailable. Please try again later.');
        return;
      }

      const result = await validateYTMusicConnection();
      if (result.success) {
        setYtmusicStatus('connected');
        window.location.href = '/library?service=ytmusic';
      } else {
        setYtmusicStatus('not-connected');
        setYtmusicError(result.error || 'Not connected yet. Open music.youtube.com with the extension enabled and play a track.');
      }
    } catch (error) {
      setYtmusicStatus('not-connected');
      setYtmusicError(error?.message || 'Unexpected error. Please try again.');
    }
  };

  const handleYTMusicClick = () => {
    // Open modal and immediately attempt a check; if not connected, the
    // modal will display the friendly reason. If connected, we redirect.
    setShowYTMusicSetup(true);
    void checkYTMusicConnection();
  };

  return (
    <div className="p-6 flex flex-col justify-center items-center h-80 w-fit bg-[#000000] rounded-lg glow-shadow--soft p-6 bg-black rounded-lg border border-white/40" id="login-box">
      <div className="flex flex-col items-center">
        <h1 className="text-3xl mb-3 bg-[linear-gradient(90deg,#8b5cf6,#ec4899,#f59e0b,#10b981,#3b82f6)] bg-clip-text text-transparent [background-size:300%_300%] animate-[gradient-move_8s_linear_infinite]">Welcome to Vybe</h1>
        <h2 className="mb-8 text-[#6A6A6A]">Connect with friends and share your musical journey</h2>
      </div>

      <div className="flex flex-col gap-4 w-full">
        <div className="flex items-center gap-3">
          <div className="h-0.5 w-20 bg-gray-600"></div>
          <button
            onClick={signInWithSpotify}
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground bg-[#00A63E] text-amber-50 hover:bg-green-900 flex items-center gap-2"
          >
            <span>🎵</span>
            Continue with Spotify
          </button>
          <div className="h-0.5 w-20 bg-[#6A6A6A]"></div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-0.5 w-20 bg-gray-600"></div>
          <button
            onClick={handleYTMusicClick}
            disabled={ytmusicStatus === 'checking'}
            className={`rounded-md px-4 py-2 flex items-center gap-2 ${
              ytmusicStatus === 'connected'
                ? 'bg-[#FF0000] text-white hover:bg-red-700'
                : ytmusicStatus === 'checking'
                ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                : 'bg-[#FF0000] text-white hover:bg-red-700'
            }`}
          >
            <span>🎬</span>
            {ytmusicStatus === 'checking' ? 'Checking YTMusic...' : 'Use YouTube Music'}
          </button>
          <div className="h-0.5 w-20 bg-[#6A6A6A]"></div>
        </div>
      </div>

      {showYTMusicSetup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg max-w-md w-full mx-4 border border-white/20">
            <h3 className="text-xl font-bold mb-4 text-white">🎬 YouTube Music Setup</h3>

            <div className="space-y-4 text-sm text-gray-300">
              <p>To use YouTube Music with Vybe, you'll need to:</p>

              <div className="bg-gray-800 p-4 rounded border border-gray-700">
                <h4 className="font-semibold text-white mb-2">Step 1: Download and load the extension</h4>
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    <a className="underline text-blue-300 hover:text-blue-200" href="/api/ytmusic/extension.zip">Download extension ZIP</a>
                  </li>
                  <li>Unzip it to a folder on your computer</li>
                  <li>Open Chrome and go to <code className="bg-gray-700 px-1 rounded">chrome://extensions</code></li>
                  <li>Enable "Developer mode"</li>
                  <li>Click "Load unpacked" and select the unzipped extension folder</li>
                </ol>
              </div>

              <div className="bg-gray-800 p-4 rounded border border-gray-700">
                <h4 className="font-semibold text-white mb-2">Step 2: Connect to YouTube Music</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Visit <code className="bg-gray-700 px-1 rounded">music.youtube.com</code></li>
                  <li>Log in to your account</li>
                  <li>Play some music to activate the extension</li>
                </ol>
              </div>

              {ytmusicError && (
                <div className="bg-red-900/30 border border-red-700 text-red-300 rounded p-3">
                  {ytmusicError}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowYTMusicSetup(false)}
                className="flex-1 bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700"
              >
                Close
              </button>
              <button
                onClick={() => {
                  checkYTMusicConnection();
                }}
                className="flex-1 bg-[#FF0000] text-white py-2 px-4 rounded hover:bg-red-700"
              >
                Check Connection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
