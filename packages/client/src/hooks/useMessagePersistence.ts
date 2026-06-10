/**
 * useMessagePersistence Hook - Load/save messages to localStorage
 */

import { useEffect } from "react";
import { LOCAL_STORAGE_MESSAGES_LIMIT, STORAGE_KEYS } from "@/constants/storage";
import {
  getStorageJson,
  removeStorageItem,
  setStorageJson,
} from "@/utils/storage";
import type { Message } from "@/types";

type StateSetter<T> = React.Dispatch<React.SetStateAction<T>>;

export const useMessagePersistence = (
  messages: Message[],
  setMessages: StateSetter<Message[]>,
  isJoined: boolean,
) => {
  // Load on mount
  useEffect(() => {
    const parsed = getStorageJson<Message[]>(STORAGE_KEYS.MESSAGES);
    if (Array.isArray(parsed)) {
      setMessages(parsed);
    }
  }, [setMessages]);

  // Persist on change
  useEffect(() => {
    if (!isJoined || messages.length === 0) return;
    setStorageJson(
      STORAGE_KEYS.MESSAGES,
      messages.slice(-LOCAL_STORAGE_MESSAGES_LIMIT),
    );
  }, [messages, isJoined]);

  const clearMessages = () => {
    setMessages([]);
    removeStorageItem(STORAGE_KEYS.MESSAGES);
  };

  return { clearMessages };
};
