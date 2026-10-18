/**
 * ReplyingToBar - sits above the composer while a quote-reply is being
 * written: who is being quoted, a line of what they said, and a way out.
 */

import { useMemo } from "react";
import { useVoiceStyle } from "@/context/VoiceContext";
import { getMessageVoiceKey } from "@/utils/messageSender";
import Icon from "./Icon";
import type { AiParticipant } from "@/config/aiParticipants";
import type { Message } from "@/types";

interface ReplyingToBarProps {
  message: Message;
  aiParticipants?: AiParticipant[];
  onCancel?: () => void;
}

const ReplyingToBar = ({
  message,
  aiParticipants = [],
  onCancel,
}: ReplyingToBarProps) => {
  const voiceKey = useMemo(
    () => getMessageVoiceKey(message, aiParticipants),
    [message, aiParticipants],
  );
  const voice = useVoiceStyle(voiceKey);
  const sender = message.displayName || message.sender;

  return (
    <div
      className={`mb-1.5 flex items-center gap-2 border-l-2 py-0.5 pl-2.5 text-[13px] animate-fade-in ${
        voiceKey ? "border-voice-soft" : "border-line"
      }`}
      style={voice}
    >
      <span className="shrink-0 text-faint">Replying to</span>
      <span
        className={`shrink-0 font-semibold ${voiceKey ? "text-voice" : "text-fg"}`}
      >
        {sender}
      </span>
      <span className="min-w-0 flex-1 truncate text-faint">
        {message.content}
      </span>
      <button
        type="button"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-faint transition-colors hover:text-fg"
        onClick={onCancel}
        aria-label="Cancel reply"
        title="Cancel reply (Esc)"
      >
        <Icon name="x-mark" className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default ReplyingToBar;
