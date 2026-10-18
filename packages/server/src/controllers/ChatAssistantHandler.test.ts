import { describe, expect, it } from "bun:test";
import type { ChatOrchestrator } from "@ai-chat/core";
import type { Server } from "socket.io";

import { CHAT_ASSISTANT_BUSY_NOTICE } from "@/config/serverConfig.js";
import type { ChatAssistantService } from "@/services/ChatAssistantService.js";
import type { ChatMessage } from "@/types.js";
import { ChatAssistantHandler } from "./ChatAssistantHandler.js";

const ROOM_ID = "room-1";

/**
 * The service's first answer stays pending until release() is called, so
 * the room is busy while a second question arrives.
 */
const makeHandler = () => {
  let release: () => void = () => undefined;
  const answerPending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const service = {
    chatHistoryLimit: 5,
    getMetadata: () => ({ aiId: "chat-assistant", displayName: "Chat" }),
    shouldHandle: () => true,
    createResponseFromContent: async () => {
      await answerPending;
      return { answer: "It works like this.", question: "how?" };
    },
  } as unknown as ChatAssistantService;

  const posted: ChatMessage[] = [];
  const heldRooms = new Set<string>();
  const budget = { remaining: 10 };
  const orchestrator = {
    aiServices: new Map(),
    getMentionTokenForAI: () => null,
    handleMessage: async (message: ChatMessage) => {
      posted.push(message);
    },
    canAIsSpeak: () => budget.remaining > 0,
    claimAITurn: () => {
      if (budget.remaining <= 0) return false;
      budget.remaining -= 1;
      return true;
    },
    setRoomOnHold: (roomId: string, onHold: boolean) => {
      if (onHold) heldRooms.add(roomId);
      else heldRooms.delete(roomId);
    },
  } as unknown as ChatOrchestrator;

  const handler = new ChatAssistantHandler({
    chatAssistantService: service,
    chatOrchestrator: orchestrator,
    io: {} as Server,
    getRecentMessages: async () => [],
  });
  return { handler, posted, release, heldRooms, budget };
};

describe("ChatAssistantHandler busy room", () => {
  it("tells a person their question was skipped while another is answered", async () => {
    const { handler, posted, release } = makeHandler();
    const first = handler.trigger({
      roomId: ROOM_ID,
      content: "@Chat how do mentions work?",
      origin: { type: "user", username: "alice" },
    });

    await handler.trigger({
      roomId: ROOM_ID,
      content: "@Chat and routing?",
      origin: { type: "user", username: "bob" },
    });
    expect(posted.map((message) => message.content)).toEqual([
      `@bob ${CHAT_ASSISTANT_BUSY_NOTICE}`,
    ]);
    expect(posted[0].suppressAIResponses).toBe(true);

    release();
    await first;
    expect(posted[1].content).toBe("@alice It works like this.");
  });

  it("skips an AI's question silently", async () => {
    const { handler, posted, release } = makeHandler();
    const first = handler.trigger({
      roomId: ROOM_ID,
      content: "@Chat how do mentions work?",
      origin: { type: "user", username: "alice" },
    });

    await handler.trigger({
      roomId: ROOM_ID,
      content: "@Chat what about scheduling?",
      origin: { type: "ai", sender: "Claude", aiId: "claude" },
    });
    expect(posted).toHaveLength(0);

    release();
    await first;
    expect(posted).toHaveLength(1);
  });
});

describe("ChatAssistantHandler AI message limit", () => {
  it("holds the room while answering and lifts the hold afterwards", async () => {
    const { handler, posted, release, heldRooms } = makeHandler();
    const answering = handler.trigger({
      roomId: ROOM_ID,
      content: "@Chat how do mentions work?",
      origin: { type: "user", username: "alice" },
    });

    expect(heldRooms.has(ROOM_ID)).toBe(true);
    release();
    await answering;

    expect(heldRooms.has(ROOM_ID)).toBe(false);
    expect(posted).toHaveLength(1);
  });

  it("doesn't start an AI's question when the room has no AI budget left", async () => {
    const { handler, posted, release, budget } = makeHandler();
    budget.remaining = 0;
    release();

    await handler.trigger({
      roomId: ROOM_ID,
      content: "@Chat what about scheduling?",
      origin: { type: "ai", sender: "Claude", aiId: "claude" },
    });

    expect(posted).toHaveLength(0);
  });

  it("drops a finished answer if the room hit its limit meanwhile", async () => {
    const { handler, posted, release, budget } = makeHandler();
    const answering = handler.trigger({
      roomId: ROOM_ID,
      content: "@Chat how do mentions work?",
      origin: { type: "ai", sender: "Claude", aiId: "claude" },
    });

    budget.remaining = 0;
    release();
    await answering;

    expect(posted).toHaveLength(0);
  });
});

describe("ChatAssistantHandler issue context", () => {
  const ask = async (roomId: string, origin: Record<string, unknown>) => {
    const calls: { issueContext?: Record<string, unknown> }[] = [];
    const service = {
      chatHistoryLimit: 2,
      getMetadata: () => ({ aiId: "chat-assistant", displayName: "Chat" }),
      shouldHandle: () => true,
      createResponseFromContent: async (_content: string, options: never) => {
        calls.push(options);
        return null;
      },
    } as unknown as ChatAssistantService;
    const orchestrator = {
      canAIsSpeak: () => true,
      setRoomOnHold: () => undefined,
    } as unknown as ChatOrchestrator;
    const roomMessages = Array.from({ length: 20 }, (_, index) => ({
      sender: "ada",
      senderType: "user",
      content: `message ${index}`,
    })) as ChatMessage[];

    const handler = new ChatAssistantHandler({
      chatAssistantService: service,
      chatOrchestrator: orchestrator,
      io: {} as Server,
      getRecentMessages: async () => roomMessages,
    });
    await handler.trigger({ roomId, content: "@Chat file it", origin });
    return calls[0].issueContext;
  };

  it("hands @Chat the main room's latest messages and who asked", async () => {
    const context = await ask("default", { type: "user", username: "ada" });

    expect(context).toMatchObject({
      roomId: "default",
      canFileIssues: true,
      requesterType: "human",
    });
    expect(
      (context?.transcript as ChatMessage[]).map((m) => m.content),
    ).toEqual(Array.from({ length: 12 }, (_, index) => `message ${index + 8}`));
  });

  it("keeps private chats out of public issues", async () => {
    const context = await ask("private:ada:claude", {
      type: "ai",
      aiId: "claude",
      sender: "Claude",
    });

    expect(context).toMatchObject({
      canFileIssues: false,
      requesterType: "ai",
    });
  });
});
