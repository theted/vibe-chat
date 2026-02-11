/**
 * useScrollToBottom Hook - Manages scroll-to-bottom button visibility and behavior
 */

import { useState, useEffect, useCallback, type RefObject } from "react";

const NEAR_BOTTOM_THRESHOLD = 100;
const SCROLL_BUTTON_HIDE_DELAY_MS = 500;

export const useScrollToBottom = (
  containerRef: RefObject<HTMLDivElement | null>,
  messagesEndRef: RefObject<HTMLDivElement | null>,
) => {
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Show/hide scroll button based on scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom =
        scrollTop + clientHeight >= scrollHeight - NEAR_BOTTOM_THRESHOLD;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [containerRef]);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => setShowScrollButton(false), SCROLL_BUTTON_HIDE_DELAY_MS);
    }
  }, [messagesEndRef]);

  return { showScrollButton, scrollToBottom };
};
