/**
 * Shared TypeScript type definitions for the client application
 */

import type { RefObject, ReactNode, FormEvent } from "react";

// Re-export AI participant types from config
export type {
  AiParticipant,
  AiParticipantStatus,
} from "@/config/aiParticipants";

// Message types
export type SenderType = "user" | "ai" | "system";

export interface Message {
  id: string;
  sender: string;
  content: string;
  senderType: SenderType;
  timestamp: number;
  // AI-specific fields
  aiId?: string;
  aiName?: string;
  alias?: string;
  displayName?: string;
  modelName?: string;
  modelKey?: string;
  modelId?: string;
  providerKey?: string;
  emoji?: string;
  aiEmoji?: string;
}

// Participant types
export interface Participant {
  username: string;
  socketId?: string;
}

export interface TypingUser {
  id: string;
  name: string;
  displayName: string;
  normalized: string;
  type: "user";
  isLocal: boolean;
}

export interface TypingAI {
  id: string;
  name: string;
  displayName: string;
  alias: string;
  normalizedAlias: string;
  type: "ai";
  emoji?: string;
}

export type TypingParticipant = TypingUser | TypingAI;

// Connection types
export interface ConnectionStatus {
  connected: boolean;
  socketId?: string;
  reason?: string;
}

// Room types
export interface RoomInfo {
  topic: string;
  roomId?: string;
  participants?: Participant[];
  aiParticipants?: AiParticipant[];
}

// AI status types
export interface AIStatus {
  status: "active" | "sleeping";
  reason?: string;
}

// Toast types
export type ToastType = "success" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

// Theme types
export type Theme = "light" | "dark";

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

// Dialog position
export interface DialogPosition {
  x: number;
  y: number;
}

// Metrics types for Dashboard
export interface ProviderModelStat {
  provider: string;
  model: string;
  requests: number;
  errors: number;
  meanResponseTimeMs: number;
}

export interface ErrorLogEntry {
  provider: string;
  model: string;
  timestamp: number;
  message: string;
}

export interface DashboardMetrics {
  totalAIMessages: number;
  totalUserMessages: number;
  totalMessages: number;
  messagesPerMinute: number;
  activeUsers: number;
  activeRooms: number;
  providerModelStats: ProviderModelStat[];
  errorLogs: ErrorLogEntry[];
  uptime: number;
  timestamp: number;
}

// Import for AiParticipant type
import type { AiParticipant } from "@/config/aiParticipants";

// Component prop types - ChatView
export interface ChatViewProps {
  theme: Theme;
  toggleTheme: () => void;
  connectionStatus: ConnectionStatus;
  roomInfo: RoomInfo;
  username: string;
  participants: Participant[];
  aiParticipants?: AiParticipant[];
  messages: Message[];
  typingUsers: TypingUser[];
  typingAIs: TypingAI[];
  showScrollButton: boolean;
  onScrollToBottom: () => void;
  onLogout: () => void;
  onSendMessage: (content: string) => void;
  onAIMention: (mentions: string[], message: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  onPrivateConversationStart?: (ai: AiParticipant) => void;
  error: string | null;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
}

// Component prop types - LoginView
export interface LoginViewProps {
  connectionStatus: ConnectionStatus;
  toggleTheme: () => void;
  theme: Theme;
  username: string;
  onUsernameChange: (username: string) => void;
  onJoin: (event: FormEvent<HTMLFormElement>) => void;
  error: string | null;
  previewMessages?: Message[];
  previewParticipants?: Participant[];
  previewAiParticipants?: AiParticipant[];
}

// Component prop types - MessageInput
export interface MessageInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
  onAIMention?: (mentions: string[], message: string) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
}

// Component prop types - ChatMessage
export interface ChatMessageProps {
  message: Message;
  aiParticipants?: AiParticipant[];
  participants?: Participant[];
}

// Component prop types - ParticipantsList
export interface ParticipantsListProps {
  participants?: Participant[];
  aiParticipants?: AiParticipant[];
  typingUsers?: TypingUser[];
  typingAIs?: TypingAI[];
  isVisible?: boolean;
  onAISelect?: (ai: AiParticipant) => void;
}

// Component prop types - TypingIndicator
export interface TypingIndicatorProps {
  typingUsers?: TypingUser[];
  typingAIs?: TypingAI[];
}

// Component prop types - AISelectionDialog
export interface AISelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (aiName: string) => void;
  searchTerm?: string;
  position?: DialogPosition;
}

// Component prop types - ToastContainer
export interface ToastContainerProps {
  toasts: Toast[];
}

// Component prop types - LoadingOverlay
export interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

// Component prop types - TopicControls
export interface TopicControlsProps {
  currentTopic: string;
  onTopicChange: (topic: string) => void;
  disabled?: boolean;
}

// Component prop types - StatusCard
export interface StatusCardProps {
  icon: string;
  iconBackgroundClass?: string;
  iconTextClass?: string;
  title: string;
  subtitle: string;
  statusText: string;
  statusIndicatorClass?: string;
  statusTextClass?: string;
}

// Component prop types - SectionHeader
export interface SectionHeaderProps {
  icon: string;
  title: string;
  count: number;
}

// Component prop types - AnimatedListItem
export interface AnimatedListItemProps {
  children: ReactNode;
  index?: number;
  className?: string;
}

// Component prop types - CircuitIcon
export interface CircuitIconProps {
  className?: string;
  title?: string;
}

// Icon types
export type IconStyleVariant = "classic" | "modern";

export interface IconVariantConfig {
  strokeWidth: number;
  paths: string[];
}

export interface IconDefinition {
  classic?: IconVariantConfig;
  modern?: IconVariantConfig;
}

export type IconName =
  | "chat"
  | "topic"
  | "arrow-down"
  | "participants"
  | "users"
  | "monitor"
  | "info"
  | "cog"
  | "dashboard"
  | "logout"
  | "chevron-right"
  | "x-mark"
  | "send"
  | "sparkle"
  | "moon"
  | "sun"
  | "alert"
  | "tag";

export interface IconProps {
  name?: IconName;
  className?: string;
  strokeWidth?: number;
  styleVariant?: IconStyleVariant;
  paths?: string[];
}
