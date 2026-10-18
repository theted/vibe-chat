/**
 * ChatMessage Component - one row of the transcript. AI rows carry their
 * provider's voice colour; consecutive rows from one sender drop the header.
 * (Body markdown and AI metadata are extracted.)
 */

import { useCallback, useMemo } from "react";
import { formatMessageTime } from "@/utils/formatters";
import { messageElementId } from "@/utils/messageAnchor";
import { getMessageVoiceKey } from "@/utils/messageSender";
import { useVoiceStyle } from "@/context/VoiceContext";
import { useAIMetadata } from "@/hooks/useAIMetadata";
import Icon from "./Icon";
import MessageAvatar from "./MessageAvatar";
import MessageMarkdown from "./MessageMarkdown";
import ReplyQuote from "./ReplyQuote";
import type { ChatMessageProps } from "@/types";

// Shown on hover, and on touch once a tap focuses the row; it ignores taps
// while hidden so an invisible button can't start a reply by accident
const REPLY_BUTTON_CLASSES =
  "pointer-events-none absolute -top-3 right-4 z-10 flex h-7 w-7 items-center justify-center rounded-md border border-line bg-raised text-muted opacity-0 shadow-sm transition-opacity hover:text-fg focus-visible:pointer-events-auto focus-visible:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100";
const BODY_CLASSES =
  "markdown-content text-[15px] leading-relaxed text-fg break-words";

const ChatMessage = ({
  message,
  aiParticipants = [],
  participants = [],
  quotedMessage,
  isContinuation = false,
  onReply,
  onJumpToMessage,
  isHighlighted = false,
}: ChatMessageProps) => {
  const participantMentions = useMemo(
    () => participants.map((participant) => participant.username),
    [participants],
  );

  const { senderName, senderEmoji, voiceKey } = useAIMetadata(
    message,
    aiParticipants,
  );
  const isAI = message.senderType === "ai";

  const voice = useVoiceStyle(voiceKey);
  const quotedVoiceKey = useMemo(
    () =>
      quotedMessage ? getMessageVoiceKey(quotedMessage, aiParticipants) : null,
    [quotedMessage, aiParticipants],
  );
  const handleReply = useCallback(() => onReply?.(message), [onReply, message]);
  const handleJumpToQuote = useMemo(
    () =>
      quotedMessage && onJumpToMessage
        ? () => onJumpToMessage(quotedMessage.id)
        : undefined,
    [quotedMessage, onJumpToMessage],
  );

  if (message.senderType === "system") {
    return (
      <div className="flex items-center gap-3 px-4 py-5 sm:px-6 animate-fade-in">
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
        <span className="max-w-[60ch] text-center font-display text-[13px] font-medium text-muted">
          {message.content}
        </span>
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
      </div>
    );
  }

  const time = formatMessageTime(message.timestamp);

  return (
    <article
      id={messageElementId(message.id)}
      // Focusable so a tap on touch screens reveals the reply button
      tabIndex={onReply ? -1 : undefined}
      className={`group relative flex gap-3 px-4 sm:px-6 transition-colors animate-rise-in focus:outline-none ${
        isAI ? "hover-voice" : "hover:bg-surface/60"
      } ${isContinuation ? "pt-1.5 pb-0.5" : "pt-5 pb-0.5"} ${
        isHighlighted ? "message-flash" : ""
      }`}
      style={voice}
    >
      {onReply && (
        <button
          type="button"
          className={REPLY_BUTTON_CLASSES}
          onClick={handleReply}
          aria-label={`Reply to ${senderName}`}
          title="Reply"
        >
          <Icon name="reply" className="h-4 w-4" />
        </button>
      )}

      <div className="w-9 shrink-0">
        {isContinuation ? (
          <time className="block pt-1 text-right text-[10px] leading-5 text-faint opacity-0 transition-opacity group-hover:opacity-100">
            {time}
          </time>
        ) : (
          <MessageAvatar isAI={isAI} emoji={senderEmoji} name={senderName} />
        )}
      </div>

      <div className="min-w-0 max-w-[72ch] flex-1">
        {!isContinuation && (
          <header className="mb-0.5 flex items-baseline gap-2">
            <span
              className={`truncate font-display text-[15px] font-semibold ${
                isAI ? "text-voice" : "text-fg"
              }`}
            >
              {senderName}
            </span>
            <time className="shrink-0 text-xs text-faint">{time}</time>
          </header>
        )}

        {message.replyToMessageId && (
          <ReplyQuote
            quotedMessage={quotedMessage}
            fallbackSender={message.replyToSender}
            fallbackExcerpt={message.replyToExcerpt}
            voiceKey={quotedVoiceKey}
            onJump={handleJumpToQuote}
          />
        )}

        <div className={BODY_CLASSES}>
          <MessageMarkdown
            content={message.content}
            aiParticipants={aiParticipants}
            participantMentions={participantMentions}
          />
        </div>
      </div>
    </article>
  );
};

export default ChatMessage;
