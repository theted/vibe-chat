import { beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import type { AIServiceConfig } from "@ai-chat/core";
import { ConversationManager } from "../../src/conversation/ConversationManager.js";

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
    return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
  }
}

describe("ConversationManager integration", () => {
  let recordMessageMock;
  let statsTracker;
  let streamCalls: StreamCall[];
  let responsesByModel: Record<string, string[]>;
  let createServiceMock;
  let getRandomConfigMock;
  let dependencies;

  beforeEach(() => {
    recordMessageMock = mock.fn(async () => {});
    statsTracker = { recordMessage: recordMessageMock };
    streamCalls = [];
    responsesByModel = {
      "model-a": ["Response A1", "Response A2"],
      "model-b": ["Response B1", "Response B2"],
    };

    createServiceMock = mock.fn((aiConfig: ParticipantConfig) => ({
      getName: () => aiConfig.provider.name,
      getModel: () => aiConfig.model.id,
      generateResponse: mock.fn(async () => {
        const queue = responsesByModel[aiConfig.model.id] || [];
        const content = queue.shift() || "No response";
        return { content };
      }),
    }));

    getRandomConfigMock = mock.fn(
      (): ParticipantConfig => ({
        provider: { name: "RandomProvider", apiKeyEnvVar: "RANDOM_PROVIDER_KEY" },
        model: { id: "random-model" },
      })
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

    assert.strictEqual(manager.isActive, false);
    assert.strictEqual(manager.turnCount, 2);
    assert.strictEqual(manager.messages.length, 3);

    const [userMessage, firstReply, secondReply] = manager.messages;
    assert.strictEqual(userMessage.role, "user");
    assert.strictEqual(userMessage.participantId, null);
    assert.strictEqual(firstReply.participantId, 0);
    assert.strictEqual(firstReply.content, "Response A1");
    assert.strictEqual(secondReply.participantId, 1);
    assert.strictEqual(secondReply.content, "Response B1");

    assert.strictEqual(streamCalls.length, 3);
    assert.deepStrictEqual(
      streamCalls.map((call) => call.prefix),
      ["[User]: ", "[ProviderA (model-a)]: ", "[ProviderB (model-b)]: "]
    );

    assert.strictEqual(recordMessageMock.mock.callCount(), 3);
    const recordCalls = recordMessageMock.mock.calls.map(({ arguments: [payload] }) => payload);
    assert.deepStrictEqual(
      recordCalls.map(({ role, provider, model }) => ({ role, provider, model })),
      [
        { role: "user", provider: "User", model: null },
        { role: "assistant", provider: "ProviderA", model: "model-a" },
        { role: "assistant", provider: "ProviderB", model: "model-b" },
      ]
    );

    const history = manager.getConversationHistory();
    assert.deepStrictEqual(
      history.map(({ from, content }) => ({ from, content })),
      [
        { from: "User", content: "Hello everyone" },
        { from: "ProviderA (model-a)", content: "Response A1" },
        { from: "ProviderB (model-b)", content: "Response B1" },
      ]
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

    assert.strictEqual(manager.turnCount, 2);
    assert.strictEqual(manager.messages.length, 2);

    const [userMessage, reply] = manager.messages;
    assert.strictEqual(userMessage.role, "user");
    assert.strictEqual(reply.participantId, 1);
    assert.strictEqual(reply.content, "Response B1");

    assert.strictEqual(streamCalls.length, 2);
    assert.deepStrictEqual(
      streamCalls.map((call) => call.prefix),
      ["[User]: ", "[ProviderB (model-b)]: "]
    );

    assert.strictEqual(recordMessageMock.mock.callCount(), 2);
    const recordCalls = recordMessageMock.mock.calls.map(({ arguments: [payload] }) => payload);
    assert.deepStrictEqual(
      recordCalls.map(({ role, provider, model }) => ({ role, provider, model })),
      [
        { role: "user", provider: "User", model: null },
        { role: "assistant", provider: "ProviderB", model: "model-b" },
      ]
    );
  });

  it("throws when attempting to start with fewer than two participants", async () => {
    const manager = new ConversationManager({}, dependencies);

    const participant: ParticipantConfig = {
      provider: { name: "Solo", apiKeyEnvVar: "SOLO_KEY" },
      model: { id: "solo-model" },
    };
    manager.addParticipant(participant);

    await assert.rejects(
      manager.startConversation("Can anyone hear me?"),
      /At least two participants/
    );
  });

  it("adds a random participant using the core configuration helper", async () => {
    const manager = new ConversationManager({}, dependencies);

    const id = manager.addRandomParticipant();
    assert.strictEqual(id, 0);
    assert.strictEqual(createServiceMock.mock.callCount(), 1);
    assert.strictEqual(getRandomConfigMock.mock.callCount(), 1);
  });
});
