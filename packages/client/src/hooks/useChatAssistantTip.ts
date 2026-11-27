/**
 * useChatAssistantTip - seen-state for the one-time @Chat tip. The tip
 * appears on the first focus of the composer and is gone for good once
 * dismissed, or once the person writes @Chat themselves.
 */

import { useCallback, useState } from "react";
import { CHAT_TIP_MENTION_PATTERN } from "@/config/chatAssistantTip";
import { STORAGE_KEYS } from "@/constants/storage";

// Read directly rather than through getStorageItem: that helper turns a
// throwing storage into "no value", which here would mean showing the tip on
// every visit. If storage is unusable we can't remember a dismissal, so the
// tip stays hidden instead.
const readHasSeenTip = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEYS.CHAT_TIP_SEEN) !== null;
  } catch (error) {
    console.warn("Could not read @Chat tip state, hiding the tip:", error);
    return true;
  }
};

const writeHasSeenTip = () => {
  try {
    localStorage.setItem(STORAGE_KEYS.CHAT_TIP_SEEN, "1");
  } catch (error) {
    // Still hidden for this session; it may come back on the next visit
    console.warn("Could not save @Chat tip state:", error);
  }
};

/**
 * @returns isVisible, whether the tip should render now; handleInputFocus,
 * to call when the composer gains focus; dismiss, which hides it and records
 * that in localStorage; dismissIfMentioned, which dismisses it when the
 * given draft already addresses @Chat.
 */
export const useChatAssistantTip = () => {
  const [hasSeenTip, setHasSeenTip] = useState(readHasSeenTip);
  const [hasFocusedInput, setHasFocusedInput] = useState(false);

  const handleInputFocus = useCallback(() => setHasFocusedInput(true), []);

  const dismiss = useCallback(() => {
    if (hasSeenTip) return;
    writeHasSeenTip();
    setHasSeenTip(true);
  }, [hasSeenTip]);

  const dismissIfMentioned = useCallback(
    (draft: string) => {
      if (CHAT_TIP_MENTION_PATTERN.test(draft)) dismiss();
    },
    [dismiss],
  );

  return {
    isVisible: !hasSeenTip && hasFocusedInput,
    handleInputFocus,
    dismiss,
    dismissIfMentioned,
  };
};
