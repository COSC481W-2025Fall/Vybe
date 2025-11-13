'use client';

import { useEffect, useState } from 'react';

const PRIVACY_LEVELS = ['public', 'friends', 'private'];
const FRIEND_REQUEST_SETTINGS = ['everyone', 'friends_of_friends', 'nobody'];

const defaultSettings = {
  profile_visibility: 'public',
  playlist_visibility: 'public',
  listening_activity_visible: true,
  song_of_day_visibility: 'public',
  friend_request_setting: 'everyone',
  searchable: true,
  activity_feed_visible: true,
};

export default function PrivacySettingsPage() {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Load current settings from backend
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      setMessage(null);
      try {
        const res = await fetch('/api/account/settings', { method: 'GET' });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load settings');
        }

        const data = await res.json();
        setSettings({
          profile_visibility: data.profile_visibility ?? 'public',
          playlist_visibility: data.playlist_visibility ?? 'public',
          listening_activity_visible:
            data.listening_activity_visible ?? true,
          song_of_day_visibility: data.song_of_day_visibility ?? 'public',
          friend_request_setting: data.friend_request_setting ?? 'everyone',
          searchable: data.searchable ?? true,
          activity_feed_visible: data.activity_feed_visible ?? true,
        });
      } catch (err) {
        setError(err.message || 'Error loading settings');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch('/api/account/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to save settings');
      }

      const data = await res.json();
      setSettings({
        profile_visibility: data.profile_visibility ?? 'public',
        playlist_visibility: data.playlist_visibility ?? 'public',
        listening_activity_visible:
          data.listening_activity_visible ?? true,
        song_of_day_visibility: data.song_of_day_visibility ?? 'public',
        friend_request_setting: data.friend_request_setting ?? 'everyone',
        searchable: data.searchable ?? true,
        activity_feed_visible: data.activity_feed_visible ?? true,
      });
      setMessage('Settings saved successfully');
    } catch (err) {
      setError(err.message || 'Error saving settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="p-4">Loading privacy settings…</p>;
  }

  return (
    <main className="p-4 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-white">Privacy & Account Settings</h1>

      {error && <p className="text-red-400">{error}</p>}
      {message && <p className="text-green-400">{message}</p>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile visibility */}
        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Profile visibility
          </label>
          <select
            className="border rounded px-3 py-2 w-full bg-black text-white"
            value={settings.profile_visibility}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                profile_visibility: e.target.value,
              }))
            }
          >
            {PRIVACY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        {/* Playlist visibility */}
        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Playlist visibility
          </label>
          <select
            className="border rounded px-3 py-2 w-full bg-black text-white"
            value={settings.playlist_visibility}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                playlist_visibility: e.target.value,
              }))
            }
          >
            {PRIVACY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        {/* Song of the Day visibility */}
        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Song of the Day visibility
          </label>
          <select
            className="border rounded px-3 py-2 w-full bg-black text-white"
            value={settings.song_of_day_visibility}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                song_of_day_visibility: e.target.value,
              }))
            }
          >
            {PRIVACY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        {/* Toggles */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-white">
            <input
              type="checkbox"
              checked={settings.listening_activity_visible}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  listening_activity_visible: e.target.checked,
                }))
              }
            />
            <span>Show my listening activity</span>
          </label>

          <label className="flex items-center gap-2 text-sm text-white">
            <input
              type="checkbox"
              checked={settings.activity_feed_visible}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  activity_feed_visible: e.target.checked,
                }))
              }
            />
            <span>Show my activity feed</span>
          </label>

          <label className="flex items-center gap-2 text-sm text-white">
            <input
              type="checkbox"
              checked={settings.searchable}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  searchable: e.target.checked,
                }))
              }
            />
            <span>Allow others to find me in search</span>
          </label>
        </div>

        {/* Friend request setting */}
        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Who can send me friend requests?
          </label>
          <select
            className="border rounded px-3 py-2 w-full bg-black text-white"
            value={settings.friend_request_setting}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                friend_request_setting: e.target.value,
              }))
            }
          >
            {FRIEND_REQUEST_SETTINGS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded bg-purple-600 text-white text-sm disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </main>
  );
}
