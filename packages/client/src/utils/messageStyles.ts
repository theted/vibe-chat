/**
 * Style helpers for ChatMessage component - maps sender types to Tailwind classes and animation variants
 */

import type { Variants } from "framer-motion";

type SenderType = "user" | "ai" | "system" | string;

const SENDER_LABEL_BASE =
  "text-md font-bold mb-3 flex items-center gap-2 transition-colors";

const SENDER_LABEL_CLASSES: Record<string, string> = {
  user: `${SENDER_LABEL_BASE} text-white/90 decoration-white/60 dark:text-primary-100 dark:decoration-primary-200/70`,
  ai: `${SENDER_LABEL_BASE} text-slate-700 dark:text-slate-200 `,
  system: `${SENDER_LABEL_BASE} text-amber-800 decoration-amber-500 dark:text-amber-200 dark:decoration-amber-400`,
};

const SENDER_LABEL_DEFAULT = `${SENDER_LABEL_BASE} text-slate-600 decoration-slate-400 dark:text-slate-300 dark:decoration-slate-500`;

export const getSenderLabelClasses = (senderType: SenderType): string =>
  SENDER_LABEL_CLASSES[senderType] || SENDER_LABEL_DEFAULT;

const MESSAGE_STYLES: Record<string, string> = {
  user: "ml-auto bg-primary-500 text-white border border-primary-400 shadow-sm dark:border-primary-400/60",
  ai: "mr-auto bg-white border border-slate-200 shadow-sm dark:bg-slate-900/80 dark:border-slate-700 dark:text-slate-100",
  system:
    "mx-auto bg-amber-50 border border-amber-200 text-amber-800 text-center shadow-sm dark:bg-amber-500/10 dark:border-amber-400/40 dark:text-amber-200",
};

const MESSAGE_STYLE_DEFAULT =
  "bg-gray-100 border border-gray-200 shadow-sm dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-100";

export const getMessageStyles = (senderType: SenderType): string =>
  MESSAGE_STYLES[senderType] || MESSAGE_STYLE_DEFAULT;

export const getMaxWidth = (senderType: SenderType): string =>
  senderType === "ai" ? "max-w-[95%]" : "max-w-[85%]";

const BASE_ANIMATION: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

export const getAnimationVariants = (senderType: SenderType): Variants => {
  switch (senderType) {
    case "user":
      return {
        ...BASE_ANIMATION,
        hidden: { ...(BASE_ANIMATION.hidden as object), x: 15 },
      };
    case "ai":
      return {
        ...BASE_ANIMATION,
        hidden: { ...(BASE_ANIMATION.hidden as object), x: -15 },
      };
    case "system":
      return {
        ...BASE_ANIMATION,
        visible: {
          ...(BASE_ANIMATION.visible as object),
          transition: {
            ...(BASE_ANIMATION.visible as { transition: object }).transition,
            duration: 0.6,
            ease: "easeOut",
          },
        },
      };
    default:
      return BASE_ANIMATION;
  }
};

export const getTimestampClasses = (senderType: SenderType): string => {
  switch (senderType) {
    case "user":
      return "text-primary-200 dark:text-primary-300/80";
    case "ai":
      return "text-slate-400 dark:text-slate-500";
    case "system":
      return "text-amber-600 dark:text-amber-200";
    default:
      return "text-slate-400 dark:text-slate-500";
  }
};
