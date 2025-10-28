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
    'no-console': 'off', // Console logging is used for AI service debugging
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
    
    // Class and function best practices
    'no-useless-constructor': 'warn',
    'prefer-arrow-callback': 'warn',
    'arrow-spacing': 'warn',
    
    // Error handling
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'error'
  }
};