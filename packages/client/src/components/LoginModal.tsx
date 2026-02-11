/**
 * LoginModal Component - Username entry dialog for joining chat
 */

import { useEffect, useRef, type FormEvent } from "react";
import Icon from "./Icon";
import type { ConnectionStatus } from "@/types";

const MODAL_BACKDROP =
  "absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-200 ease-out";

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
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        isOpen ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      <div
        className={`${MODAL_BACKDROP} ${isOpen ? "opacity-100" : "opacity-0"}`}
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
        className={`relative w-full max-w-md rounded-3xl bg-white/95 p-8 shadow-2xl border border-white/40 backdrop-blur-xl transition-all duration-200 ease-out transform-gpu will-change-transform dark:bg-slate-900/95 dark:border-slate-700/60 ${
          isOpen
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-2 scale-95"
        }`}
      >
        <div className="absolute -top-10 right-8 h-24 w-24 rounded-full bg-primary-500/20 blur-2xl" />
        <div className="absolute -bottom-8 left-8 h-24 w-24 rounded-full bg-indigo-500/20 blur-2xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Welcome to the room
            </p>
            <p className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
              Pick your username
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200/60 bg-white/70 p-2 text-slate-500 transition hover:text-slate-700 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300"
            aria-label="Close login dialog"
          >
            <Icon name="x-mark" className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          Join the conversation with a display name so others can see
          you in the room.
        </p>
        <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
          <input
            ref={loginInputRef}
            type="text"
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
            placeholder="Enter your username"
            maxLength={50}
            pattern="[a-zA-Z0-9_-]+"
            title="Username can only contain letters, numbers, dash, and underscore"
            className="w-full rounded-2xl border border-slate-200/70 bg-white/80 px-5 py-3 text-base font-medium text-slate-800 shadow-inner outline-none transition focus:border-primary-300 focus:ring-2 focus:ring-primary-400/30 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-100"
            required
          />
          <button
            type="submit"
            disabled={!connectionStatus.connected || !username.trim()}
            className="group relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-primary-500 via-indigo-500 to-sky-500 px-6 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-white transition-all duration-300 disabled:from-slate-500 disabled:via-slate-600 disabled:to-slate-700 disabled:text-slate-300 disabled:shadow-none disabled:cursor-not-allowed"
          >
            <span className="absolute inset-0 translate-y-full bg-gradient-to-r from-emerald-400/80 via-teal-400/80 to-cyan-400/80 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100" />
            <span className="relative">Join Chat</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
