/**
 * useStickToBottom - keeps the latest message in view when the transcript's
 * box shrinks, e.g. a notice appearing above the composer. Without it the
 * scroll position stays put and the last lines slide under the footer.
 */

import { useEffect, type RefObject } from "react";

export const useStickToBottom = (
  containerRef: RefObject<HTMLDivElement | null>,
  endRef: RefObject<HTMLDivElement | null>,
  /** False while the reader has scrolled up to look at older messages */
  isAtBottom: boolean,
) => {
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isAtBottom || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(() =>
      endRef.current?.scrollIntoView({ behavior: "instant", block: "end" }),
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, endRef, isAtBottom]);
};
