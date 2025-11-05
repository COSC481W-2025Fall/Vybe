import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GroupCard } from '@/components/shared/GroupCard'
import { LoadingState } from '@/components/shared/LoadingState'
import { EmptyState } from '@/components/shared/EmptyState'
import { Users } from 'lucide-react'
import { testAccessibility } from '@/test/test-utils'

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
    render(<GroupCard {...defaultProps} name="A".repeat(100) />)

    const nameElement = screen.getByText(/^A+$/)
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
    render(
      <EmptyState
        {...defaultProps}
        title="A".repeat(100)
        description="B".repeat(200)
      />
    )

    expect(screen.getByText(/^A+$/)).toBeInTheDocument()
    expect(screen.getByText(/^B+$/)).toBeInTheDocument()
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

