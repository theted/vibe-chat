/**
 * Style constants for the participants side panel.
 */

export type PanelStyle = "dark" | "light";

export const PANEL_STYLE_STORAGE_KEY = "participants-panel-style";

export const PANEL_STYLES: Record<PanelStyle, string> = {
  // Dark: solid frosted — high contrast against the transparent main area
  dark: "bg-slate-900/75 backdrop-blur-md border-l border-slate-700/60 dark:bg-[rgba(0,18,28,0.85)] dark:border-teal-700/30",
  // Light: very transparent glass — airy frosted look, background bleeds through strongly
  light: "bg-white/15 backdrop-blur-xl border-l border-white/20 dark:bg-white/[8%] dark:border-white/10",
};

const BADGE_BASE = "text-xs px-2 py-1 rounded-full font-medium";

export const badgeStyles = {
  typing: `${BADGE_BASE} bg-yellow-100 text-yellow-800 flex items-center gap-1 dark:bg-yellow-500/20 dark:text-yellow-200`,
  online: `${BADGE_BASE} bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-200`,
  generating: `${BADGE_BASE} bg-purple-100 text-purple-800 flex items-center gap-1 dark:bg-purple-500/20 dark:text-purple-200`,
  active: `${BADGE_BASE} bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200`,
  inactive: `${BADGE_BASE} bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200`,
};
