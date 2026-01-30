# Test Suite for AI Chat Realtime Client

This directory contains comprehensive unit tests for the AI Chat Realtime client application.

## Test Coverage

The test suite covers the following files that were modified in the current branch:

### Components
- **ChatView.jsx** - Main chat interface component
- **LoginView.jsx** - User login/authentication interface
- **Icon.jsx** - Icon rendering component with useMemo optimization

### Utilities
- **utils/ai.js** - AI utility functions for emoji resolution and mention mapping

### Constants
- **constants/chat.js** - Chat-related constants and mappings

## Running Tests

### Install Dependencies
```bash
cd ai-chat-realtime/packages/client
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Run Tests with UI
```bash
npm run test:ui
```

### Generate Coverage Report
```bash
npm run test:coverage
```

## Test Framework

- **Vitest**: Fast unit test framework for Vite projects
- **React Testing Library**: Testing utilities for React components
- **@testing-library/user-event**: User interaction simulation
- **@testing-library/jest-dom**: Custom Jest matchers for DOM assertions

## Test Structure

Each test file follows this structure:
1. **Imports**: Required dependencies and mocks
2. **Mocks**: Mock implementations of dependencies
3. **Test Suites**: Organized by functionality
4. **Test Cases**: Individual test scenarios

## Coverage Goals

- Pure functions: 100% coverage
- React components: High coverage of props, interactions, and edge cases
- Constants: Validation of all exported values
- Edge cases: Null, undefined, empty values, and error conditions

## Best Practices

1. **Descriptive Names**: Test names clearly describe what they verify
2. **Arrange-Act-Assert**: Tests follow AAA pattern
3. **Isolation**: Each test is independent and can run in any order
4. **Mocking**: External dependencies are properly mocked
5. **Cleanup**: Resources are cleaned up after each test