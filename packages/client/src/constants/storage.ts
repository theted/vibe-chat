export const LOCAL_STORAGE_MESSAGES_LIMIT = 80;

export const STORAGE_KEYS = {
  THEME: "ai-chat-theme",
  MESSAGES: "ai-chat-messages",
  USERNAME: "ai-chat-username",
  // Set once the first-use @Chat tip is dismissed, so it never comes back
  CHAT_TIP_SEEN: "ai-chat-seen-chat-tip",
} as const;

export const FAVORITES_STORAGE_KEY = "ai-chat-favorites";
