/**
 * useModal Hook - Manages modal open/close state with animation and Escape key handling
 */

import { useState, useEffect, useCallback } from "react";

interface UseModalReturn {
  isOpen: boolean;
  isVisible: boolean;
  open: () => void;
  close: () => void;
}

const ANIMATION_DURATION_MS = 200;

/**
 * Manages modal visibility with exit animation delay and Escape key dismissal.
 */
export const useModal = (initialOpen = false): UseModalReturn => {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isVisible, setIsVisible] = useState(initialOpen);

  // Delay hiding until exit animation completes
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else if (isVisible) {
      const timeout = window.setTimeout(() => {
        setIsVisible(false);
      }, ANIMATION_DURATION_MS);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [isOpen, isVisible]);

  // Dismiss on Escape key
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, isVisible, open, close };
};
