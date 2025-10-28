/**
 * ChatMessage Component - Individual chat message display
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';

const ChatMessage = ({ message }) => {
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

  const getSenderDisplay = (sender, senderType) => {
    if (senderType === 'system') {
      return null; // System messages don't show sender
    }
    
    if (senderType === 'ai') {
      return `🤖 ${sender}`;
    }
    
    return `👤 ${sender}`;
  };

  return (
    <div className={getMessageClass(message.senderType)}>
      {getSenderDisplay(message.sender, message.senderType) && (
        <div className="message-sender">
          {getSenderDisplay(message.sender, message.senderType)}
        </div>
      )}
      <div className="message-content">
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
              )
            }}
          >
            {message.content}
          </ReactMarkdown>
        ) : (
          message.content
        )}
      </div>
      <div className="message-time">
        {formatTime(message.timestamp)}
      </div>
    </div>
  );
};

export default ChatMessage;