/**
 * RoomScope - Optional per-room allowlist restricting which AIs may respond.
 *
 * A room with no allowlist (or an empty one) permits all AIs.
 */
export class RoomScope {
  private roomAllowedAIs: Map<string, Set<string>> = new Map();

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
  }

  filter(roomId: string, aiIds: string[]): string[] {
    const allowed = this.roomAllowedAIs.get(roomId);
    if (!allowed || allowed.size === 0) return aiIds;
    return aiIds.filter((aiId) => allowed.has(aiId));
  }
}
