/**
 * useTheme Hook - Manages theme state, persistence, and DOM application
 */

import { useState, useEffect, useCallback } from "react";
import { getStorageItem, setStorageItem } from "@/utils/storage";
import { STORAGE_KEYS } from "@/constants/storage";
import type { Theme } from "@/types";

// Dark is the house style; light is only used once someone picks it
const DEFAULT_THEME: Theme = "dark";

const getInitialTheme = (): Theme => {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const stored = getStorageItem(STORAGE_KEYS.THEME);
  return stored === "dark" || stored === "light" ? stored : DEFAULT_THEME;
};

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.dataset.theme = theme;
    setStorageItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return { theme, setTheme, toggleTheme };
};
