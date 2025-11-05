import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddFriendsModal from '@/components/AddFriendsModal';
import { testAccessibility } from '@/test/test-utils';

// Mock fetch
global.fetch = vi.fn();

describe('AddFriendsModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with title and close button', () => {
    render(<AddFriendsModal onClose={mockOnClose} />);

    expect(screen.getByText('Add Friends')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<AddFriendsModal onClose={mockOnClose} />);

    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    render(<AddFriendsModal onClose={mockOnClose} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    await userEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('searches for users when form is submitted', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        users: [
          { id: '1', username: 'user1', email: 'user1@example.com' },
        ],
      }),
    });

    render(<AddFriendsModal onClose={mockOnClose} />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    await userEvent.type(searchInput, 'test');
    await userEvent.keyboard('{Enter}');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('handles search errors gracefully', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        error: 'Search failed',
      }),
    });

    render(<AddFriendsModal onClose={mockOnClose} />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    await userEvent.type(searchInput, 'test');
    await userEvent.keyboard('{Enter}');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('renders browse all button', () => {
    render(<AddFriendsModal onClose={mockOnClose} />);

    expect(screen.getByText(/browse all/i)).toBeInTheDocument();
  });

  it('has glass-card styling', () => {
    const { container } = render(<AddFriendsModal onClose={mockOnClose} />);
    expect(container.querySelector('.glass-card')).toBeInTheDocument();
  });

  it('has modal-scroll class for scrollable content', () => {
    const { container } = render(<AddFriendsModal onClose={mockOnClose} />);
    expect(container.querySelector('.modal-scroll')).toBeInTheDocument();
  });
});

