/**
 * BackgroundConversationLoop - Self-scheduling timer that triggers AI-to-AI
 * background chatter while users are silent.
 *
 * While asleep or with no active AIs it idles on a short retry interval;
 * otherwise it waits a random background delay and, if the room has been
 * quiet past the silence timeout, triggers a round of background responses.
 */

import { TIMING } from "./constants.js";

type BackgroundLoopDeps = {
  isAsleep: () => boolean;
  hasActiveAIs: () => boolean;
  getLastAIMessageTime: () => number;
  triggerBackgroundResponses: () => void;
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
