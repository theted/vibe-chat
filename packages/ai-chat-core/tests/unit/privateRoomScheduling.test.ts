/**
 * Private 1-1 rooms: exactly one reply per user message, no background
 * chatter, and no context bleed between rooms.
 */

import { describe, it, expect } from "bun:test";
import { stripAIMentions } from "@/utils/orchestrator/mentionUtils.js";
import { ContextManager } from "@/orchestrator/ContextManager.js";
import { RoomScope } from "@/orchestrator/RoomScope.js";
import {
  makeTestScheduler,
  roomMessage,
} from "../helpers/schedulerTestUtils.js";

const PRIVATE_ROOM = "private:ada:AI_ONE";

const makeScheduler = (
  roomScope: RoomScope,
  allowedByRoom: Record<string, string[]> = {},
) =>
  makeTestScheduler({
    allowedByRoom,
    directOnlyRooms: roomScope.isDirectOnly(PRIVATE_ROOM) ? [PRIVATE_ROOM] : [],
  });

describe("private room scheduling", () => {
  const privateScope = () => {
    const roomScope = new RoomScope();
    roomScope.setAllowed(PRIVATE_ROOM, ["AI_ONE"]);
    roomScope.setDirectOnly(PRIVATE_ROOM, true);
    return roomScope;
  };

  it("answers a user message with exactly one reply", () => {
    const { scheduler, batches } = makeScheduler(privateScope(), {
      [PRIVATE_ROOM]: ["AI_ONE"],
    });

    scheduler.schedule(PRIVATE_ROOM, true);

    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(1);
    expect(batches[0][0].aiId).toBe("AI_ONE");
    expect(batches[0][0].isUserResponse).toBe(true);
  });

  it("still answers when the model is mid-reply in another room", () => {
    const { scheduler, services, batches } = makeScheduler(privateScope(), {
      [PRIVATE_ROOM]: ["AI_ONE"],
    });
    // The same model is busy answering in the main room
    services.get("AI_ONE")!.isGenerating = true;

    scheduler.schedule(PRIVATE_ROOM, true);

    expect(batches).toHaveLength(1);
    expect(batches[0][0].aiId).toBe("AI_ONE");
  });

  it("never schedules background rounds or silence-breakers", () => {
    const { scheduler, batches } = makeScheduler(privateScope(), {
      [PRIVATE_ROOM]: ["AI_ONE"],
    });

    scheduler.schedule(PRIVATE_ROOM, false);
    scheduler.schedule(PRIVATE_ROOM, false, { isReopening: true });

    expect(batches).toHaveLength(0);
  });

  it("lets the room's AI answer @Chat when @Chat mentions it", () => {
    const { scheduler, batches } = makeScheduler(privateScope(), {
      [PRIVATE_ROOM]: ["AI_ONE"],
    });

    scheduler.scheduleMentionReplies(
      PRIVATE_ROOM,
      roomMessage({
        senderType: "ai",
        aiId: "chat-assistant",
        sender: "@Chat",
        roomId: PRIVATE_ROOM,
        mentionsNormalized: ["aione"],
      }),
    );

    expect(batches).toHaveLength(1);
    expect(batches[0].map((reply) => reply.aiId)).toEqual(["AI_ONE"]);
    expect(batches[0][0].options.isMentioned).toBe(true);
  });

  it("never answers the room AI's own message", () => {
    const { scheduler, batches } = makeScheduler(privateScope(), {
      [PRIVATE_ROOM]: ["AI_ONE"],
    });

    scheduler.scheduleMentionReplies(
      PRIVATE_ROOM,
      roomMessage({
        senderType: "ai",
        aiId: "AI_ONE",
        roomId: PRIVATE_ROOM,
        mentionsNormalized: ["aione"],
      }),
    );

    expect(batches).toHaveLength(0);
  });

  it("folds a quick follow-up into the reply already queued", () => {
    const { scheduler, batches, pending } = makeScheduler(privateScope(), {
      [PRIVATE_ROOM]: ["AI_ONE"],
    });
    const first = roomMessage({ senderType: "user", content: "first" });
    const second = roomMessage({ senderType: "user", content: "second" });

    scheduler.schedule(PRIVATE_ROOM, true, { trigger: first });
    scheduler.schedule(PRIVATE_ROOM, true, { trigger: second });

    expect(batches).toHaveLength(1);
    expect(pending).toHaveLength(1);
    expect(pending[0].options.triggerMessage).toBe(second);
  });

  it("leaves ordinary rooms free to chat in the background", () => {
    const { scheduler, batches } = makeScheduler(privateScope());

    scheduler.schedule("default", true);
    scheduler.schedule("default", false);

    // Both rounds reach the queue; how many AIs each picks up is random
    expect(batches).toHaveLength(2);
    expect(batches[0].every((response) => response.isUserResponse)).toBe(true);
  });

  it("clearing a room's scope also clears direct-only", () => {
    const roomScope = privateScope();
    expect(roomScope.isDirectOnly(PRIVATE_ROOM)).toBe(true);

    roomScope.clear(PRIVATE_ROOM);

    expect(roomScope.isDirectOnly(PRIVATE_ROOM)).toBe(false);
    expect(roomScope.filter(PRIVATE_ROOM, ["AI_ONE", "AI_TWO"])).toEqual([
      "AI_ONE",
      "AI_TWO",
    ]);
  });
});

