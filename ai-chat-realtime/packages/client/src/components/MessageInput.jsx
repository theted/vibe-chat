/**
 * MessageInput Component - Input area for sending messages
 */

import React, { useState, useRef, useEffect } from 'react';

const MessageInput = ({ onSendMessage, disabled = false }) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      textareaRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e) => {
    setMessage(e.target.value);
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [message]);

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <form onSubmit={handleSubmit} className="message-form">
      <textarea
        ref={textareaRef}
        className="message-input"
        value={message}
        onChange={handleChange}
        onKeyPress={handleKeyPress}
        placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
        disabled={disabled}
        maxLength={1000}
        rows={1}
      />
      <button
        type="submit"
        className="send-button"
        disabled={disabled || !message.trim()}
      >
        Send
      </button>
    </form>
  );
};

export default MessageInput;