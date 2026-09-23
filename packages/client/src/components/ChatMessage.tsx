/**
 * ChatMessage Component - one row of the transcript. AI rows carry their
 * provider's voice colour; consecutive rows from one sender drop the header.
 * (Mention rendering, AI metadata, and code rendering are extracted.)
 */

import { useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { formatMessageTime } from "@/utils/formatters";
import {
  formatMentionsForMarkdown,
  highlightMentions,
} from "@/utils/chatMentions";
import { voiceStyleFor } from "@/utils/voice";
import { useAIMetadata } from "@/hooks/useAIMetadata";
import MarkdownCodeBlock from "./MarkdownCodeBlock";
import MessageAvatar from "./MessageAvatar";
import ReplyQuote from "./ReplyQuote";
import type { ChatMessageProps } from "@/types";

const BODY_CLASSES = "text-[15px] leading-relaxed text-fg break-words";

const MARKDOWN_COMPONENTS_BASE = {
  h1: ({ children }: { children?: React.ReactNode }) => <h4>{children}</h4>,
  h2: ({ children }: { children?: React.ReactNode }) => <h4>{children}</h4>,
  h3: "h3" as const,
  pre: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="markdown-list">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="markdown-list">{children}</ol>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="markdown-link"
    >
      {children}
    </a>
  ),
};

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

  const renderMarkdownCode = useCallback(
    (props: {
      className?: string;
      children?: React.ReactNode;
      node?: { type?: string };
    }) => (
      <MarkdownCodeBlock
        {...props}
        aiParticipants={aiParticipants}
        participantMentions={participantMentions}
      />
    ),
    [aiParticipants, participantMentions],
  );

  const markdownComponents = useMemo(
    () => ({ ...MARKDOWN_COMPONENTS_BASE, code: renderMarkdownCode }),
    [renderMarkdownCode],
  );

  const voice = useMemo(() => voiceStyleFor(voiceKey), [voiceKey]);

  if (message.senderType === "system") {
    return (
      <div className="flex items-center gap-3 px-4 py-4 text-xs text-muted sm:px-6 animate-fade-in">
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
        <span className="max-w-[60ch] text-center">{message.content}</span>
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
      </div>
    );
  }

  const time = formatMessageTime(message.timestamp);

  return (
    <article
      className={`group relative flex gap-3 px-4 sm:px-6 hover:bg-surface/60 transition-colors animate-rise-in ${
        isContinuation ? "pt-1.5 pb-0.5" : "pt-5 pb-0.5"
      }`}
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
          />
        )}

        {isAI ? (
          <div className={`markdown-content ${BODY_CLASSES}`}>
            <ReactMarkdown components={markdownComponents}>
              {formatMentionsForMarkdown(
                message.content,
                aiParticipants,
                participantMentions,
              )}
            </ReactMarkdown>
          </div>
        ) : (
          <div className={`whitespace-pre-wrap ${BODY_CLASSES}`}>
            {highlightMentions(
              message.content,
              aiParticipants,
              participantMentions,
            )}
          </div>
        )}
      </div>
    </article>
  );
};

export default ChatMessage;
