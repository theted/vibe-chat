/**
 * LoginModal Component - Username entry dialog for joining chat
 */

import { useEffect, useRef, type FormEvent } from "react";
import Icon from "./Icon";
import {
  MODAL_BACKDROP_CLASSES,
  MODAL_CLOSE_BUTTON_CLASSES,
  MODAL_PANEL_CLASSES,
  MODAL_TITLE_CLASSES,
  modalPanelState,
} from "@/constants/modalStyles";
import type { ConnectionStatus } from "@/types";

interface LoginModalProps {
  isOpen: boolean;
  isVisible: boolean;
  onClose: () => void;
  username: string;
  onUsernameChange: (value: string) => void;
  onJoin: (event: FormEvent<HTMLFormElement>) => void;
  connectionStatus: ConnectionStatus;
}

const LoginModal = ({
  isOpen,
  isVisible,
  onClose,
  username,
  onUsernameChange,
  onJoin,
  connectionStatus,
}: LoginModalProps) => {
  const loginInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && isVisible) {
      loginInputRef.current?.focus();
    }
  }, [isOpen, isVisible]);

  const handleLoginSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim()) {
      loginInputRef.current?.focus();
      return;
    }
    onJoin(event);
    onClose();
  };

  if (!isVisible) return null;

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
        aria-label="Close login dialog"
        onClick={onClose}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Set your username"
        aria-hidden={!isOpen}
        className={`${MODAL_PANEL_CLASSES} max-w-sm p-6 ${modalPanelState(isOpen)}`}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className={MODAL_TITLE_CLASSES}>Pick a name</h2>
          <button
            type="button"
            onClick={onClose}
            className={`${MODAL_CLOSE_BUTTON_CLASSES} -mr-2 -mt-1`}
            aria-label="Close login dialog"
          >
            <Icon name="x-mark" className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">
          It’s how people and models in the room will address you. We’ll
          remember it on this device.
        </p>
        <form onSubmit={handleLoginSubmit} className="mt-5 space-y-3">
          <input
            ref={loginInputRef}
            type="text"
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
            placeholder="e.g. ada_l"
            aria-label="Username"
            maxLength={50}
            pattern="[a-zA-Z0-9_-]+"
            title="Letters, numbers, dash and underscore only"
            className="w-full rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-[15px] text-fg placeholder:text-faint focus:border-accent focus:ring-0"
            required
          />
          <button
            type="submit"
            disabled={!connectionStatus.connected || !username.trim()}
            className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-raised disabled:text-faint"
          >
            {connectionStatus.connected ? "Join chat" : "Waiting for server"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
