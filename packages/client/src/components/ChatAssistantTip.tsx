/**
 * ChatAssistantTip - one-time note above the composer introducing @Chat.
 * It is a polite live region rather than a dialog: it never takes focus from
 * the textarea, so typing, the mention picker and Enter-to-send carry on as
 * normal while it is up.
 */

import type { KeyboardEvent } from "react";
import Icon from "./Icon";
import {
  CHAT_TIP_BODY,
  CHAT_TIP_DISMISS_LABEL,
  CHAT_TIP_HANDLE,
  CHAT_TIP_LABEL,
} from "@/config/chatAssistantTip";

interface ChatAssistantTipProps {
  onDismiss: () => void;
}

const ChatAssistantTip = ({ onDismiss }: ChatAssistantTipProps) => {
  // Escape from inside the tip (the close button has focus); Escape in the
  // textarea is handled by MessageInput so it can defer to the mention picker
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Escape") return;
    e.preventDefault();
    onDismiss();
  };

  return (
    <div
      role="status"
      aria-label={CHAT_TIP_LABEL}
      onKeyDown={handleKeyDown}
      className="mb-2 flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm shadow-lg shadow-black/20 animate-fade-in"
    >
      <p className="min-w-0 flex-1 text-muted">
        Meet{" "}
        <span className="font-mono font-semibold text-accent">
          {CHAT_TIP_HANDLE}
        </span>
        {CHAT_TIP_BODY}
      </p>
      <button
        type="button"
        className="-mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-faint transition-colors hover:text-fg"
        onClick={onDismiss}
        aria-label={CHAT_TIP_DISMISS_LABEL}
        title="Dismiss (Esc)"
      >
        <Icon name="x-mark" className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default ChatAssistantTip;
