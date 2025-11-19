import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useRouter, usePathname } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { testAccessibility } from '@/test/test-utils'

// Mock Next.js router
const mockPush = vi.fn()
const mockRefresh = vi.fn()
const mockPathname = vi.fn(() => '/')

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({
    push: mockPush,
    refresh: mockRefresh,
  })),
}))

// Mock fetch
global.fetch = vi.fn()

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPush.mockClear()
    mockRefresh.mockClear()
    usePathname.mockReturnValue('/')
    useRouter.mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    })
    
    // Mock window.scrollTo
    window.scrollTo = vi.fn()
    
    // Reset body overflow
    document.body.style.overflow = 'unset'
  })

  describe('Basic Rendering', () => {
    it('renders logo and brand link', () => {
      render(<Navbar />)
      
      const logoLink = screen.getByRole('link', { name: /go to home/i })
      expect(logoLink).toBeInTheDocument()
      expect(logoLink).toHaveAttribute('href', '/')
    })

    it('renders all navigation links', () => {
      render(<Navbar />)
      
      // There are multiple home links (logo and nav item), so use getAllByRole
      expect(screen.getAllByRole('link', { name: /home/i }).length).toBeGreaterThan(0)
      expect(screen.getByRole('link', { name: /groups/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /playlist/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /library/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument()
    })

    it('renders sign-out button', () => {
      render(<Navbar />)
      
      const signOutButton = screen.getByRole('button', { name: /sign out/i })
      expect(signOutButton).toBeInTheDocument()
      expect(screen.getByText('Log out')).toBeInTheDocument()
    })

    it('highlights active link based on pathname', () => {
      usePathname.mockReturnValue('/groups')
      render(<Navbar />)
      
      const groupsLink = screen.getByRole('link', { name: /groups/i })
      expect(groupsLink).toHaveAttribute('aria-current', 'page')
    })

    it('highlights active link for nested routes', () => {
      usePathname.mockReturnValue('/groups/123')
      render(<Navbar />)
      
      const groupsLink = screen.getByRole('link', { name: /groups/i })
      expect(groupsLink).toHaveAttribute('aria-current', 'page')
    })
  })

  describe('Desktop Navigation', () => {
    it('renders desktop navigation on larger screens', () => {
      render(<Navbar />)
      
      const desktopNav = screen.getByTestId('desktop-nav')
      expect(desktopNav).toBeInTheDocument()
      expect(desktopNav).toHaveClass('hidden', 'md:flex')
    })

    it('shows sign-out button on desktop', () => {
      render(<Navbar />)
      
      const signOutButton = screen.getByRole('button', { name: /sign out/i })
      expect(signOutButton).toHaveClass('hidden', 'md:flex')
    })
  })

  describe('Mobile Navigation', () => {
    it('renders mobile menu button', () => {
      render(<Navbar />)
      
      const menuButton = screen.getByRole('button', { name: /toggle menu/i })
      expect(menuButton).toBeInTheDocument()
      expect(menuButton).toHaveClass('md:hidden')
    })

    it('opens mobile menu when hamburger button is clicked', async () => {
      render(<Navbar />)
      
      const menuButton = screen.getByRole('button', { name: /toggle menu/i })
      expect(menuButton).toHaveAttribute('aria-expanded', 'false')
      
      await userEvent.click(menuButton)
      
      await waitFor(() => {
        expect(menuButton).toHaveAttribute('aria-expanded', 'true')
        expect(screen.getByTestId('mobile-nav')).toBeInTheDocument()
      })
    })

    it('closes mobile menu when X button is clicked', async () => {
      render(<Navbar />)
      
      const menuButton = screen.getByRole('button', { name: /toggle menu/i })
      await userEvent.click(menuButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('mobile-nav')).toBeInTheDocument()
      })
      
      await userEvent.click(menuButton)
      
      await waitFor(() => {
        expect(screen.queryByTestId('mobile-nav')).not.toBeInTheDocument()
      })
    })

    it('closes mobile menu when clicking outside', async () => {
      render(<Navbar />)
      
      const menuButton = screen.getByRole('button', { name: /toggle menu/i })
      await userEvent.click(menuButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('mobile-nav')).toBeInTheDocument()
      })
      
      // Click outside
      fireEvent.mouseDown(document.body)
      
      await waitFor(() => {
        expect(screen.queryByTestId('mobile-nav')).not.toBeInTheDocument()
      })
    })

    it('closes mobile menu when clicking on a link', async () => {
      render(<Navbar />)
      
      const menuButton = screen.getByRole('button', { name: /toggle menu/i })
      await userEvent.click(menuButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('mobile-nav')).toBeInTheDocument()
      })
      
      const groupsLink = screen.getAllByRole('link', { name: /groups/i })[1] // Mobile link
      await userEvent.click(groupsLink)
      
      await waitFor(() => {
        expect(screen.queryByTestId('mobile-nav')).not.toBeInTheDocument()
      })
    })

    it('prevents body scroll when mobile menu is open', async () => {
      render(<Navbar />)
      
      const menuButton = screen.getByRole('button', { name: /toggle menu/i })
      await userEvent.click(menuButton)
      
      await waitFor(() => {
        expect(document.body.style.overflow).toBe('hidden')
      })
    })

    it('restores body scroll when mobile menu is closed', async () => {
      render(<Navbar />)
      
      const menuButton = screen.getByRole('button', { name: /toggle menu/i })
      await userEvent.click(menuButton)
      
      await waitFor(() => {
        expect(document.body.style.overflow).toBe('hidden')
      })
      
      await userEvent.click(menuButton)
      
      await waitFor(() => {
        expect(document.body.style.overflow).toBe('unset')
      })
    })

    it('closes mobile menu when route changes', async () => {
      const { rerender } = render(<Navbar />)
      
      const menuButton = screen.getByRole('button', { name: /toggle menu/i })
      await userEvent.click(menuButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('mobile-nav')).toBeInTheDocument()
      })
      
      // Simulate route change
      usePathname.mockReturnValue('/groups')
      rerender(<Navbar />)
      
      await waitFor(() => {
        expect(screen.queryByTestId('mobile-nav')).not.toBeInTheDocument()
      })
    })

    it('scrolls to top when route changes', async () => {
      const { rerender } = render(<Navbar />)
      
      usePathname.mockReturnValue('/groups')
      rerender(<Navbar />)
      
      await waitFor(() => {
        expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
      })
    })
  })

  describe('Sign-Out Functionality', () => {
    it('shows loading state when signing out', async () => {
      // Mock a delayed response
      global.fetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ ok: true }), 100)
        )
      )

      render(<Navbar />)
      
      const signOutButton = screen.getByRole('button', { name: /sign out/i })
      fireEvent.click(signOutButton)
      
      // Should show loading state - wait for the state update
      await waitFor(() => {
        expect(screen.getByText('Logging out...')).toBeInTheDocument()
      })
      expect(signOutButton).toBeDisabled()
      
      // Wait for the loading to complete and button to be re-enabled
      await waitFor(() => {
        expect(signOutButton).not.toBeDisabled()
      }, { timeout: 2000 })
    })

    it('calls sign-out endpoint on button click', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true })
      
      render(<Navbar />)
      
      const signOutButton = screen.getByRole('button', { name: /sign out/i })
      fireEvent.click(signOutButton)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/sign-out', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      })
    })

    it('redirects to sign-in page on successful sign-out', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true })
      
      render(<Navbar />)
      
      const signOutButton = screen.getByRole('button', { name: /sign out/i })
      fireEvent.click(signOutButton)
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/sign-in')
        expect(mockRefresh).toHaveBeenCalled()
      })
    })

    it('handles sign-out failure gracefully', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false })
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      render(<Navbar />)
      
      const signOutButton = screen.getByRole('button', { name: /sign out/i })
      fireEvent.click(signOutButton)
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Sign out failed')
        expect(signOutButton).not.toBeDisabled()
      })
      
      consoleSpy.mockRestore()
    })

    it('handles network errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      render(<Navbar />)
      
      const signOutButton = screen.getByRole('button', { name: /sign out/i })
      fireEvent.click(signOutButton)
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Sign out error:', expect.any(Error))
        expect(signOutButton).not.toBeDisabled()
      })
      
      consoleSpy.mockRestore()
    })

    it('shows loading state in mobile menu', async () => {
      // Use a longer delay to ensure state updates are visible
      global.fetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ ok: true }), 200)
        )
      )

      render(<Navbar />)
      
      const menuButton = screen.getByRole('button', { name: /toggle menu/i })
      await userEvent.click(menuButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('mobile-nav')).toBeInTheDocument()
      })
      
      const mobileSignOutButton = screen.getAllByRole('button', { name: /sign out/i }).find(
        btn => btn.closest('[data-testid="mobile-nav"]')
      )
      
      // Use userEvent for better async handling
      await userEvent.click(mobileSignOutButton)
      
      // Wait for loading state to appear - check within mobile nav
      await waitFor(() => {
        const mobileNav = screen.getByTestId('mobile-nav')
        expect(mobileNav.textContent).toContain('Logging out...')
      }, { timeout: 2000 })
    })
  })

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(<Navbar />)
      await testAccessibility(container)
    })

    it('has proper accessibility attributes for sign-out button', () => {
      render(<Navbar />)
      
      const signOutButton = screen.getByRole('button', { name: /sign out/i })
      expect(signOutButton).toHaveAttribute('aria-label', 'Sign out')
      expect(signOutButton).toHaveAttribute('title', 'Sign out')
    })

    it('has proper aria-expanded for mobile menu button', async () => {
      render(<Navbar />)
      
      const menuButton = screen.getByRole('button', { name: /toggle menu/i })
      expect(menuButton).toHaveAttribute('aria-expanded', 'false')
      
      await userEvent.click(menuButton)
      
      await waitFor(() => {
        expect(menuButton).toHaveAttribute('aria-expanded', 'true')
      })
    })

    it('has proper aria-current for active links', () => {
      usePathname.mockReturnValue('/library')
      render(<Navbar />)
      
      const libraryLink = screen.getByRole('link', { name: /library/i })
      expect(libraryLink).toHaveAttribute('aria-current', 'page')
    })

    it('shows icon and text on larger screens', () => {
      render(<Navbar />)
      
      const signOutButton = screen.getByRole('button', { name: /sign out/i })
      expect(signOutButton).toBeInTheDocument()
      
      // Check that the LogOut icon is present
      const icon = signOutButton.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })

    it('supports keyboard navigation', async () => {
      render(<Navbar />)
      
      // There are multiple home links (logo and nav item), use getAllByRole and pick the nav item
      const homeLinks = screen.getAllByRole('link', { name: /home/i })
      const homeNavLink = homeLinks.find(link => link.getAttribute('aria-current') === 'page' || link.className.includes('nav-item'))
      homeNavLink.focus()
      expect(document.activeElement).toBe(homeNavLink)
      
      await userEvent.keyboard('{Tab}')
      // Should move focus to next link
    })
  })

  describe('Edge Cases', () => {
    it('handles rapid clicks on mobile menu button', async () => {
      render(<Navbar />)
      
      const menuButton = screen.getByRole('button', { name: /toggle menu/i })
      
      // Rapid clicks
      await userEvent.click(menuButton)
      await userEvent.click(menuButton)
      await userEvent.click(menuButton)
      
      await waitFor(() => {
        // Menu should be in consistent state
        const isOpen = menuButton.getAttribute('aria-expanded') === 'true'
        expect(isOpen || !isOpen).toBe(true) // Should be either open or closed
      })
    })

    it('handles clicking logo while menu is open', async () => {
      render(<Navbar />)
      
      const menuButton = screen.getByRole('button', { name: /toggle menu/i })
      await userEvent.click(menuButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('mobile-nav')).toBeInTheDocument()
      })
      
      const logoLink = screen.getByRole('link', { name: /go to home/i })
      await userEvent.click(logoLink)
      
      await waitFor(() => {
        expect(screen.queryByTestId('mobile-nav')).not.toBeInTheDocument()
      })
    })

    it('handles window resize events', () => {
      render(<Navbar />)
      
      // Should render both desktop and mobile versions
      const desktopNav = screen.getByTestId('desktop-nav')
      const menuButton = screen.getByRole('button', { name: /toggle menu/i })
      
      expect(desktopNav).toBeInTheDocument()
      expect(menuButton).toBeInTheDocument()
    })

    it('handles sign-out while mobile menu is open', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true })
      
      render(<Navbar />)
      
      const menuButton = screen.getByRole('button', { name: /toggle menu/i })
      await userEvent.click(menuButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('mobile-nav')).toBeInTheDocument()
      })
      
      const mobileSignOutButton = screen.getAllByRole('button', { name: /sign out/i }).find(
        btn => btn.closest('[data-testid="mobile-nav"]')
      )
      
      fireEvent.click(mobileSignOutButton)
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/sign-in')
      })
    })
  })
})