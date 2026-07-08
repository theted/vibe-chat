/**
 * Message broker types: priority queueing and broadcast of chat messages.
 */

import EventEmitter from "events";
import { Message } from "../index.js";
import { ContextMessage } from "./context.js";

export interface MessageBrokerConfig {
  maxQueueSize: number;
  processingDelayMs: number;
  defaultUserPriority: number;
  defaultAIPriority: number;
  enablePriorityQueuing: boolean;
}

export interface QueuedMessage extends Message {
  priority: number;
  queuedAt: number;
}

export interface QueueStatus {
  queueLength: number;
  isProcessing: boolean;
  nextMessage: QueuedMessage | null;
  maxQueueSize: number;
  utilizationPercent: number;
}

export type BrokerEvent =
  | "message-queued"
  | "message-ready"
  | "message-error"
  | "message"
  | "broadcast"
  | "processing-started"
  | "processing-completed"
  | "processing-paused"
  | "processing-resumed"
  | "queue-cleared"
  | "queue-trimmed"
  | "messages-removed"
  | "error";

export interface IMessageBroker extends EventEmitter {
  enqueueMessage(message: Message, priority?: number): void;
  processQueue(): Promise<void>;
  broadcastMessage(message: ContextMessage, roomId?: string): void;
  getQueueStatus(): QueueStatus;
  clearQueue(): void;
  getQueuedMessagesForRoom(roomId: string): QueuedMessage[];
  updateConfig(config: Partial<MessageBrokerConfig>): void;
  getConfig(): MessageBrokerConfig;
  getMetrics(): Record<string, unknown>;
  pauseProcessing(): void;
  resumeProcessing(): void;
  removeMessages(predicate: (message: QueuedMessage) => boolean): number;
}
