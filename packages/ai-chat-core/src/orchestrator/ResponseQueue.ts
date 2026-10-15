/**
 * ResponseQueue - Manages queued AI responses with concurrency limiting
 */

import type { ContextMessage } from "@/types/orchestrator.js";

type QueuedResponse = {
  aiId: string;
  roomId: string;
  isUserResponse: boolean;
  options: GenerateResponseOptions;
  scheduledTime: number;
};

type GenerateResponseOptions = {
  /** The message this response answers was @mentioning this AI. */
  isMentioned?: boolean;
  /**
   * The message this response answers. Fixed at scheduling time: by the time
   * the AI generates, newer messages may have arrived, and replying to
   * whatever is latest is how AIs ended up answering the wrong speaker.
   */
  triggerMessage?: ContextMessage;
  /** Response is reopening a room that went quiet - prompts a casual restart. */
  isReopening?: boolean;
};

type ResponseHandler = (
  aiId: string,
  roomId: string,
  isUserResponse: boolean,
  options: GenerateResponseOptions,
) => void;

export type { QueuedResponse, GenerateResponseOptions };

/**
 * Manages a time-ordered queue of AI responses, dispatching each once it is
 * due and a concurrency slot is free.
 */
export class ResponseQueue {
  private queue: QueuedResponse[] = [];
  private activeCount = 0;
  private activeByRoom = new Map<string, number>();
  private maxConcurrent: number;
  private isCleared = false;
  private canDispatch: (response: QueuedResponse) => boolean;
  private onDispatch: ResponseHandler;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: {
    maxConcurrent: number;
    /** Checked at dispatch time; a false answer drops the response. */
    canDispatch: (response: QueuedResponse) => boolean;
    onDispatch: ResponseHandler;
  }) {
    this.maxConcurrent = options.maxConcurrent;
    this.canDispatch = options.canDispatch;
    this.onDispatch = options.onDispatch;
  }

  enqueue(response: QueuedResponse): void {
    this.enqueueBatch([response]);
  }

  enqueueBatch(responses: QueuedResponse[]): void {
    if (responses.length === 0) return;
    this.isCleared = false;
    this.queue.push(...responses);
    this.sortQueue();
    this.process();
  }

  /** Called when a dispatched response finishes (success or error). */
  onResponseComplete(roomId: string): void {
    this.activeCount = Math.max(0, this.activeCount - 1);
    const roomActive = (this.activeByRoom.get(roomId) ?? 0) - 1;
    if (roomActive > 0) {
      this.activeByRoom.set(roomId, roomActive);
    } else {
      this.activeByRoom.delete(roomId);
    }
    this.process();
  }

  /** Remove queued (not yet dispatched) responses matching the predicate. */
  removeWhere(predicate: (response: QueuedResponse) => boolean): number {
    const before = this.queue.length;
    this.queue = this.queue.filter((response) => !predicate(response));
    const removed = before - this.queue.length;
    if (removed > 0) this.process();
    return removed;
  }

  findPending(roomId: string, aiId: string): QueuedResponse | undefined {
    return this.queue.find(
      (response) => response.roomId === roomId && response.aiId === aiId,
    );
  }

  /**
   * Point a queued response at a newer message (e.g. its AI was just
   * @mentioned), keeping whichever of the two dispatch times is sooner.
   */
  retarget(
    pending: QueuedResponse,
    update: Pick<
      QueuedResponse,
      "isUserResponse" | "options" | "scheduledTime"
    >,
  ): void {
    pending.isUserResponse = update.isUserResponse;
    pending.options = update.options;
    pending.scheduledTime = Math.min(
      pending.scheduledTime,
      update.scheduledTime,
    );
    this.sortQueue();
    this.process();
  }

  /** Queued plus generating responses for a room. */
  countForRoom(roomId: string): number {
    const queued = this.queue.filter(
      (response) => response.roomId === roomId,
    ).length;
    return queued + (this.activeByRoom.get(roomId) ?? 0);
  }

  clear(): void {
    this.queue = [];
    this.isCleared = true;
    this.clearTimer();
  }

  get pendingCount(): number {
    return this.queue.length;
  }

  get activeResponseCount(): number {
    return this.activeCount;
  }

  private sortQueue(): void {
    this.queue.sort((a, b) => a.scheduledTime - b.scheduledTime);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Dispatch everything that is due while slots are free, then sleep until
   * the next item is due. A full queue waits for onResponseComplete instead
   * of polling.
   */
  private process(): void {
    this.clearTimer();
    if (this.isCleared) return;

    const now = Date.now();
    while (
      this.queue.length > 0 &&
      this.activeCount < this.maxConcurrent &&
      this.queue[0].scheduledTime <= now
    ) {
      const response = this.queue.shift() as QueuedResponse;
      if (!this.canDispatch(response)) continue;

      this.activeCount += 1;
      this.activeByRoom.set(
        response.roomId,
        (this.activeByRoom.get(response.roomId) ?? 0) + 1,
      );
      this.onDispatch(
        response.aiId,
        response.roomId,
        response.isUserResponse,
        response.options,
      );
    }

    if (this.queue.length === 0 || this.activeCount >= this.maxConcurrent) {
      return;
    }

    const waitMs = Math.max(0, this.queue[0].scheduledTime - Date.now());
    // A dispatch that finishes synchronously re-enters process() and may
    // already have armed a timer
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      this.process();
    }, waitMs);
  }
}
