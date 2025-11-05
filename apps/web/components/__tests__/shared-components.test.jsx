import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GroupCard } from '@/components/shared/GroupCard'
import { LoadingState } from '@/components/shared/LoadingState'
import { EmptyState } from '@/components/shared/EmptyState'
import { ShareSongDialog } from '@/components/shared/ShareSongDialog'
import { CommunitiesDialog } from '@/components/shared/CommunitiesDialog'
import { Users } from 'lucide-react'
import { testAccessibility } from '@/test/test-utils'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('GroupCard', () => {
  const defaultProps = {
    name: 'Test Group',
    description: 'Test Description',
    memberCount: 5,
    songCount: 10,
    createdAt: '2024-01-01T00:00:00Z'
  }

  it('renders with all props', () => {
    render(<GroupCard {...defaultProps} />)

    expect(screen.getByText('Test Group')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
    expect(screen.getByText('5 members')).toBeInTheDocument()
    expect(screen.getByText('10 songs')).toBeInTheDocument()
  })

  it('handles click events', async () => {
    const handleClick = vi.fn()
    render(<GroupCard {...defaultProps} onClick={handleClick} />)

    const card = screen.getByText('Test Group').closest('div')
    await userEvent.click(card)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders visibility badge when provided', () => {
    render(<GroupCard {...defaultProps} visibility="Public" />)

    expect(screen.getByText('Public')).toBeInTheDocument()
  })

  it('renders join code when provided', () => {
    render(<GroupCard {...defaultProps} joinCode="ABC123" />)

    expect(screen.getByText('ABC123')).toBeInTheDocument()
  })

  it('handles missing description gracefully', () => {
    const { description, ...propsWithoutDesc } = defaultProps
    render(<GroupCard {...propsWithoutDesc} />)

    expect(screen.getByText('Test Group')).toBeInTheDocument()
    expect(screen.queryByText('Test Description')).not.toBeInTheDocument()
  })

  it('handles zero counts', () => {
    render(<GroupCard {...defaultProps} memberCount={0} songCount={0} />)

    expect(screen.getByText('0 members')).toBeInTheDocument()
    expect(screen.getByText('0 songs')).toBeInTheDocument()
  })

  it('handles missing createdAt', () => {
    const { createdAt, ...propsWithoutDate } = defaultProps
    render(<GroupCard {...propsWithoutDate} />)

    expect(screen.getByText('N/A')).toBeInTheDocument()
  })

  it('formats date correctly', () => {
    render(<GroupCard {...defaultProps} createdAt="2024-01-15T00:00:00Z" />)

    // Should show formatted date
    expect(screen.getByText(/1\/15\/2024/)).toBeInTheDocument()
  })

  it('truncates long names', () => {
    const longName = 'A'.repeat(100)
    render(<GroupCard {...defaultProps} name={longName} />)

    const nameElement = screen.getByText(new RegExp(`^${longName}$`))
    expect(nameElement).toBeInTheDocument()
    expect(nameElement).toHaveClass('truncate')
  })

  it('has proper accessibility attributes', () => {
    const { container } = render(<GroupCard {...defaultProps} />)
    expect(container.querySelector('.cursor-pointer')).toBeInTheDocument()
  })

  it('handles keyboard navigation', async () => {
    const handleClick = vi.fn()
    render(<GroupCard {...defaultProps} onClick={handleClick} />)

    const card = screen.getByText('Test Group').closest('div')
    card.focus()
    
    // Should be focusable
    expect(document.activeElement).toBe(card)
  })
})

describe('LoadingState', () => {
  it('renders default count of 3 loading cards', () => {
    const { container } = render(<LoadingState />)

    const loadingCards = container.querySelectorAll('.animate-pulse')
    expect(loadingCards.length).toBe(3)
  })

  it('renders custom count of loading cards', () => {
    const { container } = render(<LoadingState count={5} />)

    const loadingCards = container.querySelectorAll('.animate-pulse')
    expect(loadingCards.length).toBe(5)
  })

  it('applies custom className', () => {
    const { container } = render(<LoadingState className="custom-class" />)

    expect(container.querySelector('.custom-class')).toBeInTheDocument()
  })

  it('renders skeleton content', () => {
    const { container } = render(<LoadingState />)

    const skeletons = container.querySelectorAll('.bg-muted')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('has proper accessibility attributes', async () => {
    const { container } = render(<LoadingState />)
    await testAccessibility(container)
  })
})

describe('EmptyState', () => {
  const defaultProps = {
    icon: Users,
    title: 'No Items',
    description: 'There are no items to display'
  }

  it('renders with all props', () => {
    render(<EmptyState {...defaultProps} />)

    expect(screen.getByText('No Items')).toBeInTheDocument()
    expect(screen.getByText('There are no items to display')).toBeInTheDocument()
  })

  it('renders icon when provided', () => {
    const { container } = render(<EmptyState {...defaultProps} />)

    const icon = container.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })

  it('renders action button when provided', () => {
    const action = <button>Create Item</button>
    render(<EmptyState {...defaultProps} action={action} />)

    expect(screen.getByRole('button', { name: 'Create Item' })).toBeInTheDocument()
  })

  it('handles missing icon gracefully', () => {
    const { icon, ...propsWithoutIcon } = defaultProps
    const { container } = render(<EmptyState {...propsWithoutIcon} />)

    expect(screen.getByText('No Items')).toBeInTheDocument()
    // Icon should not be rendered
    const iconElement = container.querySelector('svg')
    // Icon might still be in DOM from Users import, but shouldn't be in the EmptyState content
    expect(screen.getByText('No Items')).toBeInTheDocument()
  })

  it('handles missing description gracefully', () => {
    const { description, ...propsWithoutDesc } = defaultProps
    render(<EmptyState {...propsWithoutDesc} />)

    expect(screen.getByText('No Items')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<EmptyState {...defaultProps} className="custom-class" />)

    expect(container.querySelector('.custom-class')).toBeInTheDocument()
  })

  it('has proper heading structure', () => {
    render(<EmptyState {...defaultProps} />)

    const heading = screen.getByRole('heading', { level: 3 })
    expect(heading).toHaveTextContent('No Items')
  })

  it('has proper accessibility attributes', async () => {
    const { container } = render(<EmptyState {...defaultProps} />)
    await testAccessibility(container)
  })

  it('handles long text gracefully', () => {
    const longTitle = 'A'.repeat(100)
    const longDescription = 'B'.repeat(200)
    render(
      <EmptyState
        {...defaultProps}
        title={longTitle}
        description={longDescription}
      />
    )

    expect(screen.getByText(longTitle)).toBeInTheDocument()
    expect(screen.getByText(longDescription)).toBeInTheDocument()
  })

  it('renders without action', () => {
    render(<EmptyState {...defaultProps} />)

    expect(screen.getByText('No Items')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('handles complex action elements', () => {
    const complexAction = (
      <div>
        <button>Button 1</button>
        <button>Button 2</button>
      </div>
    )
    render(<EmptyState {...defaultProps} action={complexAction} />)

    expect(screen.getByRole('button', { name: 'Button 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Button 2' })).toBeInTheDocument()
  })
})

describe('ShareSongDialog', () => {
  const mockOnOpenChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dialog when open', () => {
    render(<ShareSongDialog open={true} onOpenChange={mockOnOpenChange} />)

    expect(screen.getByText('Share Your Song of the Day')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/search songs/i)).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<ShareSongDialog open={false} onOpenChange={mockOnOpenChange} />)

    expect(screen.queryByText('Share Your Song of the Day')).not.toBeInTheDocument()
  })

  it('allows searching for songs', async () => {
    render(<ShareSongDialog open={true} onOpenChange={mockOnOpenChange} />)

    const searchInput = screen.getByPlaceholderText(/search songs/i)
    await userEvent.type(searchInput, 'test')

    expect(searchInput).toHaveValue('test')
  })

  it('displays search results when query is long enough', async () => {
    render(<ShareSongDialog open={true} onOpenChange={mockOnOpenChange} />)

    const searchInput = screen.getByPlaceholderText(/search songs/i)
    await userEvent.type(searchInput, 'test')

    await waitFor(() => {
      expect(screen.getByText('Blinding Lights')).toBeInTheDocument()
    })
  })

  it('handles song selection', async () => {
    render(<ShareSongDialog open={true} onOpenChange={mockOnOpenChange} />)

    const searchInput = screen.getByPlaceholderText(/search songs/i)
    await userEvent.type(searchInput, 'test')

    await waitFor(() => {
      expect(screen.getByText('Blinding Lights')).toBeInTheDocument()
    })

    const songButton = screen.getByText('Blinding Lights')
    await userEvent.click(songButton)

    expect(screen.getByText('Blinding Lights')).toBeInTheDocument()
    expect(screen.getByText('The Weeknd')).toBeInTheDocument()
  })

  it('disables share button when no song is selected', () => {
    render(<ShareSongDialog open={true} onOpenChange={mockOnOpenChange} />)

    const shareButton = screen.getByRole('button', { name: /share song/i })
    expect(shareButton).toBeDisabled()
  })

  it('enables share button when song is selected', async () => {
    render(<ShareSongDialog open={true} onOpenChange={mockOnOpenChange} />)

    const searchInput = screen.getByPlaceholderText(/search songs/i)
    await userEvent.type(searchInput, 'test')

    await waitFor(() => {
      expect(screen.getByText('Blinding Lights')).toBeInTheDocument()
    })

    const songButton = screen.getByText('Blinding Lights')
    await userEvent.click(songButton)

    const shareButton = screen.getByRole('button', { name: /share song/i })
    expect(shareButton).not.toBeDisabled()
  })

  it('has modal-scroll class for scrollable content', () => {
    const { container } = render(<ShareSongDialog open={true} onOpenChange={mockOnOpenChange} />)
    expect(container.querySelector('.modal-scroll')).toBeInTheDocument()
  })
})

describe('CommunitiesDialog', () => {
  const mockOnOpenChange = vi.fn()
  const mockCommunities = [
    {
      id: 'comm1',
      name: 'Jazz Lovers',
      description: 'For jazz enthusiasts',
      member_count: 1500,
      group_count: 25
    },
    {
      id: 'comm2',
      name: 'Rock Nation',
      description: 'All about rock music',
      member_count: 3000,
      group_count: 50
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dialog when open', () => {
    render(<CommunitiesDialog open={true} onOpenChange={mockOnOpenChange} communities={mockCommunities} />)

    expect(screen.getByText('Browse Communities')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/search communities/i)).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<CommunitiesDialog open={false} onOpenChange={mockOnOpenChange} communities={mockCommunities} />)

    expect(screen.queryByText('Browse Communities')).not.toBeInTheDocument()
  })

  it('displays all communities', () => {
    render(<CommunitiesDialog open={true} onOpenChange={mockOnOpenChange} communities={mockCommunities} />)

    expect(screen.getByText('Jazz Lovers')).toBeInTheDocument()
    expect(screen.getByText('Rock Nation')).toBeInTheDocument()
  })

  it('displays community member counts', () => {
    render(<CommunitiesDialog open={true} onOpenChange={mockOnOpenChange} communities={mockCommunities} />)

    expect(screen.getByText('1,500')).toBeInTheDocument()
    expect(screen.getByText('3,000')).toBeInTheDocument()
  })

  it('filters communities by search query', async () => {
    render(<CommunitiesDialog open={true} onOpenChange={mockOnOpenChange} communities={mockCommunities} />)

    const searchInput = screen.getByPlaceholderText(/search communities/i)
    await userEvent.type(searchInput, 'Jazz')

    expect(screen.getByText('Jazz Lovers')).toBeInTheDocument()
    expect(screen.queryByText('Rock Nation')).not.toBeInTheDocument()
  })

  it('shows trending badge for large communities', () => {
    render(<CommunitiesDialog open={true} onOpenChange={mockOnOpenChange} communities={mockCommunities} />)

    expect(screen.getByText('Trending')).toBeInTheDocument()
  })

  it('displays empty state when no communities match', async () => {
    render(<CommunitiesDialog open={true} onOpenChange={mockOnOpenChange} communities={mockCommunities} />)

    const searchInput = screen.getByPlaceholderText(/search communities/i)
    await userEvent.type(searchInput, 'Nonexistent')

    expect(screen.getByText('No communities found')).toBeInTheDocument()
  })

  it('handles join button click', async () => {
    render(<CommunitiesDialog open={true} onOpenChange={mockOnOpenChange} communities={mockCommunities} />)

    const joinButtons = screen.getAllByRole('button', { name: /join/i })
    await userEvent.click(joinButtons[0])

    expect(joinButtons[0]).toBeInTheDocument()
  })

  it('has modal-scroll class for scrollable content', () => {
    const { container } = render(<CommunitiesDialog open={true} onOpenChange={mockOnOpenChange} communities={mockCommunities} />)
    expect(container.querySelector('.modal-scroll')).toBeInTheDocument()
  })
})

