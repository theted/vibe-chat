/**
 * ChatMessage Component - Individual chat message display
 */

import { useCallback, useMemo, Fragment, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism/index.js";
import { normalizeAlias, resolveEmoji } from "@/utils/ai";
import { findMentionMatches } from "@/utils/mentions";
import {
  getSenderLabelClasses,
  getMessageStyles,
  getMaxWidth,
  getAnimationVariants,
  getTimestampClasses,
} from "@/utils/messageStyles";
import type { ChatMessageProps, SenderType } from "@/types";
import type { AiParticipant } from "@/config/aiParticipants";

const SYNTAX_HIGHLIGHTER_STYLE: React.CSSProperties = {
  background: "transparent",
  margin: "15px 0",
  padding: 10,
};
const CODE_TAG_STYLE: React.CSSProperties = { fontFamily: "inherit" };
const DEFAULT_AI_DISPLAY_NAME = "AI Assistant";

const formatTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

const ChatMessage = ({
  message,
  aiParticipants = [],
  participants = [],
}: ChatMessageProps) => {
  const participantMentions = useMemo(
    () => participants.map((participant) => participant.username),
    [participants],
  );

  const formatMentionsForMarkdown = useCallback(
    (content: string): string => {
      if (typeof content !== "string" || !content.includes("@")) return content;

      const matches = findMentionMatches(content, aiParticipants, participantMentions);
      if (matches.length === 0) return content;

      let formatted = "";
      let lastIndex = 0;

      matches.forEach((match) => {
        formatted += content.slice(lastIndex, match.start);
        formatted += `**\`${match.text}\`**`;
        lastIndex = match.end;
      });

      formatted += content.slice(lastIndex);
      return formatted;
    },
    [aiParticipants, participantMentions],
  );

  const highlightMentions = useCallback(
    (value: unknown): ReactNode => {
      let stringValue: string;
      if (typeof value !== "string") {
        if (Array.isArray(value)) {
          stringValue = value.join("");
        } else if (value == null) {
          return value as ReactNode;
        } else {
          stringValue = String(value);
        }
      } else {
        stringValue = value;
      }

      if (!stringValue.includes("@")) return stringValue;

      const matches = findMentionMatches(stringValue, aiParticipants, participantMentions);
      if (matches.length === 0) return stringValue;

      const nodes: ReactNode[] = [];
      let lastIndex = 0;
      let key = 0;

      matches.forEach((match) => {
        if (match.start > lastIndex) {
          nodes.push(
            <Fragment key={`text-${key++}`}>
              {stringValue.slice(lastIndex, match.start)}
            </Fragment>,
          );
        }
        nodes.push(
          <span key={`mention-${key++}`} className="mention-chip">
            {match.text}
          </span>,
        );
        lastIndex = match.end;
      });

      if (lastIndex < stringValue.length) {
        nodes.push(
          <Fragment key={`text-${key++}`}>
            {stringValue.slice(lastIndex)}
          </Fragment>,
        );
      }

      return nodes;
    },
    [aiParticipants, participantMentions],
  );

  const matchedAI = useMemo<AiParticipant | null>(() => {
    if (message.senderType !== "ai") return null;

    const normalizedTargets = [
      normalizeAlias(message.aiId),
      normalizeAlias(message.aiName),
      normalizeAlias(message.alias),
      normalizeAlias(message.displayName),
      normalizeAlias(message.modelName),
      normalizeAlias(message.modelKey),
      normalizeAlias(message.modelId),
      normalizeAlias(message.sender),
    ].filter(Boolean);

    if (normalizedTargets.length === 0) return null;

    return (
      aiParticipants.find((participant) => {
        const candidateValues = [participant.id, participant.alias, participant.name]
          .map(normalizeAlias)
          .filter(Boolean);
        return candidateValues.some((value) =>
          normalizedTargets.some((target) => target === value),
        );
      }) || null
    );
  }, [aiParticipants, message]);

  const getAIEmoji = (): string => {
    if (message.senderType !== "ai") return "";
    if (message.emoji) return message.emoji;
    if (message.aiEmoji) return message.aiEmoji;
    if (matchedAI?.emoji) return matchedAI.emoji;

    if (message.providerKey || message.modelKey) {
      const combined = `${normalizeAlias(message.providerKey)}${normalizeAlias(message.modelKey)}`;
      const resolved = resolveEmoji(combined);
      if (resolved) return resolved;
    }

    return resolveEmoji(message.aiId || message.sender);
  };

  const getAIDisplayName = (): string => {
    if (message.senderType !== "ai") return message.sender;

    const formatModelReference = (value: string | undefined): string =>
      value ? value.replace(/_/g, " ").trim() : "";

    const candidates = [
      matchedAI?.name,
      message.displayName,
      message.modelName,
      formatModelReference(message.modelKey),
      formatModelReference(message.modelId),
      message.alias,
      message.aiName,
      message.sender,
    ];

    return candidates.find((v) => v && v.trim().length > 0) || DEFAULT_AI_DISPLAY_NAME;
  };

  const getSenderDisplay = (sender: string, senderType: SenderType): string | null => {
    if (senderType === "system") return null;
    if (senderType === "ai") {
      const emoji = getAIEmoji();
      const displayName = getAIDisplayName();
      return `${emoji ? `${emoji} ` : ""}${displayName}`;
    }
    return `👤 ${sender}`;
  };

  const renderMarkdownCode = useCallback(
    ({ className, children, node, ...props }: {
      className?: string;
      children?: ReactNode;
      node?: { type?: string };
    }) => {
      const languageMatch = /language-([\w+#-]+)/.exec(className || "");
      const normalizedChildren = String(children).replace(/\n$/, "");
      const trimmedChildren = normalizedChildren.trim();
      const mentionMatches = findMentionMatches(trimmedChildren, aiParticipants, participantMentions);
      const mentionMatch = mentionMatches.find(
        (match) => match.start === 0 && match.end === trimmedChildren.length,
      );

      if (mentionMatch || (trimmedChildren.startsWith("@") && !normalizedChildren.includes("\n"))) {
        return <span className="mention-chip">{trimmedChildren}</span>;
      }

      // Detect inline code: no language class and not a block-level code node
      const isInline = !languageMatch && node?.type !== "code";

      if (isInline || !normalizedChildren.includes("\n")) {
        return (
          <code className={`inline-code ${className || ""}`} {...props}>
            {normalizedChildren}
          </code>
        );
      }

      return (
        <SyntaxHighlighter
          language={languageMatch ? languageMatch[1] : "text"}
          style={oneDark}
          PreTag="pre"
          wrapLongLines
          customStyle={SYNTAX_HIGHLIGHTER_STYLE}
          codeTagProps={{ style: CODE_TAG_STYLE }}
          className={`code-block ${className || ""}`.trim()}
          {...props}
        >
          {normalizedChildren}
        </SyntaxHighlighter>
      );
    },
    [aiParticipants, participantMentions],
  );

  return (
    <motion.div
      className={`${getMaxWidth(message.senderType)} rounded-2xl p-6 mb-6 overflow-hidden ${getMessageStyles(message.senderType)} transition-colors`}
      variants={getAnimationVariants(message.senderType)}
      initial="hidden"
      animate="visible"
    >
      {getSenderDisplay(message.sender, message.senderType) && (
        <div className={getSenderLabelClasses(message.senderType)}>
          {getSenderDisplay(message.sender, message.senderType)}
        </div>
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
            {formatMentionsForMarkdown(message.content)}
          </ReactMarkdown>
        ) : (
          <div>{highlightMentions(message.content)}</div>
        )}
      </div>
      <div className={`text-xs mt-2 ${getTimestampClasses(message.senderType)}`}>
        {formatTime(message.timestamp)}
      </div>
    </motion.div>
  );
};

export default ChatMessage;
