/**
 * SettingsModal Component - Quick actions dialog for theme, dashboard, and auth
 */

import { Link } from "react-router-dom";
import Icon from "./Icon";
import type { Theme } from "@/types";

const MODAL_BACKDROP =
  "absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-200 ease-out";

const PRIMARY_ICON_BUTTON =
  "flex items-center justify-center gap-2 rounded-xl border border-primary-200/70 bg-primary-50 px-4 py-3 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-100 dark:border-primary-500/40 dark:bg-primary-500/10 dark:text-primary-200 dark:hover:bg-primary-500/20";

interface SettingsModalProps {
  isOpen: boolean;
  isVisible: boolean;
  onClose: () => void;
  onLoginOpen: () => void;
  theme: Theme;
  toggleTheme: () => void;
  isAuthenticated: boolean;
  onLogout: () => void;
}

const SettingsModal = ({
  isOpen,
  isVisible,
  onClose,
  onLoginOpen,
  theme,
  toggleTheme,
  isAuthenticated,
  onLogout,
}: SettingsModalProps) => {
  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        isOpen ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      <div
        className={`${MODAL_BACKDROP} ${isOpen ? "opacity-100" : "opacity-0"}`}
        role="button"
        tabIndex={-1}
        aria-label="Close settings menu"
        onClick={onClose}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        aria-hidden={!isOpen}
        className={`relative w-full max-w-sm rounded-2xl bg-white/95 p-6 shadow-2xl border border-white/40 backdrop-blur-xl transition-all duration-200 ease-out transform-gpu will-change-transform dark:bg-slate-900/95 dark:border-slate-700/60 ${
          isOpen
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-2 scale-95"
        }`}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
            <Icon name="cog" className="w-5 h-5 text-primary-500" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Quick actions
            </p>
            <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Settings
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-between gap-3 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-100"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            <span className="flex items-center gap-2">
              <Icon
                name={theme === "dark" ? "sun" : "moon"}
                className="w-4 h-4"
              />
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Toggle
            </span>
          </button>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/dashboard"
              onClick={onClose}
              className={PRIMARY_ICON_BUTTON}
              title="Dashboard"
              aria-label="Dashboard"
            >
              <Icon name="dashboard" className="w-5 h-5" />
            </Link>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => { onClose(); onLogout(); }}
                className="flex items-center justify-center gap-2 rounded-xl border border-rose-200/70 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
                title="Logout"
                aria-label="Logout"
              >
                <Icon name="logout" className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLoginOpen();
                }}
                className={PRIMARY_ICON_BUTTON}
                title="Log in"
                aria-label="Log in"
              >
                <Icon name="login" className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
