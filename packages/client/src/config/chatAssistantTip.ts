/**
 * Copy and matching for the one-time tip that introduces @Chat above the
 * composer (ChatAssistantTip, useChatAssistantTip). The handle comes from the
 * mention entry so the tip can't drift from what autocomplete inserts.
 */

import { CHAT_ASSISTANT_MENTION } from "./chatAssistantMention";

export const CHAT_TIP_HANDLE = `@${CHAT_ASSISTANT_MENTION.alias}`;

export const CHAT_TIP_LABEL = `About ${CHAT_TIP_HANDLE}`;

// Rendered after the handle: "Meet @Chat: mention it to ..."
export const CHAT_TIP_BODY =
  ": mention it to ask about this app's code, look something up on the web, or file a GitHub issue.";

export const CHAT_TIP_DISMISS_LABEL = `Dismiss ${CHAT_TIP_HANDLE} tip`;

/**
 * Same test the server's ChatAssistantService uses to decide @Chat is being
 * addressed. Someone who already writes @Chat doesn't need the tip.
 */
export const CHAT_TIP_MENTION_PATTERN = new RegExp(
  `@${CHAT_ASSISTANT_MENTION.alias}\\b`,
  "i",
);
