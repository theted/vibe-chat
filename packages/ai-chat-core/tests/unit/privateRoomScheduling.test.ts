/**
 * Private rooms: a 1-1 chat gets exactly one reply per user message and no
 * background chatter; a private group answers like the main room from its
 * members only. No context bleeds between rooms.
 */

import { describe, it, expect } from "bun:test";
import { stripAIMentions } from "@/utils/orchestrator/mentionUtils.js";
import { ContextManager } from "@/orchestrator/ContextManager.js";
import { RoomScope } from "@/orchestrator/RoomScope.js";
import { PRIVATE_GROUP_RESPONDERS } from "@/orchestrator/constants.js";
import {
  makeTestScheduler,
  roomMessage,
} from "../helpers/schedulerTestUtils.js";

const PRIVATE_ROOM = "private:ada:AI_ONE";
const GROUP_ROOM = "private:ada:AI_ONE+AI_TWO";
const GROUP_MEMBERS = ["AI_ONE", "AI_TWO"];

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

describe("private group scheduling", () => {
  const makeGroupScheduler = (members = GROUP_MEMBERS) =>
    makeTestScheduler({
      allowedByRoom: { [GROUP_ROOM]: members },
      privateGroupRooms: [GROUP_ROOM],
    });

  it("answers a user message from its members only", () => {
    const { scheduler, batches, drain } = makeGroupScheduler();

    for (let round = 0; round < 20; round += 1) {
      scheduler.schedule(GROUP_ROOM, true);
      expect(batches).toHaveLength(1);
      const responders = batches[0].map((reply) => reply.aiId);
      expect(responders.length).toBeGreaterThanOrEqual(1);
      expect(responders.every((aiId) => GROUP_MEMBERS.includes(aiId))).toBe(
        true,
      );
      drain();
    }
  });

  it("lets more than one member answer, up to the group cap", () => {
    const { scheduler, batches, drain } = makeGroupScheduler([
      "AI_ONE",
      "AI_TWO",
      "AI_THREE",
    ]);
    const sizes = new Set<number>();

    for (let round = 0; round < 50; round += 1) {
      scheduler.schedule(GROUP_ROOM, true);
      sizes.add(batches[0].length);
      drain();
    }

    expect(Math.max(...sizes)).toBeLessThanOrEqual(
      PRIVATE_GROUP_RESPONDERS.MAX,
    );
    expect(Math.max(...sizes)).toBeGreaterThan(1);
  });

  it("still answers when every member is mid-reply in another room", () => {
    const { scheduler, services, batches } = makeGroupScheduler();
    GROUP_MEMBERS.forEach((aiId) => {
      services.get(aiId)!.isGenerating = true;
    });

    scheduler.schedule(GROUP_ROOM, true);

    expect(batches).toHaveLength(1);
    expect(batches[0].length).toBeGreaterThanOrEqual(1);
  });

  it("answers a user's @mention with just that member", () => {
    const { scheduler, batches } = makeGroupScheduler();

    scheduler.schedule(GROUP_ROOM, true, {
      trigger: roomMessage({
        senderType: "user",
        roomId: GROUP_ROOM,
        mentionsNormalized: ["aitwo"],
      }),
    });

    expect(batches).toHaveLength(1);
    expect(batches[0].map((reply) => reply.aiId)).toEqual(["AI_TWO"]);
  });

  it("lets members answer each other's @mentions, but not outsiders", () => {
    const { scheduler, batches } = makeGroupScheduler();
    const fromAiOne = (mention: string) =>
      roomMessage({
        senderType: "ai",
        aiId: "AI_ONE",
        roomId: GROUP_ROOM,
        mentionsNormalized: [mention],
      });

    scheduler.scheduleMentionReplies(GROUP_ROOM, fromAiOne("aithree"));
    expect(batches).toHaveLength(0);

    scheduler.scheduleMentionReplies(GROUP_ROOM, fromAiOne("aitwo"));
    expect(batches).toHaveLength(1);
    expect(batches[0].map((reply) => reply.aiId)).toEqual(["AI_TWO"]);
  });

  it("runs in one private mode at a time", () => {
    const roomScope = new RoomScope();
    roomScope.setPrivateGroup(GROUP_ROOM, true);
    expect(roomScope.isPrivateGroup(GROUP_ROOM)).toBe(true);

    // A group down to one available model behaves as a 1-1 chat
    roomScope.setDirectOnly(GROUP_ROOM, true);
    expect(roomScope.isPrivateGroup(GROUP_ROOM)).toBe(false);
    expect(roomScope.isDirectOnly(GROUP_ROOM)).toBe(true);

    roomScope.setPrivateGroup(GROUP_ROOM, true);
    roomScope.clear(GROUP_ROOM);
    expect(roomScope.isPrivateGroup(GROUP_ROOM)).toBe(false);
    expect(roomScope.isDirectOnly(GROUP_ROOM)).toBe(false);
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

describe("copying a room's context", () => {
  const addMessage = (
    manager: ContextManager,
    roomId: string,
    content: string,
  ) =>
    manager.addMessage({
      sender: "ada",
      senderType: "user",
      content,
      roomId,
      timestamp: Date.now(),
    });

  it("seeds an empty room with the other room's messages and digest", () => {
    const manager = new ContextManager(2);
    addMessage(manager, PRIVATE_ROOM, "evicted earlier");
    addMessage(manager, PRIVATE_ROOM, "first");
    addMessage(manager, PRIVATE_ROOM, "second");

    expect(manager.copyRoom(PRIVATE_ROOM, GROUP_ROOM)).toBe(2);

    const groupContext = manager.getContextForAI(50, GROUP_ROOM);
    expect(groupContext.map((message) => message.content)).toEqual([
      "first",
      "second",
    ]);
    expect(groupContext.every((message) => message.roomId === GROUP_ROOM)).toBe(
      true,
    );
    expect(manager.getConversationDigest(GROUP_ROOM)).toContain(
      "evicted earlier",
    );
    // The source room keeps its own conversation
    expect(manager.getContextForAI(50, PRIVATE_ROOM)).toHaveLength(2);
  });

  it("leaves a room that already has a conversation alone", () => {
    const manager = new ContextManager();
    addMessage(manager, PRIVATE_ROOM, "from the 1-1");
    addMessage(manager, GROUP_ROOM, "the group's own");

    expect(manager.copyRoom(PRIVATE_ROOM, GROUP_ROOM)).toBe(0);
    expect(
      manager.getContextForAI(50, GROUP_ROOM).map((message) => message.content),
    ).toEqual(["the group's own"]);
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
