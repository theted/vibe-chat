/**
 * Socket.io wire-protocol event names shared between client and server.
 *
 * Single source of truth — a typo on either side of the wire fails silently,
 * so both sides must reference these constants instead of raw strings.
 * Socket.io built-ins ("connect", "disconnect", "connection", ...) are not
 * listed here; neither are client-internal pseudo-events ("connection-status")
 * or orchestrator-internal events ("ais-awakened").
 */
export const SOCKET_EVENTS = {
  // Client → Server
  JOIN_ROOM: "join-room",
  USER_MESSAGE: "user-message",
  CHANGE_TOPIC: "change-topic",
  GET_ROOM_INFO: "get-room-info",
  GET_AI_STATUS: "get-ai-status",
  GET_AI_PARTICIPANTS: "get-ai-participants",
  GET_METRICS: "get-metrics",
  GET_METRICS_HISTORY: "get-metrics-history",
  JOIN_DASHBOARD: "join-dashboard",
  ADMIN_WAKE_AIS: "admin-wake-ais",
  ADMIN_SLEEP_AIS: "admin-sleep-ais",
  USER_TYPING_START: "user-typing-start",
  USER_TYPING_STOP: "user-typing-stop",

  // Server → Client
  CONNECTION_ESTABLISHED: "connection-established",
  NEW_MESSAGE: "new-message",
  PREVIEW_MESSAGE: "preview-message",
  RECENT_MESSAGES: "recent-messages",
  ROOM_JOINED: "room-joined",
  ROOM_INFO: "room-info",
  USER_JOINED: "user-joined",
  USER_LEFT: "user-left",
  AI_PARTICIPANTS: "ai-participants",
  AI_STATUS: "ai-status",
  AI_STATUS_CHANGED: "ai-status-changed",
  AI_GENERATING_START: "ai-generating-start",
  AI_GENERATING_STOP: "ai-generating-stop",
  TOPIC_CHANGED: "topic-changed",
  METRICS_UPDATE: "metrics-update",
  METRICS_HISTORY: "metrics-history",
  ADMIN_ACTION: "admin-action",
  ERROR: "error",
} as const;

export type SocketEventName =
  (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
