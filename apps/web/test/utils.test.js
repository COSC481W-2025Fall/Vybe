import { describe, it, expect } from 'vitest'
import { testHelpers } from './helpers.js'

// Simple utility function for testing
function formatTimeAgo(dateString) {
  const date = new Date(dateString)
  const diff = Math.max(0, Date.now() - date.getTime())
  const mins = Math.floor(diff / 60000)
  
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  const weeks = Math.floor(days / 7)
  return `${weeks} week${weeks === 1 ? '' : 's'} ago`
}

describe('Utility Functions', () => {
  describe('formatTimeAgo', () => {
    // Use test cases from helpers for better maintainability
    const testCases = testHelpers.generateTimeAgoTestCases()
    
    testCases.forEach(({ minutes, expected }) => {
      it(`formats ${minutes} minutes correctly as "${expected}"`, () => {
        const now = new Date()
        const testTime = new Date(now.getTime() - minutes * 60 * 1000)
        
        expect(formatTimeAgo(testTime.toISOString())).toBe(expected)
      })
    })

    it('handles edge case of exactly 0 minutes', () => {
      const now = new Date()
      expect(formatTimeAgo(now.toISOString())).toBe('0 mins ago')
    })

    it('handles future dates gracefully', () => {
      const future = new Date(Date.now() + 60000) // 1 minute in future
      expect(formatTimeAgo(future.toISOString())).toBe('0 mins ago')
    })
  })
})
