import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import SignInPage from '../sign-in/page';
import { supabaseBrowser } from '@/lib/supabase/client';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabaseBrowser: vi.fn(),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Music: ({ className }) => <div data-testid="music-icon" className={className}>Music</div>,
}));

describe('SignInPage', () => {
  const mockPush = vi.fn();
  const mockGetSession = vi.fn();
  const mockSignInWithOAuth = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    useRouter.mockReturnValue({
      push: mockPush,
    });

    supabaseBrowser.mockReturnValue({
      auth: {
        getSession: mockGetSession,
        signInWithOAuth: mockSignInWithOAuth,
      },
    });

    // Mock window.location
    delete window.location;
    window.location = { origin: 'http://localhost:3000' };
  });

  it('renders sign-in page with welcome message', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    render(<SignInPage />);

    await waitFor(() => {
      expect(screen.getByText('Welcome to Vybe')).toBeInTheDocument();
      expect(screen.getByText('Connect with friends and share your musical journey')).toBeInTheDocument();
    });
  });

  it('renders Music icon', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    render(<SignInPage />);

    await waitFor(() => {
      expect(screen.getByTestId('music-icon')).toBeInTheDocument();
    });
  });

  it('renders Spotify and Google sign-in buttons', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    render(<SignInPage />);

    await waitFor(() => {
      const spotifyButton = screen.getByTestId('spotify-signin');
      const googleButton = screen.getByTestId('google-signin');

      expect(spotifyButton).toBeInTheDocument();
      expect(googleButton).toBeInTheDocument();
      expect(spotifyButton).toHaveTextContent('Continue with Spotify');
      expect(googleButton).toHaveTextContent('Continue with Google');
    });
  });

  it('redirects to library if user is already logged in', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: '123' },
        },
      },
    });

    render(<SignInPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/library');
    });
  });

  it('calls signInWithOAuth with correct Spotify parameters when Spotify button is clicked', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignInWithOAuth.mockResolvedValue({ error: null });

    render(<SignInPage />);

    await waitFor(() => {
      expect(screen.getByTestId('spotify-signin')).toBeInTheDocument();
    });

    const spotifyButton = screen.getByTestId('spotify-signin');
    await userEvent.click(spotifyButton);

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'spotify',
      options: {
        redirectTo: 'http://localhost:3000/auth/callback?next=/library&provider=spotify',
        scopes: 'user-read-email user-read-private playlist-read-private user-read-recently-played',
      },
      queryParams: { show_dialog: 'true' },
    });
  });

  it('calls signInWithOAuth with correct Google parameters when Google button is clicked', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignInWithOAuth.mockResolvedValue({ error: null });

    render(<SignInPage />);

    await waitFor(() => {
      expect(screen.getByTestId('google-signin')).toBeInTheDocument();
    });

    const googleButton = screen.getByTestId('google-signin');
    await userEvent.click(googleButton);

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:3000/auth/callback?next=/library&provider=google',
        scopes: 'openid email profile https://www.googleapis.com/auth/youtube.readonly',
      },
    });
  });

  it('handles Spotify OAuth errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignInWithOAuth.mockResolvedValue({
      error: { message: 'OAuth error' },
    });

    render(<SignInPage />);

    await waitFor(() => {
      expect(screen.getByTestId('spotify-signin')).toBeInTheDocument();
    });

    const spotifyButton = screen.getByTestId('spotify-signin');
    await userEvent.click(spotifyButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Spotify login error:', 'OAuth error');
    });

    consoleErrorSpy.mockRestore();
  });

  it('handles Google OAuth errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignInWithOAuth.mockResolvedValue({
      error: { message: 'OAuth error' },
    });

    render(<SignInPage />);

    await waitFor(() => {
      expect(screen.getByTestId('google-signin')).toBeInTheDocument();
    });

    const googleButton = screen.getByTestId('google-signin');
    await userEvent.click(googleButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Google/YouTube login error:', 'OAuth error');
    });

    consoleErrorSpy.mockRestore();
  });

  it('has correct styling classes for Spotify button', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    render(<SignInPage />);

    await waitFor(() => {
      const spotifyButton = screen.getByTestId('spotify-signin');
      expect(spotifyButton).toHaveClass('bg-[#1DB954]');
      expect(spotifyButton).toHaveClass('hover:bg-[#1ed760]');
      expect(spotifyButton).toHaveClass('active:bg-[#1aa34a]');
    });
  });

  it('has correct styling classes for Google button', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    render(<SignInPage />);

    await waitFor(() => {
      const googleButton = screen.getByTestId('google-signin');
      expect(googleButton).toHaveClass('bg-white');
      expect(googleButton).toHaveClass('hover:bg-gray-100');
      expect(googleButton).toHaveClass('border');
    });
  });

  it('renders glass card container', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    render(<SignInPage />);

    await waitFor(() => {
      const container = screen.getByText('Welcome to Vybe').closest('.glass-card');
      expect(container).toBeInTheDocument();
    });
  });

  it('renders responsive classes for mobile', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    render(<SignInPage />);

    await waitFor(() => {
      const spotifyButton = screen.getByTestId('spotify-signin');
      expect(spotifyButton).toHaveClass('text-sm');
      expect(spotifyButton).toHaveClass('sm:text-base');
      expect(spotifyButton).toHaveClass('touch-manipulation');
    });
  });
});

