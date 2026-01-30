module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // General
    'no-unused-vars': 'warn',
    'no-console': 'off', // Console is fine in Node.js for logging
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Code style
    'quotes': ['warn', 'single'],
    'semi': ['warn', 'always'],
    'indent': ['warn', 2],
    'comma-dangle': ['warn', 'never'],
    'object-curly-spacing': ['warn', 'always'],
    'array-bracket-spacing': ['warn', 'never'],
    
    // Best practices
    'eqeqeq': 'error',
    'no-debugger': 'warn',
    'no-duplicate-imports': 'error',
    'no-unused-expressions': 'warn',
    'no-undef': 'error',
    
    // Node.js specific
    'no-process-exit': 'warn',
    'no-path-concat': 'error'
  }
};