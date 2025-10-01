import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { vi } from 'vitest'

// Extend expect with jest-axe matchers
expect.extend(toHaveNoViolations)

/**
 * Custom render function that includes common providers and utilities
 * @param {React.ReactElement} ui - The component to render
 * @param {Object} options - Additional options for rendering
 * @returns {Object} Render result with additional utilities
 */
export function renderWithProviders(ui, options = {}) {
  const {
    // Add any providers here in the future (e.g., theme, auth, etc.)
    ...renderOptions
  } = options

  const Wrapper = ({ children }) => {
    return (
      <div>
        {children}
      </div>
    )
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    // Add custom utilities here
  }
}

/**
 * Wraps async operations in act() to prevent React warnings
 * @param {Function} asyncFn - The async function to wrap
 * @returns {Promise} The result of the async function
 */
export async function actAsync(asyncFn) {
  return await act(async () => {
    return await asyncFn()
  })
}

/**
 * Waits for an element to appear and returns it
 * @param {string|RegExp} text - Text to find
 * @param {Object} options - Additional options for getByText
 * @returns {Promise<HTMLElement>} The found element
 */
export async function waitForElement(text, options = {}) {
  return await waitFor(() => {
    return screen.getByText(text, options)
  })
}

/**
 * Waits for an element to disappear
 * @param {string|RegExp} text - Text that should disappear
 * @param {Object} options - Additional options for queryByText
 * @returns {Promise<void>}
 */
export async function waitForElementToDisappear(text, options = {}) {
  return await waitFor(() => {
    expect(screen.queryByText(text, options)).not.toBeInTheDocument()
  })
}

/**
 * Mocks fetch with a default successful response
 * @param {Object} mockData - The data to return
 * @param {number} status - HTTP status code
 * @returns {Function} Mock function
 */
export function mockFetch(mockData = {}, status = 200) {
  const mockResponse = {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(mockData),
    text: () => Promise.resolve(JSON.stringify(mockData))
  }
  
  return vi.fn().mockResolvedValue(mockResponse)
}

/**
 * Mocks fetch with an error response
 * @param {string} errorMessage - Error message
 * @param {number} status - HTTP status code
 * @returns {Function} Mock function
 */
export function mockFetchError(errorMessage = 'Network Error', status = 500) {
  const mockResponse = {
    ok: false,
    status,
    json: () => Promise.reject(new Error(errorMessage)),
    text: () => Promise.resolve(errorMessage)
  }
  
  return vi.fn().mockResolvedValue(mockResponse)
}

/**
 * Creates a mock user for testing
 * @param {Object} overrides - User data overrides
 * @returns {Object} Mock user object
 */
export function createMockUser(overrides = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    display_name: 'Test User',
    images: [{ url: 'https://example.com/avatar.jpg' }],
    ...overrides
  }
}

/**
 * Creates mock Spotify track data
 * @param {Object} overrides - Track data overrides
 * @returns {Object} Mock track object
 */
export function createMockTrack(overrides = {}) {
  return {
    id: 'track-123',
    name: 'Test Song',
    artists: [{ name: 'Test Artist' }],
    album: {
      name: 'Test Album',
      images: [
        { url: 'https://example.com/cover-large.jpg', height: 640, width: 640 },
        { url: 'https://example.com/cover-medium.jpg', height: 300, width: 300 },
        { url: 'https://example.com/cover-small.jpg', height: 64, width: 64 }
      ]
    },
    ...overrides
  }
}

/**
 * Creates mock recently played item
 * @param {Object} overrides - Item data overrides
 * @returns {Object} Mock recently played item
 */
export function createMockRecentlyPlayed(overrides = {}) {
  return {
    track: createMockTrack(),
    played_at: '2024-01-01T12:00:00Z',
    ...overrides
  }
}

/**
 * Runs accessibility tests on a rendered component
 * @param {HTMLElement} container - The container element to test
 * @returns {Promise<Object>} Accessibility test results
 */
export async function testAccessibility(container) {
  const results = await axe(container)
  expect(results).toHaveNoViolations()
  return results
}

/**
 * Helper to simulate user interactions with proper act() wrapping
 */
export const userInteractions = {
  /**
   * Clicks an element with act() wrapping
   * @param {HTMLElement} element - Element to click
   * @returns {Promise<void>}
   */
  async click(element) {
    await actAsync(async () => {
      element.click()
    })
  },

  /**
   * Types text into an input with act() wrapping
   * @param {HTMLElement} input - Input element
   * @param {string} text - Text to type
   * @returns {Promise<void>}
   */
  async type(input, text) {
    await actAsync(async () => {
      input.focus()
      input.value = text
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
  },

  /**
   * Selects an option from a select element
   * @param {HTMLElement} select - Select element
   * @param {string} value - Value to select
   * @returns {Promise<void>}
   */
  async selectOption(select, value) {
    await actAsync(async () => {
      select.value = value
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
  }
}

/**
 * Common test data factories
 */
export const testData = {
  spotifyUser: () => createMockUser(),
  spotifyTrack: () => createMockTrack(),
  recentlyPlayed: () => createMockRecentlyPlayed(),
  playlist: (overrides = {}) => ({
    id: 'playlist-123',
    name: 'Test Playlist',
    description: 'A test playlist',
    images: [{ url: 'https://example.com/playlist-cover.jpg' }],
    tracks: { total: 10 },
    ...overrides
  })
}

// Re-export everything from @testing-library/react for convenience
export * from '@testing-library/react'
export { act } from '@testing-library/react'



