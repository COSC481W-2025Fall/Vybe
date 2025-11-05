import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FriendRequestsModal from '@/components/FriendRequestsModal';
import { testAccessibility } from '@/test/test-utils';

// Mock fetch
global.fetch = vi.fn();

describe('FriendRequestsModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with title and close button', () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        sent: [],
        received: [],
      }),
    });

    render(<FriendRequestsModal onClose={mockOnClose} />);

    expect(screen.getByText('Friend Requests')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('loads friend requests on mount', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        sent: [],
        received: [],
      }),
    });

    render(<FriendRequestsModal onClose={mockOnClose} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/friends/requests');
    });
  });

  it('displays loading state initially', () => {
    global.fetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<FriendRequestsModal onClose={mockOnClose} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays received requests', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        sent: [],
        received: [
          {
            id: 'req1',
            from_user: { id: 'user1', username: 'user1', avatar_url: 'avatar1.jpg' },
          },
        ],
      }),
    });

    render(<FriendRequestsModal onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });
  });

  it('displays sent requests', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        sent: [
          {
            id: 'req2',
            to_user: { id: 'user2', username: 'user2', avatar_url: 'avatar2.jpg' },
          },
        ],
        received: [],
      }),
    });

    render(<FriendRequestsModal onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('user2')).toBeInTheDocument();
    });
  });

  it('handles accept request', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          sent: [],
          received: [
            {
              id: 'req1',
              from_user: { id: 'user1', username: 'user1', avatar_url: 'avatar1.jpg' },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, sent: [], received: [] }),
      });

    render(<FriendRequestsModal onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });

    const acceptButton = screen.getByRole('button', { name: /accept/i });
    await userEvent.click(acceptButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/friends/requests',
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });
  });

  it('handles reject request', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          sent: [],
          received: [
            {
              id: 'req1',
              from_user: { id: 'user1', username: 'user1', avatar_url: 'avatar1.jpg' },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, sent: [], received: [] }),
      });

    render(<FriendRequestsModal onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });

    const rejectButton = screen.getByRole('button', { name: /reject/i });
    await userEvent.click(rejectButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/friends/requests',
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });
  });

  it('calls onClose when close button is clicked', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        sent: [],
        received: [],
      }),
    });

    render(<FriendRequestsModal onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    const closeButton = screen.getByRole('button', { name: /close/i });
    await userEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('has glass-card styling', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        sent: [],
        received: [],
      }),
    });

    const { container } = render(<FriendRequestsModal onClose={mockOnClose} />);

    await waitFor(() => {
      expect(container.querySelector('.glass-card')).toBeInTheDocument();
    });
  });

  it('has modal-scroll class for scrollable content', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        sent: [],
        received: [],
      }),
    });

    const { container } = render(<FriendRequestsModal onClose={mockOnClose} />);

    await waitFor(() => {
      expect(container.querySelector('.modal-scroll')).toBeInTheDocument();
    });
  });
});

