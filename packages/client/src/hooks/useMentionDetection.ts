/**
 * useMentionDetection — detects an in-progress @mention at the cursor,
 * positions the AI selection dialog, and inserts the chosen mention.
 */

import { useState, type RefObject } from "react";
import type { DialogPosition } from "@/types";

/**
 * The in-progress mention at the cursor. Spaces are allowed (capped at
 * MAX_MENTION_WORDS - 1) because several providers are multi-word — "Nex AGI",
 * "Sakana AI", "Hugging Face" — and a space-terminated pattern made them
 * impossible to search even though the ranking handles them. The cap stops the
 * dialog trailing a whole sentence after a completed mention.
 */
const MAX_MENTION_WORDS = 3;
const MENTION_AT_CURSOR_REGEX = new RegExp(
  `@([^\\s@]*(?: [^\\s@]*){0,${MAX_MENTION_WORDS - 1}})$`,
);

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
        // Viewport coords: the dialog is position: fixed (portaled to body),
        // so scroll offsets must NOT be added.
        const rect = textarea.getBoundingClientRect();
        setMentionPosition({
          x: rect.left + rect.width * 0.1,
          y: rect.top,
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
