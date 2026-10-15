/**
 * ThemeContext
 * Provides dark/light theme state and toggle helper.
 */

import { createContext } from "react";
import type { ThemeContextValue } from "@/types";

export const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
});
