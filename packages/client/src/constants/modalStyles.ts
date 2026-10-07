/**
 * Shared Tailwind class constants for modal dialogs.
 */

export const MODAL_BACKDROP_CLASSES =
  "absolute inset-0 bg-black/55 transition-opacity duration-200 ease-out";

export const MODAL_PANEL_CLASSES =
  "relative w-full rounded-2xl border border-line bg-surface shadow-2xl shadow-black/40 transition-all duration-200 ease-out";

export const modalPanelState = (isOpen: boolean): string =>
  isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2";

export const MODAL_TITLE_CLASSES = "font-display text-lg font-bold text-fg";

export const MODAL_CLOSE_BUTTON_CLASSES =
  "flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-fg";
