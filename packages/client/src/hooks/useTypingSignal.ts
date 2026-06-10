/**
 * useTypingSignal — emits typing start/stop callbacks with an inactivity
 * timeout, mirroring the chat's typing-indicator protocol.
 */

import { useEffect, useRef, useState } from "react";

const TYPING_INACTIVITY_TIMEOUT_MS = 2_000;

interface TypingSignalOptions {
  onTypingStart?: () => void;
  onTypingStop?: () => void;
}

export const useTypingSignal = ({
  onTypingStart,
  onTypingStop,
}: TypingSignalOptions) => {
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Call on every input change with the current value. */
  const signalActivity = (value: string) => {
    if (value.trim() && !isTyping && onTypingStart) {
      onTypingStart();
      setIsTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (value.trim()) {
      typingTimeoutRef.current = setTimeout(() => {
        if (isTyping && onTypingStop) {
          onTypingStop();
          setIsTyping(false);
        }
      }, TYPING_INACTIVITY_TIMEOUT_MS);
    } else if (isTyping && onTypingStop) {
      onTypingStop();
      setIsTyping(false);
    }
  };

  /** Call when a message is sent. */
  const stopTyping = () => {
    if (isTyping && onTypingStop) {
      onTypingStop();
      setIsTyping(false);
    }
  };

  // Cleanup pending timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return { signalActivity, stopTyping };
};
