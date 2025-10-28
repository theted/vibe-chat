module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
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
    'no-console': 'off', // Console is needed for debugging
    'no-unused-vars': 'warn',
  },
  overrides: [
    // React files
    {
      files: ['packages/client/**/*.{js,jsx}'],
      extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
      ],
      plugins: ['react', 'react-hooks'],
      env: {
        browser: true,
      },
      settings: {
        react: {
          version: 'detect'
        }
      },
      rules: {
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
      }
    },
    // Node.js files
    {
      files: ['packages/server/**/*.js', 'packages/ai-chat-core/**/*.js'],
      env: {
        node: true,
        browser: false,
      }
    }
  ]
};