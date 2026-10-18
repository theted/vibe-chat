/**
 * Quote-replies as the orchestrator sees them: the [reply #n] marker a model
 * writes, how a quote-reply reads in the transcript, and who it summons.
 */

import { describe, expect, it } from "bun:test";
import { ContextManager } from "@/orchestrator/ContextManager.js";
import type { ContextMessage } from "@/types/orchestrator.js";
import {
  extractReplyRef,
  resolveReplyRef,
  toReplyFields,
} from "@/utils/orchestrator/quoteReplies.js";
import { buildTurnInstruction } from "@/utils/orchestrator/strategyUtils.js";
import {
  buildTranscript,
  stripOwnSpeakerLabel,
} from "@/utils/orchestrator/transcript.js";

const claude = {
  id: "anthropic_claude",
  name: "Claude",
  displayName: "Claude",
  alias: "claude",
  normalizedAlias: "claude",
};

const fromClaude = (id: string, content: string): ContextMessage => ({
  id,
  senderType: "ai",
  sender: "Claude",
  displayName: "Claude",
  normalizedAlias: "claude",
  aiId: claude.id,
  content,
});

const fromGPT = (id: string, content: string): ContextMessage => ({
  id,
  senderType: "ai",
  sender: "GPT",
  displayName: "GPT",
  normalizedAlias: "gpt",
  aiId: "openai_gpt",
  content,
});

const fromAda = (
  id: string,
  content: string,
  extra: Partial<ContextMessage> = {},
): ContextMessage => ({
  id,
  senderType: "user",
  sender: "Ada",
  displayName: "Ada",
  content,
  ...extra,
});

describe("extractReplyRef", () => {
  it("takes the marker off the front of a reply", () => {
    expect(extractReplyRef("[reply #3] Back to that point.")).toEqual({
      text: "Back to that point.",
      ref: 3,
    });
  });

  it("finds a marker after a greeting, keeping the first one", () => {
    expect(extractReplyRef("Hey! [Reply 7] Yes. [reply #9]")).toEqual({
      text: "Hey! Yes. ",
      ref: 7,
    });
  });

  it("leaves a reply without a marker alone", () => {
    expect(extractReplyRef("Just talking.")).toEqual({
      text: "Just talking.",
      ref: null,
    });
  });
});

describe("resolveReplyRef", () => {
  const context = [
    fromAda("m1", "first"),
    { id: "sys", senderType: "system", sender: "System", content: "Topic" },
    fromGPT("m3", "third"),
  ] as ContextMessage[];

  it("maps a transcript number back to its message", () => {
    expect(resolveReplyRef(context, 3)?.id).toBe("m3");
  });

  it("ignores numbers outside the transcript and system messages", () => {
    expect(resolveReplyRef(context, 0)).toBeNull();
    expect(resolveReplyRef(context, 4)).toBeNull();
    expect(resolveReplyRef(context, 2)).toBeNull();
    expect(resolveReplyRef(context, null)).toBeNull();
  });
});

describe("toReplyFields", () => {
  it("snapshots who said the quoted message and what", () => {
    expect(toReplyFields(fromGPT("m3", "  Tabs, obviously.  "))).toEqual({
      replyToMessageId: "m3",
      replyToSender: "GPT",
      replyToExcerpt: "Tabs, obviously.",
    });
  });
});

describe("quote-replies in the transcript", () => {
  const userTurns = (context: ContextMessage[]) =>
    buildTranscript(claude, context, "NOTE")
      .filter((turn) => turn.role === "user")
      .map((turn) => turn.content)
      .join("\n\n");

  it("numbers every label", () => {
    const transcript = userTurns([
      fromAda("m1", "Tabs or spaces?"),
      fromGPT("m2", "Tabs."),
    ]);

    expect(transcript).toContain("[#1 Ada (human)] Tabs or spaces?");
    expect(transcript).toContain("[#2 GPT] Tabs.");
  });

  it("says which message a quote-reply answers", () => {
    const transcript = userTurns([
      fromGPT("m1", "Tabs."),
      fromAda("m2", "Spaces, surely?"),
      fromAda("m3", "Why tabs?", toReplyFields(fromGPT("m1", "Tabs."))),
    ]);

    expect(transcript).toContain(
      "[#3 Ada (human), replying to #1 GPT] Why tabs?",
    );
  });

  it("quotes the model's own message by what it said", () => {
    const transcript = userTurns([
      fromClaude("m1", "Spaces win."),
      fromAda("m2", "Really?", toReplyFields(fromClaude("m1", "Spaces win."))),
    ]);

    expect(transcript).toContain(
      '[#2 Ada (human), replying to your message: "Spaces win."] Really?',
    );
  });

  it("falls back to the snapshot once the quoted message left the window", () => {
    const transcript = userTurns([
      fromAda("m9", "Still on this", {
        replyToMessageId: "gone",
        replyToSender: "GPT",
        replyToExcerpt: "Tabs.",
      }),
    ]);

    expect(transcript).toContain(
      '[#1 Ada (human), replying to GPT: "Tabs."] Still on this',
    );
  });

  it.each([
    ["[#12 Claude] Good point.", "Good point."],
    ["[#12 Claude, replying to #3 GPT] Good point.", "Good point."],
  ])("drops a copied numbered label from %p", (input, expected) => {
    expect(stripOwnSpeakerLabel(input, claude)).toBe(expected);
  });
});

describe("who a quote-reply summons", () => {
  const roomWith = (...messages: ContextMessage[]) => {
    const manager = new ContextManager();
    return messages.map((message) => manager.addMessage(message));
  };

  it("a person quoting a model mentions that model", () => {
    const [, reply] = roomWith(
      fromGPT("m1", "Tabs."),
      fromAda("m2", "Why?", toReplyFields(fromGPT("m1", "Tabs."))),
    );

    expect(reply?.mentionsNormalized).toEqual(["gpt"]);
    expect(reply?.replyToMessageId).toBe("m1");
  });

  it("a model's quote doesn't summon anyone", () => {
    const [, reply] = roomWith(fromGPT("m1", "Tabs."), {
      ...fromClaude("m2", "Agreed."),
      ...toReplyFields(fromGPT("m1", "")),
    });

    expect(reply?.mentionsNormalized).toEqual([]);
  });

  it("a quote of a message from another room resolves to nothing", () => {
    const manager = new ContextManager();
    manager.addMessage({ ...fromGPT("m1", "secret"), roomId: "private:x" });

    expect(manager.findMessage("default", "m1")).toBeUndefined();
    expect(manager.findMessage("private:x", "m1")?.id).toBe("m1");
  });
});

describe("the turn note for a quote-reply", () => {
  const strategy = {
    type: "direct",
    shouldMention: false,
    targetAI: null,
    mentionHandle: null,
    energy: "normal",
    windingDown: false,
  } as const;

  it("tells the model what the person was replying to", () => {
    const note = buildTurnInstruction(
      strategy,
      claude,
      fromAda("m2", "Why?", toReplyFields(fromGPT("m1", "Tabs."))),
    );

    expect(note).toContain(
      'That message quote-replies to GPT, who said: "Tabs."',
    );
  });

  it("says so when the person quoted the model itself", () => {
    const note = buildTurnInstruction(
      strategy,
      claude,
      fromAda("m2", "Why?", toReplyFields(fromClaude("m1", "Spaces win."))),
    );

    expect(note).toContain(
      'That message quote-replies to your earlier message: "Spaces win."',
    );
  });
});
