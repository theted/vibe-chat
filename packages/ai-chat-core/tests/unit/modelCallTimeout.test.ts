/**
 * Hung model calls: a call that never settles is rejected after the service's
 * timeout, frees its response-queue slot so later responses still dispatch,
 * and a reply that turns up after the timeout is never posted.
 */

import { afterEach, describe, expect, it } from "bun:test";
import { DEFAULT_SERVICE_TIMEOUT_MS } from "@/config/aiProviders/constants.js";
import { ChatOrchestrator } from "@/orchestrator/ChatOrchestrator.js";
import type { ResponseQueue } from "@/orchestrator/ResponseQueue.js";
import { AIServiceFactory } from "@/services/AIServiceFactory.js";
import type { AIServiceConfig, IAIService } from "@/types/index.js";
import type { ContextMessage } from "@/types/orchestrator.js";
import { ServiceTimeoutError } from "@/types/services.js";
import { resolveServiceTimeout, runWithTimeout } from "@/utils/timeout.js";

const ROOM = "default";
// Tiny so the tests never wait anywhere near the real 150 s default
const TEST_TIMEOUT_MS = 20;
// Covers the 600 ms simulated-typing hold plus the broker's delivery delay
const DELIVERY_WAIT_MS = 1_500;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** A promise that only settles when the test releases it. */
const createGate = <T>() => {
  let release: (value: T) => void = () => undefined;
  const promise = new Promise<T>((resolve) => {
    release = resolve;
  });
  return { promise, release };
};

describe("resolveServiceTimeout", () => {
  it("uses the configured timeout, falling back to the global default", () => {
    expect(resolveServiceTimeout({ timeout: 5_000 })).toBe(5_000);
    expect(resolveServiceTimeout({})).toBe(DEFAULT_SERVICE_TIMEOUT_MS);
    expect(resolveServiceTimeout({ timeout: 0 })).toBe(
      DEFAULT_SERVICE_TIMEOUT_MS,
    );
    expect(resolveServiceTimeout(undefined)).toBe(DEFAULT_SERVICE_TIMEOUT_MS);
  });
});

describe("runWithTimeout", () => {
  it("rejects a never-settling call and aborts its signal", async () => {
    let seenSignal: AbortSignal | null = null;
    const call = runWithTimeout(
      (signal) => {
        seenSignal = signal;
        return new Promise<never>(() => undefined);
      },
      { timeoutMs: TEST_TIMEOUT_MS, serviceName: "Hung" },
    );

    const error = await call.catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceTimeoutError);
    expect((error as ServiceTimeoutError).timeoutMs).toBe(TEST_TIMEOUT_MS);
    expect(seenSignal?.aborted).toBe(true);
  });

  it("passes a result through untouched", async () => {
    const result = await runWithTimeout(async () => "done", {
      timeoutMs: TEST_TIMEOUT_MS,
      serviceName: "Fast",
    });
    expect(result).toBe("done");
  });
});

describe("OpenAI-compatible Responses API", () => {
  const ENV_KEY = "OPENAI_API_KEY";
  const originalKey = process.env[ENV_KEY];

  afterEach(() => {
    if (originalKey === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = originalKey;
  });

  it("times out and aborts a hung responses.create", async () => {
    process.env[ENV_KEY] = "test-key";
    const config: AIServiceConfig = {
      provider: { name: "OpenAI", apiKeyEnvVar: ENV_KEY },
      model: {
        id: "gpt-test",
        useResponsesApi: true,
      } as AIServiceConfig["model"],
      timeout: TEST_TIMEOUT_MS,
    };
    const service = AIServiceFactory.createService(config);
    await service.initialize({ validateOnInit: false });

    let requestSignal: AbortSignal | undefined;
    (service as unknown as { client: unknown }).client = {
      chat: { completions: { create: () => new Promise(() => undefined) } },
      responses: {
        create: (_payload: unknown, options?: { signal?: AbortSignal }) => {
          requestSignal = options?.signal;
          return new Promise(() => undefined);
        },
      },
    };

    const error = await service
      .generateResponse([{ role: "user", content: "hello" }])
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceTimeoutError);
    expect(requestSignal?.aborted).toBe(true);
  });
});

describe("ResponseGenerator with a hung model call", () => {
  let orchestrator: ChatOrchestrator;

  afterEach(() => orchestrator?.cleanup());

  const addAI = (
    id: string,
    generateResponse: () => Promise<unknown>,
    timeout?: number,
  ) => {
    const service = {
      config: { timeout },
      generateResponse,
      getModel: () => `${id}-model`,
    } as unknown as IAIService;
    orchestrator.aiServices.set(id, {
      id,
      name: id,
      displayName: id,
      alias: id.toLowerCase(),
      normalizedAlias: id.toLowerCase(),
      isActive: true,
      service,
    });
    orchestrator.activeAIs.push(id);
  };

  const postedBy = (aiId: string) =>
    orchestrator.contextManager
      .getContext(50, ROOM)
      .filter((message: ContextMessage) => message.aiId === aiId);

  it("frees the queue slot so later responses still dispatch, and drops the late reply", async () => {
    // One slot: if the hung call kept it, the second AI could never answer
    orchestrator = new ChatOrchestrator({ maxConcurrentResponses: 1 });
    orchestrator.stopBackgroundConversation();

    const hungReply = createGate<string>();
    addAI("HUNG_AI", () => hungReply.promise, TEST_TIMEOUT_MS);
    addAI("OK_AI", async () => "I am still here.");

    const errors: unknown[] = [];
    orchestrator.on("ai-error", ({ error }: { error: unknown }) =>
      errors.push(error),
    );

    await orchestrator.handleMessage({
      sender: "Ada",
      senderType: "user",
      content: "Anyone there?",
      roomId: ROOM,
      suppressAIResponses: true,
    });

    const queue = (orchestrator as unknown as { responseQueue: ResponseQueue })
      .responseQueue;
    const now = Date.now();
    queue.enqueueBatch([
      {
        aiId: "HUNG_AI",
        roomId: ROOM,
        isUserResponse: true,
        options: {},
        scheduledTime: now,
      },
      {
        aiId: "OK_AI",
        roomId: ROOM,
        isUserResponse: true,
        options: {},
        scheduledTime: now,
      },
    ]);
    expect(queue.activeResponseCount).toBe(1);
    expect(queue.pendingCount).toBe(1);

    await wait(DELIVERY_WAIT_MS);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(ServiceTimeoutError);
    expect(postedBy("OK_AI")).toHaveLength(1);
    expect(queue.activeResponseCount).toBe(0);
    expect(queue.pendingCount).toBe(0);

    // The provider finally answers; nobody is listening any more
    hungReply.release("Sorry, I was stuck.");
    await wait(DELIVERY_WAIT_MS);

    expect(postedBy("HUNG_AI")).toHaveLength(0);
    expect(queue.activeResponseCount).toBe(0);
  });
});
