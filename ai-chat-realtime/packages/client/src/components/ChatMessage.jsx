/**
 * ChatMessage Component - Individual chat message display
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';

const ChatMessage = ({ message }) => {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const parseContentWithMentions = (content) => {
    if (!content) return content;
    
    // Enhanced regex to match @mentions with various formats
    const mentionRegex = /@([a-zA-Z0-9_\-\.]+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      
      // Add styled mention
      parts.push(
        <span
          key={`mention-${match.index}`}
          className="inline-flex items-center bg-primary-600 text-white px-2.5 py-1 rounded-lg font-semibold tracking-tight border border-primary-400 shadow-sm shadow-primary-300/40 dark:bg-primary-500/30 dark:text-primary-100 dark:border-primary-400/60 dark:shadow-primary-900/30"
          title={`Mentioned @${match[1]}`}
        >
          @{match[1]}
        </span>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }
    
    return parts.length > 1 ? parts : content;
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

  const getSenderDisplay = (sender, senderType) => {
    if (senderType === 'system') {
      return null; // System messages don't show sender
    }
    
    if (senderType === 'ai') {
      return `🤖 ${sender}`;
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
              h3: 'h4',
              // Style code blocks
              code: ({ children, className }) => (
                <code className={`inline-code ${className || ''}`}>
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className="code-block">{children}</pre>
              ),
              // Style lists
              ul: ({ children }) => <ul className="markdown-list">{children}</ul>,
              ol: ({ children }) => <ol className="markdown-list">{children}</ol>,
              // Style links
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="markdown-link">
                  {children}
                </a>
              ),
              // Custom text renderer to handle @mentions
              text: ({ children }) => parseContentWithMentions(children)
            }}
          >
            {message.content}
          </ReactMarkdown>
        ) : (
          <div>{parseContentWithMentions(message.content)}</div>
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
