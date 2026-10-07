/**
 * SettingsModal Component - theme, dashboard link, and sign-in/out
 */

import { Link } from "react-router-dom";
import Icon from "./Icon";
import {
  MODAL_BACKDROP_CLASSES,
  MODAL_CLOSE_BUTTON_CLASSES,
  MODAL_PANEL_CLASSES,
  MODAL_TITLE_CLASSES,
  modalPanelState,
} from "@/constants/modalStyles";
import type { Theme } from "@/types";

const ROW_CLASSES =
  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-fg transition-colors hover:bg-raised";
const ROW_ICON_CLASSES = "h-[18px] w-[18px] text-muted";

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

  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        isOpen ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      <div
        className={`${MODAL_BACKDROP_CLASSES} ${isOpen ? "opacity-100" : "opacity-0"}`}
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
        className={`${MODAL_PANEL_CLASSES} max-w-xs p-2 ${modalPanelState(isOpen)}`}
      >
        <div className="flex items-center justify-between px-3 pb-2 pt-2">
          <h2 className={MODAL_TITLE_CLASSES}>Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className={MODAL_CLOSE_BUTTON_CLASSES}
            aria-label="Close settings"
          >
            <Icon name="x-mark" className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className={ROW_CLASSES}
          title={`Switch to ${nextTheme} mode`}
        >
          <Icon
            name={theme === "dark" ? "sun" : "moon"}
            className={ROW_ICON_CLASSES}
          />
          <span className="flex-1">
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </span>
        </button>

        <Link
          to="/dashboard"
          onClick={onClose}
          className={ROW_CLASSES}
          aria-label="Dashboard"
        >
          <Icon name="dashboard" className={ROW_ICON_CLASSES} />
          <span className="flex-1">Dashboard</span>
        </Link>

        <div className="mx-3 my-1 h-px bg-line" />

        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className={`${ROW_CLASSES} text-danger`}
            aria-label="Logout"
          >
            <Icon name="logout" className="h-[18px] w-[18px]" />
            <span className="flex-1">Log out</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              onClose();
              onLoginOpen();
            }}
            className={ROW_CLASSES}
            aria-label="Log in"
          >
            <Icon name="login" className={ROW_ICON_CLASSES} />
            <span className="flex-1">Join chat</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default SettingsModal;
