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
// Min height matches the send button row so a single line sits centred
const TEXTAREA_STYLE = { minHeight: "40px", maxHeight: "200px" };

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
      <form
        onSubmit={handleSubmit}
        className={`flex items-end gap-2 rounded-xl border border-line bg-surface p-1.5 pl-4 transition-colors focus-within:border-faint ${
          disabled ? "opacity-60" : ""
        }`}
      >
        <div className="relative min-w-0 flex-1">
          <textarea
            ref={textareaRef}
            className="block w-full resize-none overflow-y-auto border-0 bg-transparent px-0 py-2 text-[15px] leading-relaxed text-fg placeholder:text-faint focus:ring-0 focus:outline-none no-scrollbar disabled:cursor-not-allowed"
            value={message}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            placeholder="Message the room (@ to mention AI)"
            aria-label="Message"
            disabled={disabled}
            maxLength={MAX_MESSAGE_LENGTH}
            rows={1}
            style={TEXTAREA_STYLE}
          />
          {message.length > MESSAGE_LENGTH_WARNING_THRESHOLD && (
            <div className="absolute bottom-0 right-0 text-xs tabular-nums text-faint">
              {MAX_MESSAGE_LENGTH - message.length}
            </div>
          )}
        </div>
        <button
          type="submit"
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-raised disabled:text-faint"
          disabled={disabled || !message.trim()}
        >
          <Icon name="send" className="h-4 w-4" />
          <span className="hidden sm:inline">Send</span>
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
