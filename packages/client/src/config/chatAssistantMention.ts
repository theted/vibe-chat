/**
 * The @Chat resident assistant as a mention target. It is not an AI
 * participant (it never joins the roster or chats on its own), so it lives
 * here rather than in the participant config.
 *
 * `alias` must stay "Chat": the server's ChatAssistantService only answers
 * messages matching /@Chat\b/i, and the dialog inserts `@${alias} `.
 */

import type { MentionSource } from "@/utils/aiSearch";

/** Same id the server stamps on @Chat's answers (ChatAssistantService). */
export const CHAT_ASSISTANT_MENTION_ID = "internal_chat_assistant";

export const CHAT_ASSISTANT_MENTION: MentionSource = {
  id: CHAT_ASSISTANT_MENTION_ID,
  name: "Chat assistant",
  alias: "Chat",
  provider: "vibe-chat",
  emoji: "💬",
  description: "Ask about this app's code or search the web",
  isPinned: true,
};
