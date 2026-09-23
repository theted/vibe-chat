/**
 * PrivateChatBanner - Header strip shown while the user is in a 1-1 chat,
 * naming the model and offering the way back to the main room.
 */

import Icon from "./Icon";
import type { AiParticipant } from "@/config/aiParticipants";

interface PrivateChatBannerProps {
  ai: AiParticipant | null;
  onLeave: () => void;
}

const PrivateChatBanner = ({ ai, onLeave }: PrivateChatBannerProps) => (
  <div
    className="flex items-center justify-between gap-3 border-b border-purple-300/40 bg-purple-500/15 px-3 py-2 text-purple-900 backdrop-blur-sm sm:px-4 lg:px-6 dark:border-purple-400/30 dark:bg-purple-400/10 dark:text-purple-100"
    data-testid="private-chat-banner"
  >
    <div className="flex min-w-0 items-center gap-2">
      <span className="text-lg" aria-hidden="true">
        {ai?.emoji || "🔒"}
      </span>
      <p className="truncate text-xs sm:text-sm">
        <span className="font-semibold">Private chat</span>
        {ai ? <> with {ai.name}</> : null}
        <span className="hidden sm:inline opacity-75">
          {" "}
          — only you two, one reply per message
        </span>
      </p>
    </div>
    <button
      type="button"
      onClick={onLeave}
      className="glass-btn flex shrink-0 items-center gap-1.5 rounded-lg bg-white/20 px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-white/30 dark:bg-purple-900/30 dark:hover:bg-purple-900/50"
      data-testid="leave-private-chat"
    >
      <Icon name="arrow-down" className="w-3.5 h-3.5 rotate-90" />
      Back to main room
    </button>
  </div>
);

export default PrivateChatBanner;
