'use client';

import { renderWithProviders } from '@/test/utils/renderWithProviders.jsx';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LibraryView from '@/components/LibraryView.jsx';
import { vi } from 'vitest';
import { expectA11y } from '@/test/utils/a11y';

// Mock fetch endpoints used by LibraryView
const mockRecent = {
  items: [
    {
      played_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      track: {
        id: 't1',
        name: 'Song 1',
        album: { name: 'Album', images: [{ url: 'x' }, { url: 'y' }] },
        artists: [{ name: 'Artist' }],
      },
    },
  ],
};

beforeEach(() => {
  vi.spyOn(global, 'fetch').mockImplementation((input) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url.includes('/api/spotify/me/player/recently-played')) {
      return Promise.resolve(new Response(JSON.stringify(mockRecent), { status: 200 }));
    }
    if (url.includes('/api/spotify/me')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({ display_name: 'Test User', images: [{ url: 'avatar' }] }),
          { status: 200 },
        ),
      );
    }
    return Promise.resolve(new Response('Not found', { status: 404 }));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LibraryView', () => {
  it('loads and displays recent history', async () => {
    const { container } = renderWithProviders(<LibraryView />);
    expect(await screen.findByText(/Recent Listening History/i)).toBeInTheDocument();
    expect(await screen.findByText('Song 1')).toBeInTheDocument();
    await expectA11y(container);
  });

  it('switches to Saved Playlists tab and shows empty state', async () => {
    renderWithProviders(<LibraryView />);
    const playlistsTab = await screen.findByRole('button', { name: /Saved Playlists/i });
    await userEvent.click(playlistsTab);
    await waitFor(() => {
      expect(screen.getByText(/You don’t have any saved playlists yet\./i)).toBeInTheDocument();
    });
  });
});


