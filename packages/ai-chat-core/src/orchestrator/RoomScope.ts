/**
 * RoomScope - Optional per-room allowlist restricting which AIs may respond,
 * plus the private-room mode the room runs in.
 *
 * A room with no allowlist (or an empty one) permits all AIs. A direct-only
 * room (a private 1-1 chat) gets exactly one reply per user message and no
 * unprompted background chatter. A private group runs like the main room
 * with a smaller cast: only its members, and only they may be addressed.
 */
type PrivateMode = "direct" | "group";

export class RoomScope {
  private roomAllowedAIs: Map<string, Set<string>> = new Map();
  private privateModes: Map<string, PrivateMode> = new Map();

  setAllowed(roomId: string, aiIds: string[]): void {
    if (!roomId) return;
    const uniqueIds = Array.from(new Set<string>(aiIds.filter(Boolean)));
    if (uniqueIds.length === 0) {
      this.roomAllowedAIs.delete(roomId);
      return;
    }
    this.roomAllowedAIs.set(roomId, new Set<string>(uniqueIds));
  }

  clear(roomId: string): void {
    this.roomAllowedAIs.delete(roomId);
    this.privateModes.delete(roomId);
  }

  setDirectOnly(roomId: string, directOnly: boolean): void {
    this.setMode(roomId, "direct", directOnly);
  }

  isDirectOnly(roomId: string): boolean {
    return this.privateModes.get(roomId) === "direct";
  }

  setPrivateGroup(roomId: string, isGroup: boolean): void {
    this.setMode(roomId, "group", isGroup);
  }

  isPrivateGroup(roomId: string): boolean {
    return this.privateModes.get(roomId) === "group";
  }

  filter(roomId: string, aiIds: string[]): string[] {
    const allowed = this.roomAllowedAIs.get(roomId);
    if (!allowed || allowed.size === 0) return aiIds;
    return aiIds.filter((aiId) => allowed.has(aiId));
  }

  /** A room runs in one private mode at most; switching one on replaces the other. */
  private setMode(roomId: string, mode: PrivateMode, isOn: boolean): void {
    if (!roomId) return;
    if (isOn) {
      this.privateModes.set(roomId, mode);
      return;
    }
    if (this.privateModes.get(roomId) === mode) {
      this.privateModes.delete(roomId);
    }
  }
}
