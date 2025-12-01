import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useRouter, usePathname } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { testAccessibility } from '@/test/test-utils'

// Mock Next.js router
const mockPush = vi.fn()
const mockRefresh = vi.fn()

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
    // Set pathname to dashboard by default so Navbar renders (it hides on '/' and '/sign-in')
    usePathname.mockReturnValue('/dashboard')
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
    })

    it('renders navigation links', () => {
      render(<Navbar />)
      
      expect(screen.getByRole('link', { name: /groups/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /library/i })).toBeInTheDocument()
    })

    it('highlights active link based on pathname', () => {
      usePathname.mockReturnValue('/groups')
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
    })
  })

  describe('Mobile Navigation', () => {
    it('renders mobile menu button', () => {
      render(<Navbar />)
      
      const menuButton = screen.getByRole('button', { name: /toggle menu/i })
      expect(menuButton).toBeInTheDocument()
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

    it('closes mobile menu when button is clicked again', async () => {
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

    it('prevents body scroll when mobile menu is open', async () => {
      render(<Navbar />)
      
      const menuButton = screen.getByRole('button', { name: /toggle menu/i })
      await userEvent.click(menuButton)
      
      await waitFor(() => {
        expect(document.body.style.overflow).toBe('hidden')
      })
    })
  })

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(<Navbar />)
      await testAccessibility(container)
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
  })

  describe('Theme Toggle', () => {
    it('renders theme toggle buttons', () => {
      render(<Navbar />)
      
      const themeButtons = screen.getAllByRole('button', { name: /toggle theme/i })
      expect(themeButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Logo', () => {
    it('displays Vybe brand name', () => {
      render(<Navbar />)
      
      expect(screen.getByText('Vybe')).toBeInTheDocument()
    })

    it('logo links to dashboard', () => {
      render(<Navbar />)
      
      const logoLink = screen.getByRole('link', { name: /go to home/i })
      expect(logoLink).toHaveAttribute('href', '/dashboard')
    })
  })

  describe('Navigation Structure', () => {
    it('has profile link', () => {
      render(<Navbar />)
      
      expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument()
    })

    it('has settings link', () => {
      render(<Navbar />)
      
      expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument()
    })

    it('has home links', () => {
      render(<Navbar />)
      
      const homeLinks = screen.getAllByRole('link', { name: /home/i })
      expect(homeLinks.length).toBeGreaterThan(0)
    })
  })
})
