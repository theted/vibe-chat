/**
 * ChatMessage Component - one row of the transcript. AI rows carry their
 * provider's voice colour; consecutive rows from one sender drop the header.
 * (Body markdown and AI metadata are extracted.)
 */

import { useMemo } from "react";
import { formatMessageTime } from "@/utils/formatters";
import { getMessageVoiceKey } from "@/utils/messageSender";
import { useVoiceStyle } from "@/context/VoiceContext";
import { useAIMetadata } from "@/hooks/useAIMetadata";
import MessageAvatar from "./MessageAvatar";
import MessageMarkdown from "./MessageMarkdown";
import ReplyQuote from "./ReplyQuote";
import type { ChatMessageProps } from "@/types";

const BODY_CLASSES =
  "markdown-content text-[15px] leading-relaxed text-fg break-words";

const ChatMessage = ({
  message,
  aiParticipants = [],
  participants = [],
  quotedMessage,
  isContinuation = false,
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
      className={`group relative flex gap-3 px-4 sm:px-6 transition-colors animate-rise-in ${
        isAI ? "hover-voice" : "hover:bg-surface/60"
      } ${isContinuation ? "pt-1.5 pb-0.5" : "pt-5 pb-0.5"}`}
      style={voice}
    >
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

        {message.mentionsTriggerMessageId && (
          <ReplyQuote
            quotedMessage={quotedMessage}
            fallbackSender={message.mentionsTriggerSender}
            voiceKey={quotedVoiceKey}
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
