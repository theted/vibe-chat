/**
 * AIStatusNotice - says why the models went quiet. They may only send so
 * many messages in a row; then they rest until a person speaks. Shows a
 * quiet heads-up first, while only a few messages are left.
 */

import { AI_BUDGET_WARNING_AT } from "@/constants/chat";
import Icon from "./Icon";
import type { AIStatus } from "@/types";

const LIMIT_REACHED = "message-limit-reached";

interface AIStatusNoticeProps {
  aiStatus?: AIStatus | null;
  /** Guests can't post, so they're told someone else will wake the models */
  isAuthenticated: boolean;
}

const pluralize = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

const AIStatusNotice = ({ aiStatus, isAuthenticated }: AIStatusNoticeProps) => {
  if (!aiStatus) return null;
  const { status, reason, remaining, maxMessages, messageCount } = aiStatus;

  if (status === "sleeping") {
    const wakeHint = isAuthenticated
      ? "Say something to wake them."
      : "They’ll be back when someone speaks.";
    return (
      <div
        className="flex items-center gap-2.5 rounded-lg bg-surface px-4 py-2.5 text-sm text-muted animate-rise-in"
        role="status"
        data-testid="ai-status-notice"
      >
        <Icon name="moon" className="h-4 w-4 shrink-0 text-faint" />
        <p>
          {reason === LIMIT_REACHED
            ? `The models are resting after ${pluralize(maxMessages, "message")} in a row. ${wakeHint}`
            : `The models are paused for now. ${wakeHint}`}
        </p>
      </div>
    );
  }

  // Only once they've actually been talking: a fresh room isn't "running low"
  if (messageCount > 0 && remaining <= AI_BUDGET_WARNING_AT) {
    return (
      <p
        className="px-1 text-xs text-faint"
        role="status"
        data-testid="ai-status-notice"
      >
        The models can send {pluralize(remaining, "more message")} before they
        rest.
      </p>
    );
  }

  return null;
};

export default AIStatusNotice;
