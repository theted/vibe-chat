/**
 * useAISearch — builds the mention candidate list from the AI participants
 * that can actually answer (plus the @Chat assistant), and ranks it against
 * the current search term.
 */

import { useMemo } from "react";
import { normalizeAliasKey } from "@/utils/ai";
import {
  rankMentionOptions,
  toMentionOption,
  type MentionOption,
} from "@/utils/aiSearch";
import { getActiveParticipants } from "@/config/aiParticipants";
import { CHAT_ASSISTANT_MENTION } from "@/config/chatAssistantMention";
import { EXTRA_AI_PARTICIPANTS } from "@/config/extraAiParticipants";

export const useAISearch = (searchTerm = "") => {
  const mentionOptions = useMemo<MentionOption[]>(
    () =>
      // Parked models never load on the server, so offering one to mention is
      // a message nobody answers. EXTRA_AI_PARTICIPANTS are generic aliases
      // that resolve to an active model, so they carry no status of their own.
      // @Chat is always offered: the client has no cheap way to learn whether
      // the server initialised it, and when it didn't the mention just falls
      // through to the other AIs instead of going unanswered.
      [
        CHAT_ASSISTANT_MENTION,
        ...getActiveParticipants(),
        ...EXTRA_AI_PARTICIPANTS,
      ].map(toMentionOption),
    [],
  );

  /** What the user typed — for display, and for "is this still a mention?". */
  const normalizedTerm = searchTerm?.trim().toLowerCase() || "";
  /** The same term reduced to the form every candidate is indexed by. */
  const searchKey = normalizeAliasKey(normalizedTerm);

  const filteredAIs = useMemo(
    () => rankMentionOptions(mentionOptions, searchKey),
    [mentionOptions, searchKey],
  );

  return { filteredAIs, normalizedTerm };
};
