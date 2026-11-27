/**
 * People whose @mentions chip in the transcript: whoever is in the room now,
 * plus everyone who wrote one of the loaded messages. The room list alone
 * isn't enough: it only holds people connected right now (and the
 * preview list is empty for guests), so a mention of someone who just left,
 * or one in older history, would fall back to plain text while their own
 * messages sit right above it. Arbitrary @words are still left alone.
 */

import type { Message, Participant } from "@/types";

/**
 * Usernames that @mentions may chip: room participants first, then human
 * senders of `messages`, each name once (case-insensitively).
 */
export const getMentionableUsernames = (
  participants: Participant[] = [],
  messages: Message[] = [],
): string[] => {
  const humanSenders = messages
    .filter(({ senderType }) => senderType === "user")
    .map(({ sender }) => sender);
  const seen = new Set<string>();

  return [...participants.map(({ username }) => username), ...humanSenders]
    .map((name) => name?.trim())
    .filter((name): name is string => {
      if (!name || seen.has(name.toLowerCase())) return false;
      seen.add(name.toLowerCase());
      return true;
    });
};
