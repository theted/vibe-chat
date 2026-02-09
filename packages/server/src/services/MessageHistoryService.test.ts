import { describe, it, beforeEach, expect } from "bun:test";
import { MessageHistoryService } from "./MessageHistoryService.js";
import type { ChatMessage } from "@/types.js";

// Mock Redis client for testing
const createMockRedisClient = () => {
  const storage = new Map<string, string[]>();
  const expirations = new Map<string, number>();

  let multiCommands: Array<{ cmd: string; args: unknown[] }> = [];

  const mockMulti = {
    lPush: (key: string, value: string) => {
      multiCommands.push({ cmd: "lPush", args: [key, value] });
      return mockMulti;
    },
    lTrim: (key: string, start: number, end: number) => {
      multiCommands.push({ cmd: "lTrim", args: [key, start, end] });
      return mockMulti;
    },
    expire: (key: string, seconds: number) => {
      multiCommands.push({ cmd: "expire", args: [key, seconds] });
      return mockMulti;
    },
    exec: async () => {
      for (const { cmd, args } of multiCommands) {
        if (cmd === "lPush") {
          const [key, value] = args as [string, string];
          const existing = storage.get(key) || [];
          existing.unshift(value);
          storage.set(key, existing);
        } else if (cmd === "lTrim") {
          const [key, start, end] = args as [string, number, number];
          const existing = storage.get(key) || [];
          storage.set(key, existing.slice(start, end + 1));
        } else if (cmd === "expire") {
          const [key, seconds] = args as [string, number];
          expirations.set(key, seconds);
        }
      }
      multiCommands = [];
      return [];
    },
  };

  return {
    multi: () => mockMulti,
    lRange: async (key: string, start: number, end: number) => {
      const existing = storage.get(key) || [];
      return existing.slice(start, end === -1 ? undefined : end + 1);
    },
    // Test helpers
    _getStorage: () => storage,
    _getExpirations: () => expirations,
    _clear: () => {
      storage.clear();
      expirations.clear();
    },
  };
};

