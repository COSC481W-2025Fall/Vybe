import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
  })),
}))

// Mock fetch
global.fetch = vi.fn()

describe('Navbar Sign-Out Functionality', () => {
  const mockPush = vi.fn()
  const mockRefresh = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useRouter.mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    })
  })

  it('renders sign-out button', () => {
    render(<Navbar />)
    
    const signOutButton = screen.getByRole('button', { name: /sign out/i })
    expect(signOutButton).toBeInTheDocument()
    expect(screen.getByText('Sign out')).toBeInTheDocument()
  })

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
    
    // Should show loading state
    expect(screen.getByText('Signing out...')).toBeInTheDocument()
    expect(signOutButton).toBeDisabled()
    
    // Wait for the loading to complete and button to be re-enabled
    await waitFor(() => {
      expect(signOutButton).not.toBeDisabled()
    })
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

  it('has proper accessibility attributes', () => {
    render(<Navbar />)
    
    const signOutButton = screen.getByRole('button', { name: /sign out/i })
    expect(signOutButton).toHaveAttribute('aria-label', 'Sign out')
    expect(signOutButton).toHaveAttribute('title', 'Sign out')
  })

  it('shows icon and text on larger screens', () => {
    render(<Navbar />)
    
    const signOutButton = screen.getByRole('button', { name: /sign out/i })
    expect(signOutButton).toBeInTheDocument()
    
    // Check that the LogOut icon is present
    const icon = signOutButton.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })
})