# Frontend Testing Guide

This document explains how to run and write tests for the Vybe frontend application.

## Test Structure

The frontend uses two testing frameworks:
- **Vitest** - Unit and component tests
- **Playwright** - End-to-end (E2E) tests

## Running Tests

### Install Dependencies
```bash
npm install
```

### All Tests
```bash
npm run test:all
```

### Unit Tests Only
```bash
npm test -- --run
```

### E2E Tests Only
```bash
npm run test:e2e
```

### Interactive Test UI
```bash
npm run test:ui
```

### E2E Tests with Browser
```bash
npm run test:e2e:headed
```

### Debug E2E Tests
```bash
npm run test:e2e:debug
```

## Test Files

### Unit Tests
- `components/__tests__/` - Component tests
- `test/` - Utility and helper tests

### E2E Tests
- `tests/e2e/` - End-to-end test scenarios

## Writing Tests

### Component Tests
```javascript
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import MyComponent from '../MyComponent'

test('renders component', () => {
  render(<MyComponent />)
  expect(screen.getByText('Hello')).toBeInTheDocument()
})
```

### E2E Tests
```javascript
import { test, expect } from '@playwright/test'

test('user can sign in', async ({ page }) => {
  await page.goto('/sign-in')
  await page.fill('[data-testid="email"]', 'test@example.com')
  await page.click('[data-testid="sign-in-button"]')
  await expect(page).toHaveURL('/dashboard')
})
```

## Test Configuration

### Vitest
- Configuration: `vitest.config.ts`
- Test utilities: `test/test-utils.jsx`
- Setup file: `test/setup.ts`

### Playwright
- Configuration: `playwright.config.ts`
- Test helpers: `test/helpers.js`

## Best Practices

### Component Testing
- Use `data-testid` attributes for reliable element selection
- Test user interactions, not implementation details
- Mock external dependencies
- Test accessibility with `jest-axe`

### E2E Testing
- Test critical user journeys
- Use page object pattern for complex flows
- Keep tests independent and isolated
- Use meaningful test descriptions

## Debugging Tests

### Unit Tests
- Use `console.log()` for debugging
- Run specific tests with `test.only()`
- Use `test.skip()` to temporarily skip tests

### E2E Tests
- Use `npm run test:e2e:debug` for step-by-step debugging
- Take screenshots with `await page.screenshot()`
- Use `await page.pause()` to pause execution

## CI/CD Integration

Tests run automatically in GitHub Actions:
- Unit tests run on every push and PR
- E2E tests run on every push and PR
- All tests must pass before deployment

## Troubleshooting

### Common Issues
- **Tests failing**: Check console output for error messages
- **E2E timeouts**: Increase timeout in `playwright.config.ts`
- **Component not found**: Verify `data-testid` attributes
- **Async issues**: Use `await` for async operations

### Getting Help
- Check test output in terminal
- Review test configuration files
- Look at existing test examples
- Check GitHub Actions logs for CI failures