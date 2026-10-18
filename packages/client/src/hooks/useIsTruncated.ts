/**
 * useIsTruncated - whether a one-line `truncate` element is cutting its text
 * off. Rechecked when the text changes and whenever the element resizes.
 */

import { useLayoutEffect, useState, type RefObject } from "react";

export const useIsTruncated = (
  ref: RefObject<HTMLElement | null>,
  text: string,
): boolean => {
  const [isTruncated, setIsTruncated] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = () =>
      setIsTruncated(element.scrollWidth > element.clientWidth);
    measure();
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, text]);

  return isTruncated;
};
