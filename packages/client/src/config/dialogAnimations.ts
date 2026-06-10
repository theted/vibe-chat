/**
 * Framer-motion presets for the AI selection dialog.
 */

import type { Transition } from "framer-motion";

export const DIALOG_SPRING: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 28,
  duration: 0.2,
};

export const SLIDE_VARIANTS = {
  list: {
    enter: { opacity: 0, x: -18 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -18 },
  },
  detail: {
    enter: { opacity: 0, x: 18 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 18 },
  },
};
