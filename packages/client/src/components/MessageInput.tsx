/**
 * MessageInput Component - Input area for sending messages
 */

import {
  useState,
  useRef,
  useEffect,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import AISelectionDialog from "./AISelectionDialog";
import Icon from "./Icon";
import { extractMentionsFromText } from "@/utils/mentions";
import type { MessageInputProps, DialogPosition } from "@/types";

const MessageInput = ({
  onSendMessage,
  disabled = false,
  onAIMention,
  onTypingStart,
  onTypingStop,
}: MessageInputProps) => {
  const [message, setMessage] = useState("");
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [mentionPosition, setMentionPosition] = useState<DialogPosition>({
    x: 0,
    y: 0,
  });
  const [currentMention, setCurrentMention] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      // Check for @mentions and trigger AI if mentioned
      const mentions = extractMentionsFromText(message);
      if (mentions.length > 0 && onAIMention) {
        onAIMention(mentions, message.trim());
      }
      onSendMessage(message.trim());
      setMessage("");

      // Stop typing indicator when message is sent
      if (isTyping && onTypingStop) {
        console.log("📤 Stopping typing indicator (message sent)");
        onTypingStop();
        setIsTyping(false);
      }

      textareaRef.current?.focus();
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Handle typing indicators
    if (value.trim() && !isTyping && onTypingStart) {
      console.log("📝 Starting typing indicator");
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
          console.log("⏰ Auto-stopping typing indicator (timeout)");
          onTypingStop();
          setIsTyping(false);
        }
      }, 2000);
    } else if (isTyping && onTypingStop) {
      // Stop typing immediately if field is empty
      console.log("🚫 Stopping typing indicator (empty field)");
      onTypingStop();
      setIsTyping(false);
    }

    // Check for @ trigger to show AI selection
    const cursorPosition =
      typeof e.target.selectionStart === "number"
        ? e.target.selectionStart
        : value.length;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@([^\s@]*)$/);

    if (mentionMatch) {
      setCurrentMention(mentionMatch[1] || "");
      setShowAIDialog(true);

      // Calculate position for dialog
      const textarea = textareaRef.current;
      if (textarea) {
        const rect = textarea.getBoundingClientRect();
        const scrollX = typeof window !== "undefined" ? window.scrollX : 0;
        const scrollY = typeof window !== "undefined" ? window.scrollY : 0;
        setMentionPosition({
          x: rect.left + scrollX + rect.width * 0.1,
          y: rect.top + scrollY,
        });
      }
    } else {
      setShowAIDialog(false);
      setCurrentMention("");
    }
  };

  const handleAISelect = (aiName: string) => {
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = message.substring(0, cursorPosition);
    const textAfterCursor = message.substring(cursorPosition);

    // Replace the current @mention with the selected AI
    const mentionMatch = textBeforeCursor.match(/@([^\s@]*)$/);
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.substring(0, mentionMatch.index);
      const newMessage = beforeMention + "@" + aiName + " " + textAfterCursor;
      setMessage(newMessage);

      // Position cursor after the mention
      setTimeout(() => {
        const newCursorPos = beforeMention.length + aiName.length + 2;
        textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current?.focus();
      }, 0);
    }

    setShowAIDialog(false);
    setCurrentMention("");
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
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
      <form onSubmit={handleSubmit} className="flex gap-4 items-center p-1">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            className="w-full px-5 py-4 pr-12 rounded-2xl border border-slate-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-200 outline-none transition-all resize-none placeholder-slate-400 bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md no-scrollbar overflow-y-auto dark:bg-slate-900/80 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-primary-400 dark:focus:ring-primary-500/30"
            value={message}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            placeholder="Type your message... (Use @ to mention an AI, Enter to send, Shift+Enter for new line)"
            disabled={disabled}
            maxLength={5000}
            rows={1}
            style={{ minHeight: "52px", maxHeight: "200px" }}
          />
          {message.length > 4500 && (
            <div className="absolute bottom-2 right-2 text-xs text-slate-400">
              {5000 - message.length}
            </div>
          )}
        </div>
        <button
          type="submit"
          className="send-button h-[52px] min-w-[120px] px-6 bg-emerald-500 text-white font-semibold rounded-xl shadow-md flex items-center justify-center gap-2 group hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-emerald-200 disabled:text-emerald-600 disabled:cursor-not-allowed dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-slate-900 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
          disabled={disabled || !message.trim()}
        >
          <Icon
            name="send"
            className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300"
          />
          <span className="hidden sm:inline group-hover:animate-pulse">
            Send
          </span>
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
