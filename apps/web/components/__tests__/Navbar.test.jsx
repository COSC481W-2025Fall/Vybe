import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Navbar from '@/components/Navbar'

// Mock Next.js router
const mockUsePathname = vi.fn()
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

describe('Navbar', () => {
  it('renders the Vybe brand', () => {
    mockUsePathname.mockReturnValue('/')
    render(<Navbar />)
    
    const brandElement = screen.getByText('Vybe')
    expect(brandElement).toBeInTheDocument()
    expect(brandElement).toHaveClass('text-yellow-400')
  })

  it('renders all navigation links', () => {
    mockUsePathname.mockReturnValue('/')
    render(<Navbar />)
    
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Groups')).toBeInTheDocument()
    expect(screen.getByText('Playlist')).toBeInTheDocument()
    expect(screen.getByText('Library')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()
  })

  it('has correct href attributes for navigation links', () => {
    mockUsePathname.mockReturnValue('/')
    render(<Navbar />)
    
    const homeLink = screen.getByRole('link', { name: /home/i })
    const groupsLink = screen.getByRole('link', { name: /groups/i })
    const playlistLink = screen.getByRole('link', { name: /playlist/i })
    const libraryLink = screen.getByRole('link', { name: /library/i })
    const profileLink = screen.getByRole('link', { name: /profile/i })
    
    expect(homeLink).toHaveAttribute('href', '/')
    expect(groupsLink).toHaveAttribute('href', '/groups')
    expect(playlistLink).toHaveAttribute('href', '/playlist')
    expect(libraryLink).toHaveAttribute('href', '/library')
    expect(profileLink).toHaveAttribute('href', '/profile')
  })

  it('applies active state to current page', () => {
    // Mock the pathname to be '/library'
    mockUsePathname.mockReturnValue('/library')
    
    render(<Navbar />)
    
    const libraryLink = screen.getByRole('link', { name: /library/i })
    expect(libraryLink).toHaveAttribute('aria-current', 'page')
    expect(libraryLink).toHaveClass('bg-white', 'text-black')
  })
})
