/**
 * What @Chat says when it hands an unanswered message to an AI (issue #311).
 * Templated on purpose: no model call, so recovering from dead air costs
 * nothing and can't itself fail. The @handle in each line is what summons
 * the AI; anyone else is named without "@" so they aren't summoned too.
 */
export const HANDOFF_TEXT = {
  NEAR_MISS: (token: string, asker: string, handle: string) =>
    `Nobody here goes by ${token}, so I'm passing ${asker}'s message to @${handle}.`,
  MENTION_UNANSWERED: (names: string, asker: string, handle: string) =>
    `${names} didn't get to ${asker}'s message, so I'm passing it to @${handle}.`,
  RETRY: (asker: string, handle: string) =>
    `@${handle}, ${asker}'s message is still waiting for an answer.`,
  NO_TAKERS: (asker: string, handle: string) =>
    `Nobody has picked up ${asker}'s message yet. @${handle}, could you take it?`,
  NOBODY_FREE: (asker: string) =>
    `${asker}, nobody has answered yet and no model here is free right now. Try again in a little while.`,
} as const;

export const HANDOFF_FALLBACK_ASKER = "someone";
