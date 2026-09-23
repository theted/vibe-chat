/**
 * Room id conventions shared by client, server, and orchestrator.
 *
 * A private room is a 1-1 chat between one user and one AI. Its id encodes
 * both, so any process can recover the AI from the id alone without extra
 * state: `private:<username>:<aiId>`.
 */

export const DEFAULT_ROOM_ID = "default";

export const PRIVATE_ROOM_PREFIX = "private:";

export const isPrivateRoomId = (roomId?: string | null): boolean =>
  typeof roomId === "string" && roomId.startsWith(PRIVATE_ROOM_PREFIX);

/** Build the room id for a 1-1 chat. Returns null if either part is missing. */
export const buildPrivateRoomId = (
  username: string,
  aiId: string,
): string | null => {
  const user = username?.trim();
  const ai = aiId?.trim();
  if (!user || !ai) return null;
  return `${PRIVATE_ROOM_PREFIX}${user}:${ai}`;
};

/**
 * Extract the AI id from a private room id, or null if the id isn't a
 * well-formed private room. The AI id may itself contain colons, so
 * everything after the username is kept.
 */
export const getPrivateRoomAiId = (roomId: string): string | null => {
  if (!isPrivateRoomId(roomId)) return null;

  const parts = roomId.split(":");
  if (parts.length < 3) return null;

  const aiId = parts.slice(2).join(":").trim();
  return aiId || null;
};

/** Treat a missing room id as the default room, so legacy callers group there. */
export const normalizeRoomId = (roomId?: string | null): string =>
  roomId?.trim() || DEFAULT_ROOM_ID;
