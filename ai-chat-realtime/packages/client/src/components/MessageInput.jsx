/**
 * MessageInput Component - Input area for sending messages
 */

import React, { useState, useRef, useEffect } from 'react';
import AISelectionDialog from './AISelectionDialog';
import Icon from './Icon.jsx';

const MessageInput = ({ onSendMessage, disabled = false, onAIMention, onTypingStart, onTypingStop }) => {
  const [message, setMessage] = useState('');
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ x: 0, y: 0 });
  const [currentMention, setCurrentMention] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      // Check for @mentions and trigger AI if mentioned
      const mentions = extractMentions(message);
      if (mentions.length > 0 && onAIMention) {
        onAIMention(mentions, message.trim());
      }
      onSendMessage(message.trim());
      setMessage('');
      
      // Stop typing indicator when message is sent
      if (isTyping && onTypingStop) {
        console.log('📤 Stopping typing indicator (message sent)');
        onTypingStop();
        setIsTyping(false);
      }
      
      textareaRef.current?.focus();
    }
  };

  const extractMentions = (text) => {
    const mentionRegex = /@([a-zA-Z0-9_\-\.]+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1].toLowerCase());
    }
    return mentions;
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setMessage(value);
    
    // Handle typing indicators
    if (value.trim() && !isTyping && onTypingStart) {
      console.log('📝 Starting typing indicator');
      onTypingStart();
      setIsTyping(true);
    }
    
    // Clear previous timeout and set new one
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (value.trim()) {
      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        if (isTyping && onTypingStop) {
          console.log('⏰ Auto-stopping typing indicator (timeout)');
          onTypingStop();
          setIsTyping(false);
        }
      }, 2000);
    } else if (isTyping && onTypingStop) {
      // Stop typing immediately if field is empty
      console.log('🚫 Stopping typing indicator (empty field)');
      onTypingStop();
      setIsTyping(false);
    }
    
    // Check for @ trigger to show AI selection
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9_\-\.]*)$/);
    
    // Only show dialog if we're actually typing an AI mention (not file names like .env.example)
    if (mentionMatch && (!mentionMatch[1].includes('.') || mentionMatch[1].match(/^[a-zA-Z]/))) {
      setCurrentMention(mentionMatch[1]);
      setShowAIDialog(true);
      
      // Calculate position for dialog
      const textarea = textareaRef.current;
      if (textarea) {
        const rect = textarea.getBoundingClientRect();
        setMentionPosition({
          x: rect.left,
          y: rect.top - 10
        });
      }
    } else {
      setShowAIDialog(false);
      setCurrentMention('');
    }
  };

  const handleAISelect = (aiName) => {
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = message.substring(0, cursorPosition);
    const textAfterCursor = message.substring(cursorPosition);
    
    // Replace the current @mention with the selected AI
    const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9_\-\.]*)$/);
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.substring(0, mentionMatch.index);
      const newMessage = beforeMention + '@' + aiName + ' ' + textAfterCursor;
      setMessage(newMessage);
      
      // Position cursor after the mention
      setTimeout(() => {
        const newCursorPos = beforeMention.length + aiName.length + 2;
        textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current?.focus();
      }, 0);
    }
    
    setShowAIDialog(false);
    setCurrentMention('');
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

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <form onSubmit={handleSubmit} className="flex gap-4 items-end p-1">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            className="w-full px-5 py-4 pr-12 rounded-2xl border border-slate-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-200 outline-none transition-all resize-none placeholder-slate-400 bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md dark:bg-slate-900/80 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-primary-400 dark:focus:ring-primary-500/30"
            value={message}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            placeholder="Type your message... (Use @ to mention an AI, Enter to send, Shift+Enter for new line)"
            disabled={disabled}
            maxLength={5000}
            rows={1}
            style={{ minHeight: '52px', maxHeight: '200px' }}
          />
          {message.length > 4500 && (
            <div className="absolute bottom-2 right-2 text-xs text-slate-400">
              {5000 - message.length}
            </div>
          )}
        </div>
        <button
          type="submit"
          className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-300 hover:from-emerald-400 hover:via-emerald-500 hover:to-teal-400 disabled:from-slate-300 disabled:to-slate-400 text-emerald-900 p-4 rounded-2xl font-semibold disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 group dark:from-emerald-400 dark:via-emerald-500 dark:to-teal-500 dark:hover:from-emerald-500 dark:hover:via-emerald-600 dark:hover:to-teal-600 dark:text-slate-900 dark:disabled:from-slate-700 dark:disabled:to-slate-800"
          disabled={disabled || !message.trim()}
        >
          <Icon
            name="send"
            className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300"
          />
          <span className="hidden sm:inline group-hover:animate-pulse">Send</span>
        </button>
      </form>
      
      {showAIDialog && (
        <AISelectionDialog
          isOpen={showAIDialog}
          onClose={() => setShowAIDialog(false)}
          onSelect={handleAISelect}
          searchTerm={currentMention}
          position={mentionPosition}
        />
      )}
    </>
  );
};

export default MessageInput;
