/**
 * ChatMessage Component - Individual chat message display
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism/index.js";
import { normalizeAlias, resolveEmoji } from "../utils/ai.ts";

const MENTION_REGEX = /(@\[[^\]]+\])/g;
const MENTION_TEST_REGEX = /@\[[^\]]+\]/;

const ChatMessage = ({ message, aiParticipants = [] }) => {
  // Format @mentions as bold text in code blocks for markdown
  const formatMentionsForMarkdown = React.useCallback((content) => {
    if (typeof content !== 'string') return content;
    if (!content.includes('@')) return content;

    // Replace @mentions with `**@mention**` format
    return content.replace(MENTION_REGEX, "**`$1`**");
  }, []);

  const highlightMentions = React.useCallback((value) => {
    if (typeof value !== 'string') {
      if (Array.isArray(value)) {
        value = value.join('');
      } else if (value == null) {
        return value;
      } else {
        value = String(value);
      }
    }

    if (!value.includes('@')) return value;

    const segments = value.split(MENTION_REGEX);
    let key = 0;

    return segments.map((segment) => {
      if (!segment) return null;
      if (MENTION_TEST_REGEX.test(segment)) {
        return (
          <span key={`mention-${key++}`} className="mention-chip">
            {segment}
          </span>
        );
      }
      return (
        <React.Fragment key={`text-${key++}`}>
          {segment}
        </React.Fragment>
      );
    }).filter(Boolean);
  }, []);

  const renderPlainContent = React.useCallback(
    (content) => highlightMentions(content),
    [highlightMentions]
  );

  const matchedAI = React.useMemo(() => {
    if (message.senderType !== 'ai') {
      return null;
    }

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

    if (normalizedTargets.length === 0) {
      return null;
    }

    return aiParticipants.find((participant) => {
      const candidateValues = [
        participant.id,
        participant.alias,
        participant.displayName,
        participant.name,
        participant.modelId,
      ]
        .map(normalizeAlias)
        .filter(Boolean);

      return candidateValues.some((value) =>
        normalizedTargets.some((target) => target === value)
      );
    }) || null;
  }, [aiParticipants, message]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMessageClass = (senderType) => {
    switch (senderType) {
      case 'user':
        return 'message user';
      case 'ai':
        return 'message ai';
      case 'system':
        return 'message system';
      default:
        return 'message';
    }
  };

  const getAIEmoji = () => {
    if (message.senderType !== 'ai') {
      return '';
    }

    if (message.emoji) {
      return message.emoji;
    }

    if (message.aiEmoji) {
      return message.aiEmoji;
    }

    if (matchedAI?.emoji) {
      return matchedAI.emoji;
    }

    if (message.providerKey || message.modelKey) {
      const provider = normalizeAlias(message.providerKey);
      const model = normalizeAlias(message.modelKey);
      const combined = `${provider}${model}`;
      const resolved = resolveEmoji(combined);
      if (resolved) {
        return resolved;
      }
    }

    return resolveEmoji(message.aiId || message.sender);
  };

  const getAIDisplayName = () => {
    if (message.senderType !== 'ai') {
      return message.sender;
    }

    const formatModelReference = (value) =>
      value ? value.replace(/_/g, ' ').trim() : '';

    const candidates = [
      matchedAI?.displayName,
      matchedAI?.name,
      message.displayName,
      message.modelName,
      formatModelReference(message.modelKey),
      formatModelReference(message.modelId),
      message.alias,
      message.aiName,
      message.sender,
    ];

    return candidates.find((value) => value && value.trim().length > 0) || 'AI Assistant';
  };

  const getSenderDisplay = (sender, senderType) => {
    if (senderType === 'system') {
      return null; // System messages don't show sender
    }
    
    if (senderType === 'ai') {
      const emoji = getAIEmoji();
      const displayName = getAIDisplayName();
      return `${emoji ? `${emoji} ` : ''}${displayName}`;
    }
    
    return `👤 ${sender}`;
  };

  const getSenderLabelClasses = (senderType) => {
    const baseClasses = 'text-sm font-bold mb-3 flex items-center gap-2 underline decoration-2 underline-offset-4 transition-colors';
    switch (senderType) {
      case 'user':
        return `${baseClasses} text-white/90 decoration-white/60 dark:text-primary-100 dark:decoration-primary-200/70`;
      case 'ai':
        return `${baseClasses} text-slate-700 decoration-primary-300 dark:text-slate-200 dark:decoration-primary-400`;
      case 'system':
        return `${baseClasses} text-amber-800 decoration-amber-500 dark:text-amber-200 dark:decoration-amber-400`;
      default:
        return `${baseClasses} text-slate-600 decoration-slate-400 dark:text-slate-300 dark:decoration-slate-500`;
    }
  };

  const getMessageStyles = (senderType) => {
    switch (senderType) {
      case 'user':
        return 'ml-auto bg-primary-500 text-white border border-primary-400 shadow-sm dark:border-primary-400/60';
      case 'ai':
        return 'mr-auto bg-white border border-slate-200 shadow-sm dark:bg-slate-900/80 dark:border-slate-700 dark:text-slate-100';
      case 'system':
        return 'mx-auto bg-amber-50 border border-amber-200 text-amber-800 text-center shadow-sm dark:bg-amber-500/10 dark:border-amber-400/40 dark:text-amber-200';
      default:
        return 'bg-gray-100 border border-gray-200 shadow-sm dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-100';
    }
  };

  const getMaxWidth = (senderType) => {
    // AI messages can be wider to accommodate longer responses
    return senderType === 'ai' ? 'max-w-[95%]' : 'max-w-[85%]';
  };

  const getAnimationVariants = (senderType) => {
    const baseVariants = {
      hidden: { 
        opacity: 0, 
        y: 20,
        scale: 0.95
      },
      visible: { 
        opacity: 1, 
        y: 0,
        scale: 1,
        transition: {
          duration: 0.4,
          ease: [0.25, 0.46, 0.45, 0.94], // Custom easing curve
          type: "spring",
          stiffness: 100,
          damping: 15
        }
      }
    };

    switch (senderType) {
      case 'user':
        return {
          ...baseVariants,
          hidden: { ...baseVariants.hidden, x: 15 }
        };
      case 'ai':
        return {
          ...baseVariants,
          hidden: { ...baseVariants.hidden, x: -15 }
        };
      case 'system':
        return {
          ...baseVariants,
          visible: {
            ...baseVariants.visible,
            transition: {
              ...baseVariants.visible.transition,
              duration: 0.6,
              ease: "easeOut"
            }
          }
        };
      default:
        return baseVariants;
    }
  };

  return (
    <motion.div 
      className={`${getMaxWidth(message.senderType)} rounded-2xl p-6 mb-6 ${getMessageStyles(message.senderType)} transition-colors`}
      variants={getAnimationVariants(message.senderType)}
      initial="hidden"
      animate="visible"
    >
      {getSenderDisplay(message.sender, message.senderType) && (
        <div className={getSenderLabelClasses(message.senderType)}>
          {getSenderDisplay(message.sender, message.senderType)}
        </div>
      )}
      <div className={`${message.senderType === 'ai' ? 'markdown-content' : ''} leading-relaxed`}>
        {message.senderType === 'ai' ? (
          <ReactMarkdown
            components={{
              // Prevent dangerous HTML
              h1: 'h4',
              h2: 'h4',
              h3: 'h3',
              // Style code blocks with syntax highlighting
              code: ({ inline, className, children, ...props }) => {
                const languageMatch = /language-([\w+#-]+)/.exec(className || "");
                const normalizedChildren = String(children).replace(/\n$/, "");

                if (inline) {
                  return (
                    <code className={`inline-code ${className || ""}`} {...props}>
                      {children}
                    </code>
                  );
                }

                if (!normalizedChildren.includes("\n")) {
                  return (
                    <code
                      className={`inline-code ${className || ""}`}
                      {...props}
                    >
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
                    customStyle={{
                      background: "transparent",
                      margin: '15px 0',
                      padding: 10,
                    }}
                    codeTagProps={{
                      style: {
                        fontFamily: "inherit",
                      },
                    }}
                    className={`code-block ${className || ""}`.trim()}
                    {...props}
                  >
                    {normalizedChildren}
                  </SyntaxHighlighter>
                );
              },
              pre: ({ children }) => <>{children}</>,
              // Style lists
              ul: ({ children }) => <ul className="markdown-list">{children}</ul>,
              ol: ({ children }) => <ol className="markdown-list">{children}</ol>,
              // Style links
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
          <div>{renderPlainContent(message.content)}</div>
        )}
      </div>
      <div className={`text-xs mt-2 ${
        message.senderType === 'user' ? 'text-primary-200 dark:text-primary-300/80' : 
        message.senderType === 'ai' ? 'text-slate-400 dark:text-slate-500' : 
        'text-amber-600 dark:text-amber-200'
      }`}>
        {formatTime(message.timestamp)}
      </div>
    </motion.div>
  );
};

export default ChatMessage;
