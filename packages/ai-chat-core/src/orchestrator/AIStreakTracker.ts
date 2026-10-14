/**
 * AIStreakTracker - Per-room hard cap on AI messages between human messages.
 *
 * A human message resets its room's count. Every AI message must claim a
 * slot before it is posted - regular AIs and @Chat alike - and a room at the
 * cap goes to sleep until a person posts there again. Claiming at post time,
 * rather than counting after the fact, is what makes the cap hard: replies
 * already generating when the cap is hit are dropped instead of overshooting.
 *
 * Rooms are independent, so chatter in one room can't spend another room's
 * budget, and a human in one room doesn't wake the others.
 */

export type RoomAIStatus = {
  roomId: string;
  messageCount: number;
  maxMessages: number;
  remaining: number;
  isAsleep: boolean;
  sleepReason: string | null;
  lastHumanMessageAt: number | null;
  lastAIMessageAt: number | null;
};

type RoomStreak = {
  count: number;
  isAsleep: boolean;
  sleepReason: string | null;
  lastHumanMessageAt: number | null;
  lastAIMessageAt: number | null;
};

type StreakListeners = {
  onSleep?: (roomId: string, reason: string) => void;
  onWake?: (roomId: string) => void;
};

export const SLEEP_REASONS = {
  LIMIT_REACHED: "message-limit-reached",
  MANUAL: "manual",
} as const;

export class AIStreakTracker {
  private rooms = new Map<string, RoomStreak>();

  constructor(
    readonly maxMessages: number,
    private readonly listeners: StreakListeners = {},
  ) {
    if (!Number.isInteger(maxMessages) || maxMessages < 1) {
      throw new Error(
        `AIStreakTracker needs a positive integer limit, got ${maxMessages}`,
      );
    }
  }

  /** A person posted: the room's AIs get a fresh budget. */
  recordHumanMessage(roomId: string): void {
    const room = this.getRoom(roomId);
    room.lastHumanMessageAt = Date.now();
    this.reset(roomId, room);
  }

  /**
   * Reserve one AI message in the room. Returns false when the room is
   * asleep or out of budget; the caller must then drop its message.
   */
  claim(roomId: string): boolean {
    const room = this.getRoom(roomId);
    if (room.isAsleep || room.count >= this.maxMessages) return false;

    room.count += 1;
    room.lastAIMessageAt = Date.now();
    if (room.count >= this.maxMessages) {
      this.sleep(roomId, SLEEP_REASONS.LIMIT_REACHED);
    }
    return true;
  }

  canSpeak(roomId: string): boolean {
    return this.remaining(roomId) > 0;
  }

  remaining(roomId: string): number {
    const room = this.rooms.get(roomId);
    if (!room) return this.maxMessages;
    if (room.isAsleep) return 0;
    return Math.max(this.maxMessages - room.count, 0);
  }

  /** How close the room's budget is to running out, 0..1. */
  getFatigue(roomId: string): number {
    const count = this.rooms.get(roomId)?.count ?? 0;
    return Math.min(count / this.maxMessages, 1);
  }

  sleep(roomId: string, reason: string = SLEEP_REASONS.MANUAL): void {
    const room = this.getRoom(roomId);
    const wasAsleep = room.isAsleep;
    room.isAsleep = true;
    room.sleepReason = reason;
    if (!wasAsleep) this.listeners.onSleep?.(roomId, reason);
  }

  /** Clear the room's count and wake it (an admin action or a human post). */
  wake(roomId: string): void {
    this.reset(roomId, this.getRoom(roomId));
  }

  /** Rooms that have seen any activity, e.g. for a global admin action. */
  get knownRoomIds(): string[] {
    return [...this.rooms.keys()];
  }

  getStatus(roomId: string): RoomAIStatus {
    const room = this.rooms.get(roomId);
    return {
      roomId,
      messageCount: room?.count ?? 0,
      maxMessages: this.maxMessages,
      remaining: this.remaining(roomId),
      isAsleep: room?.isAsleep ?? false,
      sleepReason: room?.sleepReason ?? null,
      lastHumanMessageAt: room?.lastHumanMessageAt ?? null,
      lastAIMessageAt: room?.lastAIMessageAt ?? null,
    };
  }

  getAllStatuses(): RoomAIStatus[] {
    return this.knownRoomIds.map((roomId) => this.getStatus(roomId));
  }

  clear(): void {
    this.rooms.clear();
  }

  private reset(roomId: string, room: RoomStreak): void {
    const wasAsleep = room.isAsleep;
    room.count = 0;
    room.isAsleep = false;
    room.sleepReason = null;
    if (wasAsleep) this.listeners.onWake?.(roomId);
  }

  private getRoom(roomId: string): RoomStreak {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        count: 0,
        isAsleep: false,
        sleepReason: null,
        lastHumanMessageAt: null,
        lastAIMessageAt: null,
      };
      this.rooms.set(roomId, room);
    }
    return room;
  }
}
