/**
 * ReplyQuote - the message a reply answers, quoted above it and ruled in the
 * quoted model's voice. One line by default, expandable to the full text.
 * Clicking it jumps to the original while that is in the loaded history;
 * past that, the snapshot the reply carries stands in for it.
 */

import { useRef, useState } from "react";
import { useVoiceStyle } from "@/context/VoiceContext";
import { useIsTruncated } from "@/hooks/useIsTruncated";
import Icon from "./Icon";
import type { Message } from "@/types";

const QUOTE_MAX_LENGTH = 140;

const QUOTE_CONTAINER_CLASSES =
  "mb-1.5 flex min-w-0 items-start gap-1 border-l-2 pl-2.5 text-[13px]";
const QUOTE_BUTTON_CLASSES =
  "flex min-w-0 flex-1 rounded-sm text-left enabled:cursor-pointer enabled:hover:opacity-80 disabled:cursor-default";
const QUOTE_SENDER_CLASSES = "shrink-0 font-semibold";
const QUOTE_COLLAPSED_CLASSES = "truncate text-faint";
const QUOTE_EXPANDED_CLASSES =
  "line-clamp-[8] whitespace-pre-wrap break-words text-faint";
const TOGGLE_CLASSES =
  "flex h-5 w-5 shrink-0 items-center justify-center rounded text-faint transition-colors hover:text-fg";

const excerpt = (content: string): string => {
  const trimmed = content.trim().replace(/\s+/g, " ");
  if (trimmed.length <= QUOTE_MAX_LENGTH) return trimmed;
  return `${trimmed.slice(0, QUOTE_MAX_LENGTH - 1).trimEnd()}…`;
};

interface ReplyQuoteProps {
  /** The original, while it is still in the loaded history */
  quotedMessage?: Message;
  /** The reply's snapshot of who was quoted and what they said */
  fallbackSender?: string | null;
  fallbackExcerpt?: string | null;
  /** Voice of the quoted sender when it is a model; people stay neutral */
  voiceKey?: string | null;
  /** Scrolls to the original; the quote isn't clickable without it */
  onJump?: () => void;
}

const ReplyQuote = ({
  quotedMessage,
  fallbackSender,
  fallbackExcerpt,
  voiceKey,
  onJump,
}: ReplyQuoteProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef<HTMLSpanElement>(null);
  const voice = useVoiceStyle(voiceKey);
  const content = (quotedMessage?.content ?? fallbackExcerpt ?? "").trim();
  const isTruncated = useIsTruncated(contentRef, content);
  const sender =
    quotedMessage?.displayName || quotedMessage?.sender || fallbackSender;
  if (!sender) return null;

  // Offer the full text only when the one-line view is hiding some of it
  const canExpand =
    isExpanded ||
    isTruncated ||
    content.length > QUOTE_MAX_LENGTH ||
    content.includes("\n");

  return (
    <div
      className={`${QUOTE_CONTAINER_CLASSES} ${
        voiceKey ? "border-voice-soft" : "border-line"
      }`}
      style={voice}
    >
      <button
        type="button"
        className={`${QUOTE_BUTTON_CLASSES} ${
          isExpanded ? "flex-col gap-0.5" : "items-baseline gap-2"
        }`}
        onClick={onJump}
        disabled={!onJump}
        title={onJump ? "Jump to message" : undefined}
      >
        <span
          className={`${QUOTE_SENDER_CLASSES} ${voiceKey ? "text-voice" : "text-muted"}`}
        >
          ↩ {sender}
        </span>
        {content && (
          <span
            ref={contentRef}
            className={
              isExpanded ? QUOTE_EXPANDED_CLASSES : QUOTE_COLLAPSED_CLASSES
            }
          >
            {isExpanded ? content : excerpt(content)}
          </span>
        )}
      </button>
      {canExpand && (
        <button
          type="button"
          className={TOGGLE_CLASSES}
          onClick={() => setIsExpanded((expanded) => !expanded)}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Collapse quote" : "Expand quote"}
        >
          <Icon
            name="chevron-down"
            className={`h-3.5 w-3.5 transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </button>
      )}
    </div>
  );
};

export default ReplyQuote;