describe("MessageHistoryService", () => {
  describe("without Redis (fallback mode)", () => {
    let service: MessageHistoryService;

    beforeEach(() => {
      service = new MessageHistoryService({ redisClient: null });
    });

    it("returns false for isAvailable", () => {
      expect(service.isAvailable()).toBe(false);
    });

    it("generates correct room message key", () => {
      const key = service.getRoomMessageKey("test-room");
      expect(key).toBe("ai-chat:rooms:test-room:messages");
    });

    it("uses default room id when not specified", () => {
      const key = service.getRoomMessageKey();
      expect(key).toBe("ai-chat:rooms:default:messages");
    });

    it("storeMessage is a no-op without Redis", async () => {
      const message: ChatMessage = {
        id: "msg-1",
        sender: "user1",
        displayName: "User One",
        alias: "user1",
        content: "Hello",
        senderType: "user",
        timestamp: Date.now(),
      };

      // Should not throw
      await service.storeMessage("test-room", message);
    });

    it("getRecentMessages returns empty array without Redis and contextManager", async () => {
      const messages = await service.getRecentMessages("test-room");
      expect(messages).toEqual([]);
    });

    it("getRecentMessages uses contextManager fallback", async () => {
      const mockContextManager = {
        getContextForAI: (limit: number) => [
          {
            id: "ctx-1",
            sender: "user1",
            displayName: "User One",
            alias: "user1",
            content: "Hello from context",
            senderType: "user" as const,
            timestamp: 12345,
          },
        ],
      };

      const messages = await service.getRecentMessages(
        "test-room",
        mockContextManager
      );

      expect(messages.length).toBe(1);
      expect(messages[0].content).toBe("Hello from context");
      expect(messages[0].roomId).toBe("test-room");
    });

    it("handles missing fields in context entries", async () => {
      const mockContextManager = {
        getContextForAI: () => [
          {
            content: "Minimal message",
          },
        ],
      };

      const messages = await service.getRecentMessages(
        "test-room",
        mockContextManager
      );

      expect(messages.length).toBe(1);
      expect(messages[0].sender).toBe("unknown");
      expect(messages[0].senderType).toBe("user");
      expect(messages[0].id.startsWith("ctx-")).toBe(true);
    });
  });

  describe("with Redis", () => {
    let service: MessageHistoryService;
    let mockRedis: ReturnType<typeof createMockRedisClient>;

    beforeEach(() => {
      mockRedis = createMockRedisClient();
      service = new MessageHistoryService({
        redisClient: mockRedis as unknown as Parameters<
          typeof MessageHistoryService.prototype.storeMessage
        >[1],
        recentMessageLimit: 5,
        messageTtlSeconds: 3600,
      });
    });

    it("returns true for isAvailable", () => {
      expect(service.isAvailable()).toBe(true);
    });

    it("stores message in Redis", async () => {
      const message: ChatMessage = {
        id: "msg-1",
        sender: "user1",
        displayName: "User One",
        alias: "user1",
        content: "Hello Redis",
        senderType: "user",
        timestamp: 12345,
      };

      await service.storeMessage("test-room", message);

      const storage = mockRedis._getStorage();
      const key = "ai-chat:rooms:test-room:messages";
      const stored = storage.get(key);

      expect(stored).toBeTruthy();
      expect(stored!.length).toBe(1);

      const parsed = JSON.parse(stored![0]);
      expect(parsed.content).toBe("Hello Redis");
      expect(parsed.roomId).toBe("test-room");
      expect(parsed.storedAt).toBeTruthy();
    });

    it("adds timestamp if not present", async () => {
      const message: ChatMessage = {
        id: "msg-1",
        sender: "user1",
        displayName: "User One",
        alias: "user1",
        content: "No timestamp",
        senderType: "user",
      };

      await service.storeMessage("test-room", message);

      const storage = mockRedis._getStorage();
      const stored = storage.get("ai-chat:rooms:test-room:messages");
      const parsed = JSON.parse(stored![0]);

      expect(parsed.timestamp).toBeTruthy();
      expect(parsed.storedAt).toBeTruthy();
    });

    it("retrieves recent messages from Redis", async () => {
      const message1: ChatMessage = {
        id: "msg-1",
        sender: "user1",
        displayName: "User One",
        alias: "user1",
        content: "First",
        senderType: "user",
        timestamp: 1000,
      };

      const message2: ChatMessage = {
        id: "msg-2",
        sender: "user2",
        displayName: "User Two",
        alias: "user2",
        content: "Second",
        senderType: "user",
        timestamp: 2000,
      };

      await service.storeMessage("test-room", message1);
      await service.storeMessage("test-room", message2);

      const messages = await service.getRecentMessages("test-room");

      // Messages should be reversed (oldest first)
      expect(messages.length).toBe(2);
      expect(messages[0].content).toBe("First");
      expect(messages[1].content).toBe("Second");
    });

    it("respects message limit", async () => {
      // Store more messages than limit
      for (let i = 0; i < 10; i++) {
        await service.storeMessage("test-room", {
          id: `msg-${i}`,
          sender: "user1",
          displayName: "User One",
          alias: "user1",
          content: `Message ${i}`,
          senderType: "user",
          timestamp: i * 1000,
        });
      }

      const storage = mockRedis._getStorage();
      const stored = storage.get("ai-chat:rooms:test-room:messages");

      // lTrim should keep only 5 messages (recentMessageLimit)
      expect(stored?.length).toBe(5);
    });

    it("sets TTL on messages", async () => {
      await service.storeMessage("test-room", {
        id: "msg-1",
        sender: "user1",
        displayName: "User One",
        alias: "user1",
        content: "Test",
        senderType: "user",
      });

      const expirations = mockRedis._getExpirations();
      const ttl = expirations.get("ai-chat:rooms:test-room:messages");

      expect(ttl).toBe(3600);
    });

    it("handles malformed JSON in Redis gracefully", async () => {
      // Manually insert invalid JSON
      const storage = mockRedis._getStorage();
      storage.set("ai-chat:rooms:test-room:messages", [
        '{"valid": "json", "content": "Valid message", "timestamp": 1000}',
        "not valid json",
        '{"content": "Another valid", "timestamp": 2000}',
      ]);

      const messages = await service.getRecentMessages("test-room");

      // Should filter out invalid entries
      expect(messages.length).toBe(2);
    });

    it("uses default room id when not specified", async () => {
      await service.storeMessage(undefined, {
        id: "msg-1",
        sender: "user1",
        displayName: "User One",
        alias: "user1",
        content: "Default room",
        senderType: "user",
      });

      const storage = mockRedis._getStorage();
      const stored = storage.get("ai-chat:rooms:default:messages");

      expect(stored).toBeTruthy();
      expect(stored!.length).toBe(1);
    });
  });

  describe("default configuration", () => {
    it("uses default limit of 20 messages", async () => {
      const service = new MessageHistoryService({ redisClient: null });

      const mockContextManager = {
        getContextForAI: (limit: number) => {
          expect(limit).toBe(20);
          return [];
        },
      };

      await service.getRecentMessages("test-room", mockContextManager);
    });
  });

  describe("error handling", () => {
    it("logs warning and continues on Redis store error", async () => {
      const failingRedis = {
        multi: () => ({
          lPush: () => failingRedis.multi(),
          lTrim: () => failingRedis.multi(),
          expire: () => failingRedis.multi(),
          exec: async () => {
            throw new Error("Redis connection lost");
          },
        }),
      };

      const service = new MessageHistoryService({
        redisClient: failingRedis as unknown as Parameters<
          typeof MessageHistoryService.prototype.storeMessage
        >[1],
      });

      // Should not throw
      await service.storeMessage("test-room", {
        id: "msg-1",
        sender: "user1",
        displayName: "User One",
        alias: "user1",
        content: "Test",
        senderType: "user",
      });
    });

    it("returns empty array on Redis read error", async () => {
      const failingRedis = {
        lRange: async () => {
          throw new Error("Redis read error");
        },
      };

      const service = new MessageHistoryService({
        redisClient: failingRedis as unknown as Parameters<
          typeof MessageHistoryService.prototype.storeMessage
        >[1],
      });

      const messages = await service.getRecentMessages("test-room");
      expect(messages).toEqual([]);
    });
  });
});
