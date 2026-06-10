/**
 * useMentionDetection — detects an in-progress @mention at the cursor,
 * positions the AI selection dialog, and inserts the chosen mention.
 */

import { useState, type RefObject } from "react";
import type { DialogPosition } from "@/types";

const MENTION_AT_CURSOR_REGEX = /@([^\s@]*)$/;

const resolveCursorPosition = (
  value: string,
  target: HTMLTextAreaElement | null,
) => {
  const selectionStart = target?.selectionStart;
  const selectionEnd = target?.selectionEnd;
  if (typeof selectionStart === "number") {
    if (typeof selectionEnd === "number" && selectionEnd > selectionStart) {
      return selectionEnd;
    }
    return selectionStart;
  }
  if (typeof selectionEnd === "number") {
    return selectionEnd;
  }
  return value.length;
};

export const useMentionDetection = (
  textareaRef: RefObject<HTMLTextAreaElement | null>,
) => {
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [mentionPosition, setMentionPosition] = useState<DialogPosition>({
    x: 0,
    y: 0,
  });
  const [currentMention, setCurrentMention] = useState("");

  /** Call on input change to open/close the dialog based on the cursor. */
  const detectMention = (value: string, target: HTMLTextAreaElement | null) => {
    const cursorPosition = resolveCursorPosition(value, target);
    const textBeforeCursor = value.substring(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(MENTION_AT_CURSOR_REGEX);

    if (mentionMatch) {
      setCurrentMention(mentionMatch[1] || "");
      setShowAIDialog(true);

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

  const closeDialog = () => {
    setShowAIDialog(false);
    setCurrentMention("");
  };

  /**
   * Replaces the in-progress @mention with the selected AI and repositions
   * the cursor after it. Returns the new message, or null if no mention was
   * found at the cursor.
   */
  const insertMention = (message: string, aiName: string): string | null => {
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = message.substring(0, cursorPosition);
    const textAfterCursor = message.substring(cursorPosition);

    const mentionMatch = textBeforeCursor.match(MENTION_AT_CURSOR_REGEX);
    if (!mentionMatch) return null;

    const beforeMention = textBeforeCursor.substring(0, mentionMatch.index);
    const newMessage = beforeMention + "@" + aiName + " " + textAfterCursor;

    // Position cursor after the mention
    setTimeout(() => {
      const newCursorPos = beforeMention.length + aiName.length + 2;
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      textareaRef.current?.focus();
    }, 0);

    return newMessage;
  };

  return {
    showAIDialog,
    mentionPosition,
    currentMention,
    detectMention,
    closeDialog,
    insertMention,
  };
};
