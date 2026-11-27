import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { CHAT_ASSISTANT_MENTION_ID } from "@/config/chatAssistantMention";
import { useAISearch } from "./useAISearch";

/** What ChatAssistantService answers to (`@${mentionName}\b`, case-blind). */
const SERVER_CHAT_MENTION_REGEX = /@Chat\b/i;

const search = (term: string) =>
  renderHook(() => useAISearch(term)).result.current.filteredAIs;

describe("useAISearch and @Chat", () => {
  it("lists @Chat first when nothing is typed yet", () => {
    const [first] = search("");
    expect(first.id).toBe(CHAT_ASSISTANT_MENTION_ID);
    expect(first.description).toMatch(/code/i);
  });

  it.each(["ch", "Ch", "chat", "CHAT"])(
    "keeps @Chat at the top for the prefix %s",
    (term) => {
      expect(search(term)[0].id).toBe(CHAT_ASSISTANT_MENTION_ID);
    },
  );

  it("leaves @Chat out of searches it doesn't match", () => {
    const ids = search("claude").map(({ id }) => id);
    expect(ids).not.toContain(CHAT_ASSISTANT_MENTION_ID);
    expect(ids.length).toBeGreaterThan(0);
  });

  it("inserts a mention the server recognises", () => {
    const chat = search("ch")[0];
    // The dialog inserts `@${name} ` (useMentionDetection.insertMention)
    expect(`@${chat.name} what does /clear do?`).toMatch(
      SERVER_CHAT_MENTION_REGEX,
    );
  });
});
