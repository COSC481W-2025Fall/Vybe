//Imported to support userEvent
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { axe } from 'jest-axe'
import LibraryPage from '@/app/library/page'
import {
  renderWithProviders,
  testAccessibility,
  userInteractions,
  mockFetch,
  createMockUser,
  createMockRecentlyPlayed,
  testData
} from '@/test/test-utils'


// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabaseBrowser: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { 
          user: { 
            id: 'test-user',
            app_metadata: { provider: 'spotify' },
            user_metadata: {
              full_name: 'Test User',
              avatar_url: 'https://example.com/avatar.jpg'
            },
            email: 'test@example.com'
          } 
        },
        error: null
      })
    }
  })
}))

// Mock fetch for API calls
global.fetch = vi.fn()

describe('LibraryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the library page with under development message', () => {
    render(<LibraryPage />)

    expect(screen.getByText('Library')).toBeInTheDocument()
    expect(screen.getByText('This page is under development')).toBeInTheDocument()
    expect(screen.getByText('Coming soon...')).toBeInTheDocument()
  })

  it('has proper heading structure', () => {
    render(<LibraryPage />)

    const mainHeading = screen.getByRole('heading', { level: 1 })
    expect(mainHeading).toHaveTextContent('Library')
  })

  it('has no accessibility violations', async () => {
    const { container } = render(<LibraryPage />)
    await testAccessibility(container)
  })
})
