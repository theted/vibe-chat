/**
 * MessageInput Component - Input area for sending messages (textarea sizing,
 * typing signals, and mention detection are extracted hooks)
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
import { useAutoResizeTextarea } from "@/hooks/useAutoResizeTextarea";
import { useMentionDetection } from "@/hooks/useMentionDetection";
import { useTypingSignal } from "@/hooks/useTypingSignal";
import type { MessageInputProps } from "@/types";

const MAX_MESSAGE_LENGTH = 5_000;
const MESSAGE_LENGTH_WARNING_THRESHOLD = 4_500;
const TEXTAREA_MIN_HEIGHT = "52px";
const TEXTAREA_MAX_HEIGHT = "200px";

const MessageInput = ({
  onSendMessage,
  disabled = false,
  onTypingStart,
  onTypingStop,
}: MessageInputProps) => {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { signalActivity, stopTyping } = useTypingSignal({
    onTypingStart,
    onTypingStop,
  });
  const {
    showAIDialog,
    mentionPosition,
    currentMention,
    detectMention,
    closeDialog,
    insertMention,
  } = useMentionDetection(textareaRef);

  useAutoResizeTextarea(textareaRef, message);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      // Mentions are parsed server-side from the message content
      onSendMessage(message.trim());
      setMessage("");
      stopTyping();
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
    signalActivity(value);
    detectMention(value, e.target);
  };

  const handleAISelect = (aiName: string) => {
    const newMessage = insertMention(message, aiName);
    if (newMessage !== null) {
      setMessage(newMessage);
    }
    closeDialog();
  };

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <>
      <form onSubmit={handleSubmit} className="flex gap-2 items-center p-1">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            className="input-glass w-full px-3 py-2 sm:px-4 sm:py-3 lg:px-5 lg:py-4 pr-10 rounded-2xl border border-slate-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-200 outline-none transition-all resize-none placeholder-slate-400 bg-white/90 backdrop-blur-sm no-scrollbar overflow-y-auto dark:bg-slate-900/80 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-primary-400 dark:focus:ring-primary-500/30 text-sm"
            value={message}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            placeholder="Message... (@ to mention AI)"
            disabled={disabled}
            maxLength={MAX_MESSAGE_LENGTH}
            rows={1}
            style={{ minHeight: TEXTAREA_MIN_HEIGHT, maxHeight: TEXTAREA_MAX_HEIGHT }}
          />
          {message.length > MESSAGE_LENGTH_WARNING_THRESHOLD && (
            <div className="absolute bottom-2 right-2 text-xs text-slate-400">
              {MAX_MESSAGE_LENGTH - message.length}
            </div>
          )}
        </div>
        <button
          type="submit"
          className="send-button glass-btn h-[40px] w-[40px] sm:h-[44px] sm:w-[44px] lg:h-[52px] lg:w-auto lg:min-w-[120px] px-0 lg:px-6 bg-emerald-500/85 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 group hover:bg-emerald-500 hover:shadow-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-emerald-200 disabled:text-emerald-600 disabled:cursor-not-allowed disabled:shadow-none dark:bg-emerald-500/80 dark:hover:bg-emerald-400/90 dark:text-slate-900 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
          disabled={disabled || !message.trim()}
        >
          <Icon
            name="send"
            className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300"
          />
          <span className="hidden lg:inline group-hover:animate-pulse">
            Send
          </span>
        </button>
      </form>

      {showAIDialog && (
        <AISelectionDialog
          isOpen={showAIDialog}
          onClose={closeDialog}
          onSelect={handleAISelect}
          searchTerm={currentMention}
          position={mentionPosition}
        />
      )}
    </>
  );
};

export default MessageInput;
