/**
 * useAutoResizeTextarea — grows a textarea to fit its content whenever the
 * given value changes (max height is capped by the element's inline style).
 */

import { useEffect, type RefObject } from "react";

export const useAutoResizeTextarea = (
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  value: string,
) => {
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [textareaRef, value]);
};
