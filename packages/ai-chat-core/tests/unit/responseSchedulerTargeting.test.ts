/**
 * Who answers what: @mentioned AIs answer alone, nobody gets two queued
 * replies in a room, and nothing is scheduled past the room's AI budget.
 */

import { describe, expect, it } from "bun:test";
import { makeTestScheduler, roomMessage } from "../helpers/schedulerTestUtils.js";

const ROUNDS = 50;

describe("mentions decide who answers", () => {
  it("only the AI a person @mentioned answers them", () => {
    const { scheduler, pending, drain } = makeTestScheduler();
    const message = roomMessage({
      senderType: "user",
      content: "@AI_TWO what do you think?",
      mentionsNormalized: ["aitwo"],
    });

    for (let round = 0; round < ROUNDS; round += 1) {
      scheduler.schedule("default", true, { trigger: message });
      expect(pending.map((reply) => reply.aiId)).toEqual(["AI_TWO"]);
      expect(pending[0].options).toMatchObject({
        isMentioned: true,
        triggerMessage: message,
      });
      drain();
    }
  });

  it("waits for a busy mentioned AI instead of handing the question to another", () => {
    const { scheduler, services, pending } = makeTestScheduler();
    services.get("AI_TWO")!.isGenerating = true;

    scheduler.schedule("default", true, {
      trigger: roomMessage({ senderType: "user", mentionsNormalized: ["aitwo"] }),
    });

    expect(pending.map((reply) => reply.aiId)).toEqual(["AI_TWO"]);
  });

  it("an AI's @mention schedules exactly the AIs it names", () => {
    const { scheduler, pending } = makeTestScheduler();

    scheduler.scheduleMentionReplies(
      "default",
      roomMessage({
        senderType: "ai",
        aiId: "AI_ONE",
        mentionsNormalized: ["aithree", "aione"],
      }),
    );

    // AI_ONE mentioned itself; that never schedules a reply to itself
    expect(pending.map((reply) => reply.aiId)).toEqual(["AI_THREE"]);
    expect(pending[0].isUserResponse).toBe(false);
  });

  it("an AI message without @mentions schedules nobody right away", () => {
    const { scheduler, batches } = makeTestScheduler();

    scheduler.scheduleMentionReplies(
      "default",
      roomMessage({ senderType: "ai", aiId: "AI_ONE" }),
    );

    expect(batches).toHaveLength(0);
  });

  it("a background round never picks the message's own author", () => {
    const { scheduler, pending, drain } = makeTestScheduler();
    const message = roomMessage({ senderType: "ai", aiId: "AI_ONE" });

    for (let round = 0; round < ROUNDS; round += 1) {
      scheduler.schedule("default", false, { trigger: message });
      expect(pending.some((reply) => reply.aiId === "AI_ONE")).toBe(false);
      drain();
    }
  });
});

describe("one queued reply per AI", () => {
  it("doesn't queue a second reply for an AI that already has one", () => {
    const { scheduler, pending } = makeTestScheduler();
    const message = roomMessage({ senderType: "ai", aiId: "AI_ONE" });

    for (let round = 0; round < ROUNDS; round += 1) {
      scheduler.schedule("default", false, { trigger: message });
    }

    const aiIds = pending.map((reply) => reply.aiId);
    expect(new Set(aiIds).size).toBe(aiIds.length);
  });

  it("a mention retargets the reply already queued for that AI", () => {
    const { scheduler, pending } = makeTestScheduler();
    // AI_TWO was picked at random for an earlier round
    pending.push({
      aiId: "AI_TWO",
      roomId: "default",
      isUserResponse: false,
      options: { isMentioned: false },
      scheduledTime: Date.now() + 60_000,
    });
    const question = roomMessage({
      senderType: "ai",
      aiId: "AI_ONE",
      mentionsNormalized: ["aitwo"],
    });

    scheduler.scheduleMentionReplies("default", question);

    expect(pending).toHaveLength(1);
    expect(pending[0].options).toMatchObject({
      isMentioned: true,
      triggerMessage: question,
    });
  });

  it("an AI's mention doesn't take over a reply owed to a person", () => {
    const { scheduler, pending } = makeTestScheduler();
    const personAsks = roomMessage({
      senderType: "user",
      mentionsNormalized: ["aitwo"],
    });

    scheduler.schedule("default", true, { trigger: personAsks });
    scheduler.scheduleMentionReplies(
      "default",
      roomMessage({ senderType: "ai", aiId: "AI_ONE", mentionsNormalized: ["aitwo"] }),
    );

    expect(pending).toHaveLength(1);
    expect(pending[0].options.triggerMessage).toBe(personAsks);
  });
});

describe("AI message budget and holds", () => {
  it("schedules nothing once the room's budget is spent", () => {
    const { scheduler, batches } = makeTestScheduler({ budget: 0 });

    scheduler.schedule("default", true, {
      trigger: roomMessage({ senderType: "user" }),
    });
    scheduler.scheduleMentionReplies(
      "default",
      roomMessage({ senderType: "ai", aiId: "AI_ONE", mentionsNormalized: ["aitwo"] }),
    );

    expect(batches).toHaveLength(0);
  });

  it("never queues more replies than the budget has left", () => {
    const { scheduler, pending } = makeTestScheduler({ budget: 1 });

    scheduler.schedule("default", true, {
      trigger: roomMessage({
        senderType: "user",
        mentionsNormalized: ["aione", "aitwo", "aithree"],
      }),
    });

    expect(pending).toHaveLength(1);
  });

  it("starts no AI-driven rounds while @Chat is answering, but still answers people", () => {
    const { scheduler, pending } = makeTestScheduler({ heldRooms: ["default"] });

    scheduler.schedule("default", false, {
      trigger: roomMessage({ senderType: "ai", aiId: "AI_ONE" }),
    });
    scheduler.scheduleMentionReplies(
      "default",
      roomMessage({ senderType: "ai", aiId: "AI_ONE", mentionsNormalized: ["aitwo"] }),
    );
    expect(pending).toHaveLength(0);

    scheduler.schedule("default", true, {
      trigger: roomMessage({ senderType: "user" }),
    });
    expect(pending.length).toBeGreaterThan(0);
  });
});
