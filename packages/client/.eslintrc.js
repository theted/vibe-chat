module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
  ],
  ignorePatterns: ["dist", ".eslintrc.js"],
  parser: "@typescript-eslint/parser",
  plugins: ["react-refresh"],
  rules: {
    // General
    "no-unused-vars": "warn",
    "no-console": "warn",
    "prefer-const": "error",
    "no-var": "error",

    // React specific
    "react/prop-types": "off", // Using TypeScript for type checking
    "react/react-in-jsx-scope": "off", // React 17+ auto import
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "react-refresh/only-export-components": [
      "warn",
      { allowConstantExport: true },
    ],

    // Code style
    quotes: ["warn", "single"],
    semi: ["warn", "always"],
    indent: ["warn", 2],
    "comma-dangle": ["warn", "never"],
    "object-curly-spacing": ["warn", "always"],
    "array-bracket-spacing": ["warn", "never"],

    // Best practices
    eqeqeq: "error",
    "no-debugger": "warn",
    "no-duplicate-imports": "error",
    "no-unused-expressions": "warn",
  },
  settings: {
    react: {
      version: "detect",
    },
  },
};
