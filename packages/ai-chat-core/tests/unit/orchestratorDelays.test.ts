/**
 * Delay resolution: an explicitly requested 0 must survive, because `||` would
 * treat it as "unset" and hand back the conversational default. The CLI asks
 * for zero delays so its output is synchronous.
 */

import { afterEach, describe, it, expect } from "bun:test";
import { ChatOrchestrator } from "@/orchestrator/ChatOrchestrator.js";
import { DEFAULTS } from "@/orchestrator/constants.js";

const created: ChatOrchestrator[] = [];
const makeOrchestrator = (
  options: ConstructorParameters<typeof ChatOrchestrator>[0],
) => {
  const orchestrator = new ChatOrchestrator(options);
  created.push(orchestrator);
  return orchestrator;
};

afterEach(() => {
  while (created.length) created.pop()?.cleanup();
});

describe("orchestrator delay resolution", () => {
  it("keeps an explicit zero instead of substituting the default", () => {
    const orchestrator = makeOrchestrator({
      minUserResponseDelay: 0,
      maxUserResponseDelay: 0,
      minBackgroundDelay: 0,
      maxBackgroundDelay: 0,
      minDelayBetweenAI: 0,
      maxDelayBetweenAI: 0,
    });

    expect(orchestrator.delays).toEqual({
      minUserResponseDelay: 0,
      maxUserResponseDelay: 0,
      minBackgroundDelay: 0,
      maxBackgroundDelay: 0,
      minDelayBetweenAI: 0,
      maxDelayBetweenAI: 0,
    });
  });

  it("falls back to the defaults when a delay is omitted", () => {
    const orchestrator = makeOrchestrator({});

    expect(orchestrator.delays.minUserResponseDelay).toBe(
      DEFAULTS.MIN_USER_RESPONSE_DELAY,
    );
    expect(orchestrator.delays.maxBackgroundDelay).toBe(
      DEFAULTS.MAX_BACKGROUND_DELAY,
    );
  });

  it("resolves each delay independently", () => {
    const orchestrator = makeOrchestrator({ minDelayBetweenAI: 0 });

    expect(orchestrator.delays.minDelayBetweenAI).toBe(0);
    expect(orchestrator.delays.maxDelayBetweenAI).toBe(
      DEFAULTS.MAX_DELAY_BETWEEN_AI,
    );
  });
});
