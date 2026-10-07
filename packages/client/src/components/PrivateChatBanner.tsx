/**
 * PrivateChatBanner - Header strip shown while the user is in a 1-1 chat,
 * naming the model and offering the way back to the main room.
 */

import { useMemo } from "react";
import { voiceStyleFor } from "@/utils/voice";
import Icon from "./Icon";
import type { AiParticipant } from "@/config/aiParticipants";

interface PrivateChatBannerProps {
  ai: AiParticipant | null;
  onLeave: () => void;
}

const PrivateChatBanner = ({ ai, onLeave }: PrivateChatBannerProps) => {
  const voice = useMemo(() => voiceStyleFor(ai?.provider ?? ai?.name), [ai]);

  return (
    <div
      className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-voice-soft px-4 py-2 sm:px-6"
      style={voice}
      data-testid="private-chat-banner"
    >
      <div className="flex min-w-0 items-center gap-2.5 text-sm">
        <span aria-hidden="true">{ai?.emoji || "🔒"}</span>
        <p className="truncate">
          <span className="font-semibold text-fg">Private chat</span>
          {ai ? (
            <>
              {" "}
              with <span className="font-semibold text-voice">{ai.name}</span>
            </>
          ) : null}
          <span className="hidden text-muted sm:inline">
            . Only you two, one reply per message.
          </span>
        </p>
      </div>
      <button
        type="button"
        onClick={onLeave}
        className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-muted transition-colors hover:bg-raised hover:text-fg"
        data-testid="leave-private-chat"
      >
        <Icon name="chevron-right" className="h-3.5 w-3.5 rotate-180" />
        Back to main room
      </button>
    </div>
  );
};

export default PrivateChatBanner;
