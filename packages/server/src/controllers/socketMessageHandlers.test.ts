import { describe, expect, it } from "bun:test";
import type { Socket } from "socket.io";

import type { ChatMessage } from "@/types.js";
import type { SocketHandlerContext } from "./socketHandlerContext.js";
import { handleUserMessage } from "./socketMessageHandlers.js";

type ReplyLookup = { roomId: string; messageId: string };

/**
 * Just enough of the handler context for one user message to go through:
 * the orchestrator records what it is asked to quote and what gets posted.
 */
const makeContext = () => {
  const posted: ChatMessage[] = [];
  const lookups: ReplyLookup[] = [];
  const context = {
    connectedUsers: new Map([
      ["socket-1", { username: "Ada", roomId: "default", joinedAt: 0 }],
    ]),
    rateLimiter: { check: async () => ({ allowed: true }) },
    chatAssistant: { shouldHandle: () => false },
    metricsService: { recordUserMessage: () => {} },
    chatOrchestrator: {
      getReplyFields: (roomId: string, messageId: string) => {
        lookups.push({ roomId, messageId });
        return messageId === "known"
          ? {
              replyToMessageId: "known",
              replyToSender: "Claude",
              replyToExcerpt: "Tabs.",
            }
          : null;
      },
      addMessage: (message: ChatMessage) => posted.push(message),
    },
    io: { to: () => ({ emit: () => {} }) },
  } as unknown as SocketHandlerContext;

  return { context, posted, lookups };
};

const socket = {
  id: "socket-1",
  handshake: { headers: {}, address: "203.0.113.5" },
  emit: () => {},
} as unknown as Socket;

describe("handleUserMessage quote-replies", () => {
  it("attaches the server's snapshot of the quoted message", async () => {
    const { context, posted, lookups } = makeContext();

    await handleUserMessage(context, socket, {
      content: "Why tabs?",
      replyToMessageId: "known",
    });

    expect(lookups).toEqual([{ roomId: "default", messageId: "known" }]);
    expect(posted[0]).toMatchObject({
      content: "Why tabs?",
      replyToMessageId: "known",
      replyToSender: "Claude",
      replyToExcerpt: "Tabs.",
    });
  });

  it("posts a plain message when the quoted id isn't in the room", async () => {
    const { context, posted } = makeContext();

    await handleUserMessage(context, socket, {
      content: "Hello",
      replyToMessageId: "elsewhere",
    });

    expect(posted[0].content).toBe("Hello");
    expect(posted[0].replyToMessageId).toBeUndefined();
  });
});
