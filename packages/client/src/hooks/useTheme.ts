/**
 * useTheme Hook - Manages theme state, persistence, and DOM application
 */

import { useState, useEffect, useCallback } from "react";
import { getStorageItem, setStorageItem } from "@/utils/storage";
import { STORAGE_KEYS } from "@/constants/storage";
import type { Theme } from "@/types";

const getInitialTheme = (): Theme => {
  if (typeof window === "undefined") return "light";
  const stored = getStorageItem(STORAGE_KEYS.THEME);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
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