describe("room-scoped context", () => {
  const addMessage = (
    manager: ContextManager,
    roomId: string | undefined,
    content: string,
  ) =>
    manager.addMessage({
      sender: "ada",
      senderType: "user",
      content,
      roomId,
      timestamp: Date.now(),
    });

  it("keeps each room's messages to itself", () => {
    const manager = new ContextManager();
    addMessage(manager, "default", "public hello");
    addMessage(manager, PRIVATE_ROOM, "private secret");

    const privateContext = manager.getContextForAI(50, PRIVATE_ROOM);
    expect(privateContext).toHaveLength(1);
    expect(privateContext[0].content).toBe("private secret");

    const publicContext = manager.getContextForAI(50, "default");
    expect(publicContext).toHaveLength(1);
    expect(publicContext[0].content).toBe("public hello");
  });

  it("treats a missing room id as the default room", () => {
    const manager = new ContextManager();
    addMessage(manager, undefined, "legacy message");

    expect(manager.getContextForAI(50, "default")).toHaveLength(1);
    expect(manager.getContextForAI(50, PRIVATE_ROOM)).toHaveLength(0);
  });

  it("scopes the last message used for mention targeting", () => {
    const manager = new ContextManager();
    addMessage(manager, PRIVATE_ROOM, "private first");
    addMessage(manager, "default", "public latest");

    expect(manager.getLastMessage(PRIVATE_ROOM)?.content).toBe("private first");
    expect(manager.getLastMessage("default")?.content).toBe("public latest");
    expect(manager.getLastMessage()?.content).toBe("public latest");
  });

  it("evicts per room, so a busy main room cannot flush a private chat", () => {
    const manager = new ContextManager(3);
    addMessage(manager, PRIVATE_ROOM, "keep me");
    for (let index = 0; index < 10; index += 1) {
      addMessage(manager, "default", `public ${index}`);
    }

    const privateContext = manager.getContextForAI(50, PRIVATE_ROOM);
    expect(privateContext).toHaveLength(1);
    expect(privateContext[0].content).toBe("keep me");
    expect(manager.getContextForAI(50, "default")).toHaveLength(3);
  });

  it("keeps the evicted-message digest per room", () => {
    const manager = new ContextManager(1);
    addMessage(manager, PRIVATE_ROOM, "private evicted");
    addMessage(manager, PRIVATE_ROOM, "private latest");
    addMessage(manager, "default", "public evicted");
    addMessage(manager, "default", "public latest");

    expect(manager.getConversationDigest(PRIVATE_ROOM)).toContain(
      "private evicted",
    );
    expect(manager.getConversationDigest(PRIVATE_ROOM)).not.toContain(
      "public evicted",
    );
    expect(manager.getConversationDigest("default")).toContain(
      "public evicted",
    );
  });
});

describe("private room mentions", () => {
  const otherAiAliases = new Set(["claudesonnet45", "mimov26pro"]);
  const isOtherAI = (token: string) => otherAiAliases.has(token);

  it("demotes a mention of another AI to plain text", () => {
    expect(
      stripAIMentions(
        "Good point @claude-sonnet-4-5 — worth a look.",
        isOtherAI,
      ),
    ).toBe("Good point claude-sonnet-4-5 — worth a look.");
  });

  it("leaves the user's own handle alone", () => {
    expect(stripAIMentions("Sure @Theted, here you go.", isOtherAI)).toBe(
      "Sure @Theted, here you go.",
    );
  });

  it("handles several mentions in one response", () => {
    expect(
      stripAIMentions(
        "@mimo-v2.6-pro and @claude-sonnet-4-5 disagree, @Theted.",
        isOtherAI,
      ),
    ).toBe("mimo-v2.6-pro and claude-sonnet-4-5 disagree, @Theted.");
  });

  it("is a no-op on responses without mentions", () => {
    expect(stripAIMentions("No handles here at all.", isOtherAI)).toBe(
      "No handles here at all.",
    );
  });
});
