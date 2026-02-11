/**
 * useMessagePersistence Hook - Load/save messages to localStorage
 */

import { useEffect } from "react";
import { LOCAL_STORAGE_MESSAGES_LIMIT } from "@/constants/storage";
import type { Message } from "@/types";

const STORAGE_KEY = "ai-chat-messages";

type StateSetter<T> = React.Dispatch<React.SetStateAction<T>>;

export const useMessagePersistence = (
  messages: Message[],
  setMessages: StateSetter<Message[]>,
  isJoined: boolean,
) => {
  // Load on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }
    } catch (error) {
      console.warn("Failed to load messages from localStorage:", error);
    }
  }, [setMessages]);

  // Persist on change
  useEffect(() => {
    if (!isJoined || messages.length === 0) return;

    try {
      const limited = messages.slice(-LOCAL_STORAGE_MESSAGES_LIMIT);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
    } catch (error) {
      console.warn("Failed to save messages to localStorage:", error);
    }
  }, [messages, isJoined]);

  const clearMessages = () => {
    setMessages([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("Failed to clear messages from localStorage:", error);
    }
  };

  return { clearMessages };
};
