import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { axe } from 'jest-axe'
import Navbar from '@/components/Navbar'
import { renderWithProviders, testAccessibility, userInteractions } from '@/test/test-utils'

// Mock Next.js router
const mockUsePathname = vi.fn()
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePathname.mockReturnValue('/')
  })

  describe('Rendering', () => {
    it('renders the Vybe brand with correct styling', async () => {
      await act(async () => {
        renderWithProviders(<Navbar />)
      })
      
      const brandElement = screen.getByText('Vybe')
      expect(brandElement).toBeInTheDocument()
      expect(brandElement).toHaveClass('text-yellow-400')
      expect(brandElement.closest('a')).toHaveAttribute('href', '/')
    })

    it('renders all navigation links with correct labels', async () => {
      await act(async () => {
        renderWithProviders(<Navbar />)
      })
      
      expect(screen.getByText('Home')).toBeInTheDocument()
      expect(screen.getByText('Groups')).toBeInTheDocument()
      expect(screen.getByText('Playlist')).toBeInTheDocument()
      expect(screen.getByText('Library')).toBeInTheDocument()
      expect(screen.getByText('Profile')).toBeInTheDocument()
    })

    it('renders navigation links with icons', async () => {
      await act(async () => {
        renderWithProviders(<Navbar />)
      })
      
      // Check that icons are present (they should have lucide-react classes)
      const homeIcon = screen.getByRole('link', { name: /home/i }).querySelector('svg')
      const groupsIcon = screen.getByRole('link', { name: /groups/i }).querySelector('svg')
      const playlistIcon = screen.getByRole('link', { name: /playlist/i }).querySelector('svg')
      const libraryIcon = screen.getByRole('link', { name: /library/i }).querySelector('svg')
      const profileIcon = screen.getByRole('link', { name: /profile/i }).querySelector('svg')
      
      expect(homeIcon).toBeInTheDocument()
      expect(groupsIcon).toBeInTheDocument()
      expect(playlistIcon).toBeInTheDocument()
      expect(libraryIcon).toBeInTheDocument()
      expect(profileIcon).toBeInTheDocument()
    })

    it('has correct href attributes for navigation links', async () => {
      await act(async () => {
        renderWithProviders(<Navbar />)
      })
      
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
  })

  describe('Active State Management', () => {
    it('applies active state to current page (exact match)', async () => {
      mockUsePathname.mockReturnValue('/library')
      
      await act(async () => {
        renderWithProviders(<Navbar />)
      })
      
      const libraryLink = screen.getByRole('link', { name: /library/i })
      expect(libraryLink).toHaveAttribute('aria-current', 'page')
      expect(libraryLink).toHaveClass('bg-white', 'text-black')
    })

    it('applies active state to current page (prefix match)', async () => {
      mockUsePathname.mockReturnValue('/library/recent')
      
      await act(async () => {
        renderWithProviders(<Navbar />)
      })
      
      const libraryLink = screen.getByRole('link', { name: /library/i })
      expect(libraryLink).toHaveAttribute('aria-current', 'page')
      expect(libraryLink).toHaveClass('bg-white', 'text-black')
    })

    it('does not apply active state to home when on other pages', async () => {
      mockUsePathname.mockReturnValue('/library')
      
      await act(async () => {
        renderWithProviders(<Navbar />)
      })
      
      const homeLink = screen.getByRole('link', { name: /home/i })
      expect(homeLink).not.toHaveAttribute('aria-current', 'page')
      expect(homeLink).not.toHaveClass('bg-white', 'text-black')
    })

    it('applies active state to home page when on root', async () => {
      mockUsePathname.mockReturnValue('/')
      
      await act(async () => {
        renderWithProviders(<Navbar />)
      })
      
      const homeLink = screen.getByRole('link', { name: /home/i })
      expect(homeLink).toHaveAttribute('aria-current', 'page')
      expect(homeLink).toHaveClass('bg-white', 'text-black')
    })

    it('handles all navigation paths correctly', async () => {
      const testCases = [
        { path: '/', activeLink: 'Home' },
        { path: '/groups', activeLink: 'Groups' },
        { path: '/groups/create', activeLink: 'Groups' },
        { path: '/playlist', activeLink: 'Playlist' },
        { path: '/playlist/123', activeLink: 'Playlist' },
        { path: '/library', activeLink: 'Library' },
        { path: '/library/recent', activeLink: 'Library' },
        { path: '/profile', activeLink: 'Profile' },
        { path: '/profile/settings', activeLink: 'Profile' }
      ]

      for (const testCase of testCases) {
        mockUsePathname.mockReturnValue(testCase.path)
        
        const { unmount } = await act(async () => {
          return renderWithProviders(<Navbar />)
        })
        
        const activeLinks = screen.getAllByRole('link', { name: new RegExp(testCase.activeLink, 'i') })
        const activeLink = activeLinks.find(link => link.hasAttribute('aria-current'))
        expect(activeLink).toHaveAttribute('aria-current', 'page')
        expect(activeLink).toHaveClass('bg-white', 'text-black')
        
        unmount()
      }
    })
  })

  describe('Styling and Layout', () => {
    it('has correct CSS classes for navigation structure', async () => {
      await act(async () => {
        renderWithProviders(<Navbar />)
      })
      
      const nav = screen.getByRole('navigation')
      expect(nav).toHaveClass('sticky', 'top-0', 'z-50', 'w-full', 'border-b', 'border-border', 'bg-background/80', 'backdrop-blur')
      
      const container = nav.querySelector('div')
      expect(container).toHaveClass('mx-auto', 'flex', 'h-12', 'max-w-6xl', 'items-center', 'gap-6', 'px-4')
    })

    it('has correct styling for inactive navigation links', async () => {
      await act(async () => {
        renderWithProviders(<Navbar />)
      })
      
      const groupsLink = screen.getByRole('link', { name: /groups/i })
      expect(groupsLink).toHaveClass('group', 'flex', 'items-center', 'gap-2', 'rounded-xl', 'px-3', 'py-1.5', 'text-sm', 'transition')
      expect(groupsLink).toHaveClass('text-muted-foreground', 'hover:text-foreground', 'hover:bg-accent/50')
    })

    it('has correct styling for active navigation links', async () => {
      mockUsePathname.mockReturnValue('/groups')
      
      await act(async () => {
        renderWithProviders(<Navbar />)
      })
      
      const groupsLink = screen.getByRole('link', { name: /groups/i })
      expect(groupsLink).toHaveClass('bg-white', 'text-black', 'shadow-sm')
    })

    it('has responsive text visibility for navigation links', async () => {
      await act(async () => {
        renderWithProviders(<Navbar />)
      })
      
      const homeLink = screen.getByRole('link', { name: /home/i })
      const textSpan = homeLink.querySelector('span')
      expect(textSpan).toHaveClass('hidden', 'sm:inline')
    })
  })

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      await act(async () => {
        renderWithProviders(<Navbar />)
      })
      
      const { container } = renderWithProviders(<Navbar />)
      await testAccessibility(container)
    })

    it('has proper ARIA attributes for active links', async () => {
      mockUsePathname.mockReturnValue('/library')
      
      await act(async () => {
        renderWithProviders(<Navbar />)
      })
      
      const libraryLink = screen.getByRole('link', { name: /library/i })
      expect(libraryLink).toHaveAttribute('aria-current', 'page')
    })

    it('has proper navigation landmark', async () => {
      await act(async () => {
        renderWithProviders(<Navbar />)
      })
      
      const nav = screen.getByRole('navigation')
      expect(nav).toBeInTheDocument()
    })

    it('has proper link semantics', async () => {
      await act(async () => {
        renderWithProviders(<Navbar />)
      })
      
      const links = screen.getAllByRole('link')
      expect(links).toHaveLength(6) // 5 nav links + 1 brand link
      
      links.forEach(link => {
        expect(link).toHaveAttribute('href')
        expect(link.tagName).toBe('A')
      })
    })
  })

  describe('User Interactions', () => {
    it('handles navigation link clicks', async () => {
      await act(async () => {
        renderWithProviders(<Navbar />)
      })
      
      const groupsLink = screen.getByRole('link', { name: /groups/i })
      
      // In a real test, you might want to mock Next.js router navigation
      // For now, we just verify the link is clickable
      expect(groupsLink).toBeInTheDocument()
      expect(groupsLink).toHaveAttribute('href', '/groups')
    })

    it('maintains focus management', async () => {
      await act(async () => {
        renderWithProviders(<Navbar />)
      })
      
      const homeLink = screen.getByRole('link', { name: /home/i })
      
      await userInteractions.click(homeLink)
      
      // Verify the link is still accessible after interaction
      expect(homeLink).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles unknown paths gracefully', async () => {
      mockUsePathname.mockReturnValue('/unknown-path')
      
      await act(async () => {
        renderWithProviders(<Navbar />)
      })
      
      // No links should be active
      const links = screen.getAllByRole('link')
      const activeLinks = links.filter(link => link.hasAttribute('aria-current'))
      expect(activeLinks).toHaveLength(0)
    })

    it('handles empty pathname', async () => {
      mockUsePathname.mockReturnValue('')
      
      await act(async () => {
        renderWithProviders(<Navbar />)
      })
      
      // Should still render without errors
      expect(screen.getByText('Vybe')).toBeInTheDocument()
    })

    it('handles null pathname gracefully', async () => {
      mockUsePathname.mockReturnValue(null)
      
      await act(async () => {
        renderWithProviders(<Navbar />)
      })
      
      // Should still render without errors
      expect(screen.getByText('Vybe')).toBeInTheDocument()
    })
  })
})
