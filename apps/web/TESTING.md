# Testing Setup

This project uses a comprehensive testing framework with both unit tests and end-to-end tests.

## Testing Stack

- **Vitest**: Fast unit testing framework with React Testing Library
- **Playwright**: End-to-end testing for browser automation
- **React Testing Library**: Component testing utilities
- **Jest DOM**: Custom matchers for DOM testing

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test

# Run tests once (CI mode)
npm run test:run

# Open Vitest UI
npm run test:ui
```

### End-to-End Tests

```bash
# Run Playwright tests
npm run test:e2e

# Run Playwright tests in headed mode
npm run test:e2e:headed

# Run Playwright tests in debug mode
npm run test:e2e:debug
```

### All Tests

```bash
# Run both unit and E2E tests
npm run test:all
```

## Test Structure

```text
apps/web/
├── components/
│   └── __tests__/           # Component unit tests
│       ├── Navbar.test.jsx
│       └── LibraryView.test.jsx
├── test/
│   ├── setup.ts             # Test setup configuration
│   ├── helpers.js            # Test helper utilities
│   └── utils.test.js        # Utility function tests
├── tests/
│   └── e2e/                 # End-to-end tests
│       └── app.spec.ts
├── vitest.config.ts         # Vitest configuration
└── playwright.config.ts     # Playwright configuration
```

## Writing Tests

### Unit Test Guidelines

- Use `describe` and `it` blocks for test organization
- Import testing utilities from `@testing-library/react`
- Mock external dependencies using `vi.mock()`
- Test component rendering, user interactions, and state changes

### End-to-End Test Guidelines

- Use Playwright's `test` and `expect` functions
- Test complete user workflows
- Verify page navigation and interactions
- Test responsive design across different viewports

## Configuration

### Vitest Configuration

- Configured with React plugin and jsdom environment
- Includes path aliases for `@/` imports
- Setup file includes Jest DOM matchers and act warning suppression
- Enhanced ESM compatibility with esbuild configuration
- CSS processing enabled for component testing

### Playwright Configuration

- Configured for Chrome, Firefox, and Safari
- Automatically starts dev server before tests with 2-minute timeout
- Includes trace collection for debugging
- Robust error handling with stdout/stderr piping

## Demo Tests Included

1. **Navbar Component**: Tests brand rendering, navigation links, and active states
2. **LibraryView Component**: Tests Spotify integration, tab switching, and data loading
3. **Utility Functions**: Tests time formatting helper functions
4. **E2E App Flow**: Tests homepage, navigation, and responsive design

## Test Results & Performance

- **Unit Tests**: 20 tests passing (comprehensive component and utility coverage)
- **E2E Tests**: 4 comprehensive tests covering navigation and responsive design
- **Performance**: Tests run efficiently with proper mocking and act warning suppression
- **Maintainability**: Centralized test helpers and parameterized test cases

## Best Practices

- Write tests that focus on user behavior rather than implementation details
- Use meaningful test descriptions
- Mock external API calls and dependencies
- Test both happy paths and error scenarios
- Keep tests isolated and independent
- Use data-testid attributes for reliable element selection when needed
- Leverage test helpers for consistent mock data and selectors
- Use parameterized tests for comprehensive coverage of utility functions

## Recent Improvements

- ✅ Fixed all markdown linting issues (15 → 0)
- ✅ Enhanced test configuration with better ESM compatibility
- ✅ Added act warning suppression for cleaner test output
- ✅ Improved E2E tests with proper wait states and network idle checks
- ✅ Created centralized test helpers for better maintainability
- ✅ Added comprehensive test scripts for different scenarios
- ✅ Enhanced utility tests with parameterized test cases
