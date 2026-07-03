/**
 * ChatMessage Component - Individual chat message display (composition;
 * mention rendering, AI metadata, and code rendering are extracted)
 */

import { useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { formatMessageTime } from "@/utils/formatters";
import {
  formatMentionsForMarkdown,
  highlightMentions,
} from "@/utils/chatMentions";
import {
  getSenderLabelClasses,
  getMessageStyles,
  getMaxWidth,
  getAnimationVariants,
  getTimestampClasses,
} from "@/utils/messageStyles";
import { useAIMetadata } from "@/hooks/useAIMetadata";
import MarkdownCodeBlock from "./MarkdownCodeBlock";
import ReplyQuote from "./ReplyQuote";
import type { ChatMessageProps } from "@/types";

const ChatMessage = ({
  message,
  aiParticipants = [],
  participants = [],
  quotedMessage,
}: ChatMessageProps) => {
  const participantMentions = useMemo(
    () => participants.map((participant) => participant.username),
    [participants],
  );

  const { senderDisplay } = useAIMetadata(message, aiParticipants);

  const renderMarkdownCode = useCallback(
    (props: { className?: string; children?: React.ReactNode; node?: { type?: string } }) => (
      <MarkdownCodeBlock
        {...props}
        aiParticipants={aiParticipants}
        participantMentions={participantMentions}
      />
    ),
    [aiParticipants, participantMentions],
  );

  return (
    <motion.div
      className={`${getMaxWidth(message.senderType)} rounded-2xl p-3 sm:p-4 lg:p-6 mb-3 sm:mb-4 lg:mb-6 overflow-hidden ${getMessageStyles(message.senderType)} transition-colors`}
      variants={getAnimationVariants(message.senderType)}
      initial="hidden"
      animate="visible"
    >
      {senderDisplay && (
        <div className={getSenderLabelClasses(message.senderType)}>
          {senderDisplay}
        </div>
      )}
      {message.mentionsTriggerMessageId && (
        <ReplyQuote
          quotedMessage={quotedMessage}
          fallbackSender={message.mentionsTriggerSender}
        />
      )}
      <div className={`${message.senderType === "ai" ? "markdown-content" : ""} leading-relaxed break-words`}>
        {message.senderType === "ai" ? (
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h4>{children}</h4>,
              h2: ({ children }) => <h4>{children}</h4>,
              h3: "h3",
              code: renderMarkdownCode,
              pre: ({ children }) => <>{children}</>,
              ul: ({ children }) => <ul className="markdown-list">{children}</ul>,
              ol: ({ children }) => <ol className="markdown-list">{children}</ol>,
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="markdown-link">
                  {children}
                </a>
              ),
            }}
          >
            {formatMentionsForMarkdown(message.content, aiParticipants, participantMentions)}
          </ReactMarkdown>
        ) : (
          <div>{highlightMentions(message.content, aiParticipants, participantMentions)}</div>
        )}
      </div>
      <div className={`text-xs mt-2 ${getTimestampClasses(message.senderType)}`}>
        {formatMessageTime(message.timestamp)}
      </div>
    </motion.div>
  );
};

export default ChatMessage;
