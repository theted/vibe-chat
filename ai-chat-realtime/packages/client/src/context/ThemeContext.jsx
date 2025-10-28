/**
 * ThemeContext
 * Provides dark/light theme state and toggle helper.
 */

import React, { createContext, useContext } from 'react';

export const ThemeContext = createContext({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {}
});

export const useTheme = () => useContext(ThemeContext);
