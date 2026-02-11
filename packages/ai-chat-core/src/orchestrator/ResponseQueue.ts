/**
 * ResponseQueue - Manages queued AI responses with concurrency limiting
 */

import { TIMING } from "./constants.js";

type QueuedResponse = {
  aiId: string;
  roomId: string;
  isUserResponse: boolean;
  options: GenerateResponseOptions;
  scheduledTime: number;
};

type GenerateResponseOptions = {
  isMentioned?: boolean;
  triggerMessage?: { id?: string; sender?: string };
};

type ResponseHandler = (
  aiId: string,
  roomId: string,
  isUserResponse: boolean,
  options: GenerateResponseOptions,
) => void;

export type { QueuedResponse, GenerateResponseOptions };

/**
 * Manages a priority queue of AI responses, dispatching them with
 * concurrency limits and scheduled delays.
 */
export class ResponseQueue {
  private queue: QueuedResponse[];
  private activeCount: number;
  private maxConcurrent: number;
  private isProcessing: boolean;
  private isCleared: boolean;
  private isSleeping: () => boolean;
  private onDispatch: ResponseHandler;
  private pendingTimers: Set<ReturnType<typeof setTimeout>>;

  constructor(options: {
    maxConcurrent: number;
    isSleeping: () => boolean;
    onDispatch: ResponseHandler;
  }) {
    this.queue = [];
    this.activeCount = 0;
    this.maxConcurrent = options.maxConcurrent;
    this.isProcessing = false;
    this.isCleared = false;
    this.isSleeping = options.isSleeping;
    this.onDispatch = options.onDispatch;
    this.pendingTimers = new Set();
  }

  enqueue(response: QueuedResponse): void {
    this.isCleared = false;
    this.queue.push(response);
    this.queue.sort((a, b) => a.scheduledTime - b.scheduledTime);
    this.process();
  }

  enqueueBatch(responses: QueuedResponse[]): void {
    this.isCleared = false;
    this.queue.push(...responses);
    this.queue.sort((a, b) => a.scheduledTime - b.scheduledTime);
    this.process();
  }

  /** Called when a dispatched response finishes (success or error). */
  onResponseComplete(): void {
    this.activeCount = Math.max(0, this.activeCount - 1);
    if (this.queue.length > 0) {
      this.process();
    }
  }

  clear(): void {
    this.queue = [];
    this.isCleared = true;
    this.isProcessing = false;
    for (const timer of this.pendingTimers) {
      clearTimeout(timer);
    }
    this.pendingTimers.clear();
  }

  get pendingCount(): number {
    return this.queue.length;
  }

  get activeResponseCount(): number {
    return this.activeCount;
  }

  private scheduleTimer(callback: () => void, delay: number): void {
    const timer = setTimeout(() => {
      this.pendingTimers.delete(timer);
      if (!this.isCleared) {
        callback();
      }
    }, delay);
    this.pendingTimers.add(timer);
  }

  private process(): void {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const processNext = () => {
      if (
        this.isCleared ||
        this.queue.length === 0 ||
        this.activeCount >= this.maxConcurrent
      ) {
        this.isProcessing = false;
        return;
      }

      const now = Date.now();
      const nextResponse = this.queue[0];
      const waitTime = Math.max(0, nextResponse.scheduledTime - now);

      this.scheduleTimer(() => {
        if (
          this.isSleeping() ||
          this.activeCount >= this.maxConcurrent
        ) {
          this.isProcessing = false;
          if (this.queue.length > 0) {
            this.scheduleTimer(() => { this.process(); }, TIMING.QUEUE_RETRY_INTERVAL);
          }
          return;
        }

        const response = this.queue.shift();
        if (response) {
          this.activeCount++;
          this.onDispatch(
            response.aiId,
            response.roomId,
            response.isUserResponse,
            response.options,
          );
        }

        processNext();
      }, waitTime);
    };

    processNext();
  }
}
