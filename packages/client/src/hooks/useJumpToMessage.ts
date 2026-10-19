/**
 * useJumpToMessage - scrolls a loaded message into view and flashes it, so
 * clicking a reply's quote shows what it answers.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { messageElementId } from "@/utils/messageAnchor";

const FLASH_DURATION_MS = 1_600;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const useJumpToMessage = () => {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => () => clearTimeout(flashTimeoutRef.current), []);

  const jumpToMessage = useCallback((messageId: string) => {
    const element = document.getElementById(messageElementId(messageId));
    if (!element) return;

    element.scrollIntoView?.({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "center",
    });
    setHighlightedId(messageId);
    clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(
      () => setHighlightedId(null),
      FLASH_DURATION_MS,
    );
  }, []);

  return { highlightedId, jumpToMessage };
};
