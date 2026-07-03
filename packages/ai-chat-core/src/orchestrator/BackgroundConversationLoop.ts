/**
 * BackgroundConversationLoop - Self-scheduling timer that triggers AI-to-AI
 * background chatter while users are silent.
 *
 * While asleep or with no active AIs it idles on a short retry interval;
 * otherwise it waits a random background delay and, if the room is still
 * lively, triggers a round of background responses. Once the room has been
 * quiet past the silence timeout, it occasionally has a single AI reopen the
 * conversation instead of staying silent forever.
 */

import { REOPENING, TIMING } from "./constants.js";

type BackgroundLoopDeps = {
  isAsleep: () => boolean;
  hasActiveAIs: () => boolean;
  getLastAIMessageTime: () => number;
  triggerBackgroundResponses: () => void;
  triggerReopening: () => void;
  getDelays: () => { minBackgroundDelay: number; maxBackgroundDelay: number };
};

export class BackgroundConversationLoop {
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly deps: BackgroundLoopDeps) {}

  get isRunning(): boolean {
    return this.timer !== null;
  }

  start(): void {
    const scheduleNext = () => {
      if (this.deps.isAsleep() || !this.deps.hasActiveAIs()) {
        this.timer = setTimeout(scheduleNext, TIMING.SLEEP_RETRY_INTERVAL);
        return;
      }

      const { minBackgroundDelay, maxBackgroundDelay } = this.deps.getDelays();
      const delay =
        minBackgroundDelay +
        Math.random() * (maxBackgroundDelay - minBackgroundDelay);

      this.timer = setTimeout(() => {
        const timeSinceLastMessage =
          Date.now() - this.deps.getLastAIMessageTime();
        if (timeSinceLastMessage > TIMING.SILENCE_TIMEOUT) {
          // Long silence: occasionally have one AI break the lull, unless
          // the room has been dead so long a reopening would feel random
          const shouldReopen =
            timeSinceLastMessage < REOPENING.MAX_SILENCE_MS &&
            Math.random() < REOPENING.PROBABILITY_PER_TICK;
          if (shouldReopen) {
            this.deps.triggerReopening();
          }
          scheduleNext();
          return;
        }

        this.deps.triggerBackgroundResponses();
        scheduleNext();
      }, delay);
    };

    scheduleNext();
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
