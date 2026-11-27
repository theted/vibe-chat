/**
 * Notices a person's message that no AI answers (issue #311).
 *
 * Each room tracks its latest message from a person. Any AI message in the
 * room (including @Chat's) counts as an answer. After UNANSWERED.QUIET_MS
 * the watch looks at the room: while replies are still queued, generating or
 * held for @Chat it looks again later, so a slow or timing-out model gets
 * its chance first. Only a room that is truly quiet is reported, and at most
 * once per ROOM_COOLDOWN_MS so the hand-off can't become noise itself.
 */

import type { ContextMessage } from "@/types/orchestrator.js";
import { UNANSWERED } from "./constants.js";

export type UnansweredWatchOptions = {
  /** 0 turns the watch off. */
  quietMs?: number;
  recheckMs?: number;
  cooldownMs?: number;
  /** True while the room has replies queued, generating or on hold. */
  isBusy: (roomId: string) => boolean;
  /** False when the room's AIs are asleep or out of budget. */
  canSpeak: (roomId: string) => boolean;
  onUnanswered: (roomId: string, message: ContextMessage) => void;
  now?: () => number;
};

type Pending = {
  message: ContextMessage;
  timer: ReturnType<typeof setTimeout>;
};

export class UnansweredWatch {
  private readonly quietMs: number;
  private readonly recheckMs: number;
  private readonly cooldownMs: number;
  private readonly now: () => number;
  private pending = new Map<string, Pending>();
  private lastReportAt = new Map<string, number>();

  constructor(private readonly options: UnansweredWatchOptions) {
    this.quietMs = options.quietMs ?? UNANSWERED.QUIET_MS;
    this.recheckMs = options.recheckMs ?? UNANSWERED.RECHECK_MS;
    this.cooldownMs = options.cooldownMs ?? UNANSWERED.ROOM_COOLDOWN_MS;
    this.now = options.now ?? Date.now;
  }

  /** A person posted: start (or restart) the room's quiet timer. */
  watch(roomId: string, message: ContextMessage): void {
    if (this.quietMs <= 0) return;
    this.cancel(roomId);
    this.arm(roomId, message, this.quietMs);
  }

  /** An AI posted in the room, so the room isn't silent. */
  markAnswered(roomId: string): void {
    this.cancel(roomId);
  }

  /** Forget a room entirely (e.g. /clear). */
  clearRoom(roomId: string): void {
    this.cancel(roomId);
    this.lastReportAt.delete(roomId);
  }

  clear(): void {
    for (const roomId of [...this.pending.keys()]) this.cancel(roomId);
    this.lastReportAt.clear();
  }

  /** Whether a room has a message waiting to be checked (for tests). */
  isWatching(roomId: string): boolean {
    return this.pending.has(roomId);
  }

  private arm(roomId: string, message: ContextMessage, delayMs: number) {
    const timer = setTimeout(() => this.check(roomId, message), delayMs);
    // A pending check must never keep the process (or a test run) alive
    (timer as { unref?: () => void }).unref?.();
    this.pending.set(roomId, { message, timer });
  }

  private cancel(roomId: string) {
    const pending = this.pending.get(roomId);
    if (pending) clearTimeout(pending.timer);
    this.pending.delete(roomId);
  }

  private check(roomId: string, message: ContextMessage) {
    if (this.pending.get(roomId)?.message !== message) return;
    if (this.options.isBusy(roomId)) {
      this.arm(roomId, message, this.recheckMs);
      return;
    }
    this.pending.delete(roomId);
    // Asleep means someone paused the AIs on purpose: don't wake them
    if (!this.options.canSpeak(roomId)) return;

    const lastReport = this.lastReportAt.get(roomId);
    if (lastReport !== undefined && this.now() - lastReport < this.cooldownMs) {
      return;
    }
    this.lastReportAt.set(roomId, this.now());
    this.options.onUnanswered(roomId, message);
  }
}
