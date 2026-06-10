/**
 * useChatAutoScroll — keeps the chat pinned to the bottom: smooth-scrolls
 * on new messages (unless the user scrolled up) and jumps to the bottom
 * right after joining a room.
 */

import { useEffect, type RefObject } from "react";
import type { Message } from "@/types";

const SCROLL_ON_JOIN_DELAY_MS = 100;

export const useChatAutoScroll = (
  messagesEndRef: RefObject<HTMLDivElement | null>,
  messages: Message[],
  showScrollButton: boolean,
  isJoined: boolean,
) => {
  // Auto-scroll on new messages
  useEffect(() => {
    if (!messagesEndRef.current) return;
    if (!showScrollButton) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messagesEndRef, messages, showScrollButton]);

  // Scroll to bottom on join
  useEffect(() => {
    if (isJoined && messagesEndRef.current) {
      setTimeout(
        () => messagesEndRef.current?.scrollIntoView({ behavior: "instant" }),
        SCROLL_ON_JOIN_DELAY_MS,
      );
    }
  }, [messagesEndRef, isJoined]);
};
