import { beforeEach, describe, it, expect, mock } from "bun:test";
import type { AIServiceConfig } from "@ai-chat/core";
import { ConversationManager } from "@/conversation/ConversationManager.js";

type ParticipantConfig = Pick<AIServiceConfig, "provider" | "model">;
type StreamCall = { text: string; prefix: string; delay: number };

/**
 * Mock ContextManager that mirrors the orchestrator's ContextManager interface
 * Used to isolate CLI tests from the core orchestrator implementation
 */
class MockContextManager {
  private messages: Array<{ role: string; content: string }> = [];

  addMessage(message: { role: string; content: string }) {
    this.messages.push(message);
  }

  getContext(limit?: number) {
    return this.messages.slice(-(limit ?? 50));
  }

  getContextForAI(limit = 50) {
    return this.getContext(limit);
  }

  getAllMessages() {
    return [...this.messages];
  }

  clear() {
    this.messages = [];
  }

  size() {
    return this.messages.length;
  }

  hasMessages() {
    return this.messages.length > 0;
  }

  getLastMessage() {
    return this.messages.length > 0
      ? this.messages[this.messages.length - 1]
      : null;
  }
}

describe("ConversationManager integration", () => {
  let recordMessageMock: ReturnType<typeof mock>;
  let statsTracker: { recordMessage: ReturnType<typeof mock> };
  let streamCalls: StreamCall[];
  let responsesByModel: Record<string, string[]>;
  let createServiceMock: ReturnType<typeof mock>;
  let getRandomConfigMock: ReturnType<typeof mock>;
  let dependencies: Record<string, unknown>;

  beforeEach(() => {
    recordMessageMock = mock(async () => {});
    statsTracker = { recordMessage: recordMessageMock };
    streamCalls = [];
    responsesByModel = {
      "model-a": ["Response A1", "Response A2"],
      "model-b": ["Response B1", "Response B2"],
    };

    createServiceMock = mock((aiConfig: ParticipantConfig) => ({
      getName: () => aiConfig.provider.name,
      getModel: () => aiConfig.model.id,
      generateResponse: mock(async () => {
        const queue = responsesByModel[aiConfig.model.id] || [];
        const content = queue.shift() || "No response";
        return { content };
      }),
    }));

    getRandomConfigMock = mock(
      (): ParticipantConfig => ({
        provider: {
          name: "RandomProvider",
          apiKeyEnvVar: "RANDOM_PROVIDER_KEY",
        },
        model: { id: "random-model" },
      }),
    );

    dependencies = {
      statsTracker,
      core: {
        AIServiceFactory: { createService: createServiceMock },
        getRandomAIConfig: getRandomConfigMock,
        DEFAULT_CONVERSATION_CONFIG: { maxTurns: 2, timeoutMs: 10_000 },
        streamText: async (text: string, prefix: string, delay: number) => {
          streamCalls.push({ text, prefix, delay });
        },
        // Mock ContextManager from orchestrator - used for message history management
        ContextManager: MockContextManager,
      },
    };
  });

  it("runs a conversation across multiple participants", async () => {
    const manager = new ConversationManager({ maxTurns: 2 }, dependencies);

    const participantA: ParticipantConfig = {
      provider: { name: "ProviderA", apiKeyEnvVar: "PROVIDER_A_KEY" },
      model: { id: "model-a" },
    };
    const participantB: ParticipantConfig = {
      provider: { name: "ProviderB", apiKeyEnvVar: "PROVIDER_B_KEY" },
      model: { id: "model-b" },
    };

    manager.addParticipant(participantA);
    manager.addParticipant(participantB);

    await manager.startConversation("Hello everyone");

    expect(manager.isActive).toBe(false);
    expect(manager.turnCount).toBe(2);
    expect(manager.messages.length).toBe(3);

    const [userMessage, firstReply, secondReply] = manager.messages;
    expect(userMessage.role).toBe("user");
    expect(userMessage.participantId).toBe(null);
    expect(firstReply.participantId).toBe(0);
    expect(firstReply.content).toBe("Response A1");
    expect(secondReply.participantId).toBe(1);
    expect(secondReply.content).toBe("Response B1");

    expect(streamCalls.length).toBe(3);
    expect(
      streamCalls.map((call) => call.prefix),
    ).toEqual(
      ["[User]: ", "[ProviderA (model-a)]: ", "[ProviderB (model-b)]: "],
    );

    expect(recordMessageMock.mock.calls.length).toBe(3);
    const recordCalls = recordMessageMock.mock.calls.map(
      ([payload]) => payload,
    );
    expect(
      recordCalls.map(({ role, provider, model }) => ({
        role,
        provider,
        model,
      })),
    ).toEqual(
      [
        { role: "user", provider: "User", model: null },
        { role: "assistant", provider: "ProviderA", model: "model-a" },
        { role: "assistant", provider: "ProviderB", model: "model-b" },
      ],
    );

    const history = manager.getConversationHistory();
    expect(
      history.map(({ from, content }) => ({ from, content })),
    ).toEqual(
      [
        { from: "User", content: "Hello everyone" },
        { from: "ProviderA (model-a)", content: "Response A1" },
        { from: "ProviderB (model-b)", content: "Response B1" },
      ],
    );
  });

  it("ignores empty model responses so they do not enter the conversation", async () => {
    const manager = new ConversationManager({ maxTurns: 2 }, dependencies);

    responsesByModel["model-a"] = ["   ", "Response A2"];
    responsesByModel["model-b"] = ["Response B1"];

    const participantA: ParticipantConfig = {
      provider: { name: "ProviderA", apiKeyEnvVar: "PROVIDER_A_KEY" },
      model: { id: "model-a" },
    };
    const participantB: ParticipantConfig = {
      provider: { name: "ProviderB", apiKeyEnvVar: "PROVIDER_B_KEY" },
      model: { id: "model-b" },
    };

    manager.addParticipant(participantA);
    manager.addParticipant(participantB);

    await manager.startConversation("Hello everyone");

    expect(manager.turnCount).toBe(2);
    expect(manager.messages.length).toBe(2);

    const [userMessage, reply] = manager.messages;
    expect(userMessage.role).toBe("user");
    expect(reply.participantId).toBe(1);
    expect(reply.content).toBe("Response B1");

    expect(streamCalls.length).toBe(2);
    expect(
      streamCalls.map((call) => call.prefix),
    ).toEqual(
      ["[User]: ", "[ProviderB (model-b)]: "],
    );

    expect(recordMessageMock.mock.calls.length).toBe(2);
    const recordCalls = recordMessageMock.mock.calls.map(
      ([payload]) => payload,
    );
    expect(
      recordCalls.map(({ role, provider, model }) => ({
        role,
        provider,
        model,
      })),
    ).toEqual(
      [
        { role: "user", provider: "User", model: null },
        { role: "assistant", provider: "ProviderB", model: "model-b" },
      ],
    );
  });

  it("throws when attempting to start with fewer than two participants", async () => {
    const manager = new ConversationManager({}, dependencies);

    const participant: ParticipantConfig = {
      provider: { name: "Solo", apiKeyEnvVar: "SOLO_KEY" },
      model: { id: "solo-model" },
    };
    manager.addParticipant(participant);

    try {
      await manager.startConversation("Can anyone hear me?");
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(/At least two participants/);
    }
  });

  it("adds a random participant using the core configuration helper", async () => {
    const manager = new ConversationManager({}, dependencies);

    const id = manager.addRandomParticipant();
    expect(id).toBe(0);
    expect(createServiceMock.mock.calls.length).toBe(1);
    expect(getRandomConfigMock.mock.calls.length).toBe(1);
  });
});
