import '@testing-library/jest-dom'
import { beforeAll, afterAll } from 'vitest'

// Extend global type to include testUtils
declare global {
  var testUtils: {
    // Add any global test utilities here
  }
}

// Suppress React act warnings in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: An update to') &&
      args[0].includes('was not wrapped in act')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Global test utilities
global.testUtils = {
  // Add any global test utilities here
}