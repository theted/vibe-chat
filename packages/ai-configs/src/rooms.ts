/**
 * Room id conventions shared by client, server, and orchestrator.
 *
 * A private room is a chat between one user and one or more AIs. Its id
 * encodes both, so any process can recover the AIs from the id alone without
 * extra state: `private:<username>:<aiId>` for a 1-1 chat, and
 * `private:<username>:<aiId>+<aiId>+...` for a private group. The AI ids are
 * sorted, so the same set of models always lands in the same room (and its
 * history) no matter the order they were picked in.
 */

export const DEFAULT_ROOM_ID = "default";

export const PRIVATE_ROOM_PREFIX = "private:";

/** AI ids are `${providerKey}_${modelKey}`, so "+" never appears in one. */
export const PRIVATE_ROOM_AI_SEPARATOR = "+";

/**
 * Most AIs a private room holds. The room shares one AI-message budget per
 * human message, so a bigger cast would leave the models no room to reply to
 * each other.
 */
export const MAX_PRIVATE_ROOM_AIS = 5;

export const isPrivateRoomId = (roomId?: string | null): boolean =>
  typeof roomId === "string" && roomId.startsWith(PRIVATE_ROOM_PREFIX);

/**
 * Build the room id for a private chat with one AI or several. Returns null if
 * the username or every AI id is missing, or if there are more AIs than a
 * private room holds.
 */
export const buildPrivateRoomId = (
  username: string,
  aiIds: string | string[],
): string | null => {
  const user = username?.trim();
  const ais = [
    ...new Set(
      (Array.isArray(aiIds) ? aiIds : [aiIds])
        .map((aiId) => aiId?.trim())
        .filter(Boolean),
    ),
  ].sort();
  if (!user || ais.length === 0 || ais.length > MAX_PRIVATE_ROOM_AIS) {
    return null;
  }
  return `${PRIVATE_ROOM_PREFIX}${user}:${ais.join(PRIVATE_ROOM_AI_SEPARATOR)}`;
};

const splitPrivateRoomId = (roomId: string): string[] | null => {
  if (!isPrivateRoomId(roomId)) return null;
  const parts = roomId.split(":");
  return parts.length < 3 ? null : parts;
};

/**
 * Extract the AI ids from a private room id, or [] if the id isn't a
 * well-formed private room. An AI id may itself contain colons, so everything
 * after the username is kept before splitting on the separator.
 */
export const getPrivateRoomAiIds = (roomId: string): string[] => {
  const parts = splitPrivateRoomId(roomId);
  if (!parts) return [];

  const aiIds = parts
    .slice(2)
    .join(":")
    .split(PRIVATE_ROOM_AI_SEPARATOR)
    .map((aiId) => aiId.trim())
    .filter(Boolean);
  return [...new Set(aiIds)];
};

/** The username a private room belongs to, or null for any other room. */
export const getPrivateRoomOwner = (roomId: string): string | null =>
  splitPrivateRoomId(roomId)?.[1]?.trim() || null;

/** Treat a missing room id as the default room, so legacy callers group there. */
export const normalizeRoomId = (roomId?: string | null): string =>
  roomId?.trim() || DEFAULT_ROOM_ID;
