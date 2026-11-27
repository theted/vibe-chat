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
const makeHandler = (
  answer = "It works like this.",
  { isChatEnabled = true } = {},
) => {
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
      return { answer, question: "how?" };
    },
  } as unknown as ChatAssistantService;

  const posted: ChatMessage[] = [];
  const heldRooms = new Set<string>();
  const budget = { remaining: 10 };
  const clears = { roomClearedAt: 0 };
  const orchestrator = {
    aiServices: new Map(),
    wasRoomClearedSince: (_roomId: string, since: number) =>
      clears.roomClearedAt >= since,
    getMentionTokenForAI: (ai: { alias?: string } | null) => ai?.alias ?? null,
    getAIDisplayName: (ai: { displayName?: string } | null) =>
      ai?.displayName ?? "",
    getReplyFields: (_roomId: string, messageId: string) => ({
      replyToMessageId: messageId,
      replyToSender: "Ada",
      replyToExcerpt: "anyone?",
    }),
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
    chatAssistantService: isChatEnabled ? service : null,
    chatOrchestrator: orchestrator,
    io: {} as Server,
    getRecentMessages: async () => [],
  });
  return { handler, posted, release, heldRooms, budget, clears, orchestrator };
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

describe("ChatAssistantHandler answer text", () => {
  it("swaps em dashes in @Chat's answer for hyphens", async () => {
    const { handler, posted, release } = makeHandler(
      "Two places—the prompt and `cleanResponse()`.",
    );
    release();

    await handler.trigger({
      roomId: ROOM_ID,
      content: "@Chat can we skip em dashes?",
      origin: { type: "user", username: "ted" },
    });

    expect(posted.map((message) => message.content)).toEqual([
      "@ted Two places - the prompt and `cleanResponse()`.",
    ]);
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

  it("drops a finished answer if the room was cleared meanwhile", async () => {
    const { handler, posted, release, clears } = makeHandler();
    const answering = handler.trigger({
      roomId: ROOM_ID,
      content: "@Chat how do mentions work?",
      origin: { type: "user", username: "alice" },
    });

    clears.roomClearedAt = Date.now();
    release();
    await answering;

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

describe("ChatAssistantHandler unanswered hand-off", () => {
  const unanswered = {
    roomId: ROOM_ID,
    message: {
      id: "ask-1",
      displayName: "Ada",
      senderType: "user" as const,
      content: "anyone?",
    },
    reason: "no-takers" as const,
    silentAIIds: [],
    handoffAIId: "gemini",
  };

  const withGemini = (setup: ReturnType<typeof makeHandler>) => {
    setup.orchestrator.aiServices.set("gemini", {
      id: "gemini",
      alias: "gemini",
      displayName: "Gemini",
    } as never);
    return setup;
  };

  it("posts one @Chat line that quotes the message and summons the AI taking over", async () => {
    const { handler, posted } = withGemini(makeHandler());

    await handler.handOffUnanswered(unanswered);

    expect(posted).toHaveLength(1);
    expect(posted[0]).toMatchObject({
      senderType: "ai",
      displayName: "Chat",
      replyToMessageId: "ask-1",
      content:
        "Nobody has picked up Ada's message yet. @gemini, could you take it?",
    });
  });

  it("stays quiet when @Chat is off on this server", async () => {
    const { handler, posted } = withGemini(
      makeHandler(undefined, { isChatEnabled: false }),
    );

    await handler.handOffUnanswered(unanswered);

    expect(posted).toHaveLength(0);
  });

  it("stays quiet while @Chat is already answering in the room", async () => {
    const { handler, posted, release } = withGemini(makeHandler());
    const answering = handler.trigger({
      roomId: ROOM_ID,
      content: "@Chat how?",
      origin: { type: "user", username: "alice" },
    });

    await handler.handOffUnanswered(unanswered);
    release();
    await answering;

    expect(posted.map((message) => message.content)).not.toContain(
      "Nobody has picked up Ada's message yet. @gemini, could you take it?",
    );
  });

  it("respects the room's AI message limit", async () => {
    const { handler, posted, budget } = withGemini(makeHandler());
    budget.remaining = 0;

    await handler.handOffUnanswered(unanswered);

    expect(posted).toHaveLength(0);
  });
});
