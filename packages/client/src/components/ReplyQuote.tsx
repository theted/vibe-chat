/**
 * ReplyQuote - compact quote of the message an AI is replying to, rendered
 * above the reply content and ruled in the quoted model's voice. Falls back
 * to a sender-only line when the quoted message has scrolled out of the
 * loaded history.
 */

import { useMemo } from "react";
import { voiceStyleFor } from "@/utils/voice";
import type { Message } from "@/types";

const QUOTE_MAX_LENGTH = 140;

const QUOTE_CONTAINER_CLASSES =
  "mb-1.5 flex min-w-0 items-baseline gap-2 border-l-2 pl-2.5 text-[13px]";
const QUOTE_SENDER_CLASSES = "shrink-0 font-semibold";
const QUOTE_CONTENT_CLASSES = "truncate text-faint";

const excerpt = (content: string): string => {
  const trimmed = content.trim().replace(/\s+/g, " ");
  if (trimmed.length <= QUOTE_MAX_LENGTH) return trimmed;
  return `${trimmed.slice(0, QUOTE_MAX_LENGTH - 1).trimEnd()}…`;
};

interface ReplyQuoteProps {
  quotedMessage?: Message;
  fallbackSender?: string | null;
  /** Voice of the quoted sender when it is a model; people stay neutral */
  voiceKey?: string | null;
}

const ReplyQuote = ({
  quotedMessage,
  fallbackSender,
  voiceKey,
}: ReplyQuoteProps) => {
  const voice = useMemo(
    () => (voiceKey ? voiceStyleFor(voiceKey) : undefined),
    [voiceKey],
  );
  const sender =
    quotedMessage?.displayName || quotedMessage?.sender || fallbackSender;
  if (!sender) return null;

  return (
    <div
      className={`${QUOTE_CONTAINER_CLASSES} ${
        voiceKey ? "border-voice-soft" : "border-line"
      }`}
      style={voice}
    >
      <span
        className={`${QUOTE_SENDER_CLASSES} ${voiceKey ? "text-voice" : "text-muted"}`}
      >
        ↩ {sender}
      </span>
      {quotedMessage && (
        <div className={QUOTE_CONTENT_CLASSES}>
          {excerpt(quotedMessage.content)}
        </div>
      )}
    </div>
  );
};

export default ReplyQuote;
