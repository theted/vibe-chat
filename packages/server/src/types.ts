export type SenderType = "user" | "ai" | "system" | "assistant";

export type ChatMessage = {
  id?: string;
  sender: string;
  displayName?: string;
  alias?: string;
  normalizedAlias?: string;
  content: string;
  senderType: SenderType;
  roomId?: string;
  priority?: number;
  suppressAIResponses?: boolean;
  timestamp?: number;
  storedAt?: number;
  aiId?: string;
  aiName?: string;
  modelKey?: string;
  emoji?: string;
  isInternalResponder?: boolean;
  mentionsTriggerSender?: string | null;
  contextQuestion?: string | null;
  provider?: string;
};

export type RoomUserData = {
  username: string;
  joinedAt: number;
};

export type ConnectedUser = RoomUserData & {
  roomId: string;
};

export type RoomParticipant = RoomUserData & {
  socketId: string;
};

export type RoomData = {
  id: string;
  name: string;
  topic: string;
  participants: Map<string, RoomParticipant>;
  createdAt: number;
  maxParticipants: number;
  isActive: boolean;
  lastTopicChange?: {
    topic: string;
    changedBy: string;
    timestamp: number;
  };
};

export type RoomSummary = {
  id: string;
  name: string;
  topic: string;
  participantCount: number;
  maxParticipants: number;
  createdAt: number;
  isActive: boolean;
};

export type RoomStats = {
  totalRooms: number;
  activeRooms: number;
  totalParticipants: number;
  avgParticipantsPerRoom: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
};

export type AITrackerStatus = {
  messageCount: number;
  maxMessages: number;
  isAsleep: boolean;
  sleepReason: string | null;
  lastResetTime: number;
  lastAIMessageTime: number;
  canSendMessage: boolean;
};

export type AITrackerStats = {
  totalRooms: number;
  activeRooms: number;
  sleepingRooms: number;
  totalAIMessages: number;
  avgMessagesPerRoom: number;
};

export type ChatAssistantMetadata = {
  sender: string;
  displayName: string;
  alias: string;
  normalizedAlias: string;
  aiId: string;
  aiName: string;
};

export type MessageHistoryEntry = {
  type: "ai" | "user";
  timestamp: number;
};

export type MetricsSnapshot = {
  totalAIMessages: number;
  totalUserMessages: number;
  totalMessages: number;
  messagesPerMinute: number;
  activeUsers: number;
  activeRooms: number;
  providerModelStats?: ProviderModelStats[];
  errorLogs?: ProviderErrorLogEntry[];
};

export type MetricsHistoryEntry = {
  timestamp: number;
  aiMessages: number;
  userMessages: number;
  totalMessages: number;
};

export type ProviderModelStats = {
  provider: string;
  model: string;
  requests: number;
  errors: number;
  meanResponseTimeMs: number;
};

export type ProviderErrorLogEntry = {
  provider: string;
  model: string;
  message: string;
  timestamp: number;
};

export type ActiveAIParticipant = {
  id: string;
  name: string;
  displayName: string;
  alias: string;
  mentionAlias: string;
  normalizedAlias: string;
  emoji?: string;
  provider?: string;
  status: "active" | "inactive";
};

// Socket event payload types

export type ChatAssistantOrigin = {
  type?: "user" | "ai" | string;
  sender?: string;
  username?: string;
  aiId?: string;
  isInternalResponder?: boolean;
};

export type TriggerChatAssistantPayload = {
  roomId: string;
  content: string;
  origin?: ChatAssistantOrigin;
};

export type JoinRoomPayload = {
  username?: string;
  roomId?: string;
};

export type UserMessagePayload = {
  content?: string;
};

export type TopicChangePayload = {
  topic?: string;
};

export type MetricsHistoryPayload = {
  duration?: number;
};
