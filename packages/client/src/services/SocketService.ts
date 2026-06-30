/**
 * Socket Service - Manages WebSocket connection and events
 */

import { io, type Socket } from "socket.io-client";
import { SERVER_URL } from "@/constants/chat.ts";
import { SOCKET_EVENTS } from "@ai-chat/ai-configs";

type EventCallback = (...args: unknown[]) => void;

class SocketService {
  private socket: Socket | null;
  private listeners: Map<string, Set<EventCallback>>;
  private eventCallbacks: Map<string, Set<EventCallback>>;

  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.eventCallbacks = new Map(); // Internal event system for React components
  }

  connect(serverUrl: string = SERVER_URL): Socket {
    if (this.socket) {
      return this.socket;
    }

    this.socket = io(serverUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    });

    this.setupDefaultListeners();
    return this.socket;
  }

  setupDefaultListeners(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("✅ Connected to server:", this.socket.id);
      this.emitInternal("connection-status", {
        connected: true,
        socketId: this.socket.id,
      });
    });

    this.socket.on("disconnect", (reason) => {
      console.log("❌ Disconnected from server:", reason);
      this.emitInternal("connection-status", { connected: false, reason });
    });

    this.socket.on("connect_error", (error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error("🔌 Connection error:", message);
      console.error("Full error:", error);
      this.emitInternal("connection-error", error);
    });

    this.socket.on("reconnect", (attemptNumber) => {
      console.log("🔄 Reconnected after", attemptNumber, "attempts");
      this.emitInternal("reconnected", attemptNumber);
    });

    this.socket.on("reconnect_error", (error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error("🔄 Reconnection error:", message);
      this.emitInternal("reconnect-error", error);
    });

    this.socket.on("reconnect_failed", () => {
      console.error("❌ Reconnection failed - giving up");
      this.emitInternal("reconnect-failed");
    });
  }

  // Event management for React components
  on(event: string, callback: EventCallback): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, new Set());
    }
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.add(callback);
    }

    // Also listen to server events
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.add(callback);
    }

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback: EventCallback): void {
    if (this.eventCallbacks.has(event)) {
      const callbacks = this.eventCallbacks.get(event);
      if (callbacks) {
        callbacks.delete(callback);
      }
    }

    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event);
      if (listeners) {
        listeners.delete(callback);
      }
    }

    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Emit to server
  emit(event: string, data?: unknown): void {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  // Emit to React components (internal events)
  emitInternal(event: string, data?: unknown): void {
    if (this.eventCallbacks.has(event)) {
      const callbacks = this.eventCallbacks.get(event);
      callbacks?.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event callback for ${event}:`, error);
        }
      });
    }
  }

  // Chat specific methods
  joinRoom(username: string, roomId: string = "default"): void {
    this.emit(SOCKET_EVENTS.JOIN_ROOM, { username, roomId });
  }

  sendMessage(content: string): void {
    this.emit(SOCKET_EVENTS.USER_MESSAGE, { content });
  }

  changeTopic(topic: string): void {
    this.emit(SOCKET_EVENTS.CHANGE_TOPIC, { topic });
  }

  getRoomInfo(): void {
    this.emit(SOCKET_EVENTS.GET_ROOM_INFO);
  }

  getAIStatus(): void {
    this.emit(SOCKET_EVENTS.GET_AI_STATUS);
  }

  adminWakeAIs(): void {
    this.emit(SOCKET_EVENTS.ADMIN_WAKE_AIS);
  }

  adminSleepAIs(): void {
    this.emit(SOCKET_EVENTS.ADMIN_SLEEP_AIS);
  }

  startTyping(): void {
    console.log("📝 Sending user-typing-start event");
    this.emit(SOCKET_EVENTS.USER_TYPING_START);
  }

  stopTyping(): void {
    console.log("✋ Sending user-typing-stop event");
    this.emit(SOCKET_EVENTS.USER_TYPING_STOP);
  }

  // Connection management
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return Boolean(this.socket && this.socket.connected);
  }

  getSocketId(): string | null {
    return this.socket ? this.socket.id : null;
  }

  // Utility methods
  clearAllListeners(): void {
    this.listeners.clear();
    if (this.socket) {
      this.socket.removeAllListeners();
      this.setupDefaultListeners();
    }
  }

  reconnect(): void {
    if (this.socket) {
      this.socket.connect();
    }
  }
}

// Singleton instance
const socketService = new SocketService();
export default socketService;
