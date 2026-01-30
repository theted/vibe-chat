/**
 * Room Manager - Manages chat rooms and participants
 */

import type {
  RoomData,
  RoomParticipant,
  RoomStats,
  RoomSummary,
  RoomUserData,
} from "@/types.js";

type RoomOptions = {
  name?: string;
  topic?: string;
  maxParticipants?: number;
};

/**
 * Manages chat rooms and their participants.
 */
export class RoomManager {
  private rooms: Map<string, RoomData>;
  private userRooms: Map<string, string>;

  /**
   * Create a new RoomManager instance.
   */
  constructor() {
    this.rooms = new Map(); // roomId -> room data
    this.userRooms = new Map(); // socketId -> roomId
  }

  /**
   * Create a new room
   * @param {string} roomId - Room identifier
   * @param {Object} options - Room options
   * @returns {Object} Room data
   */
  createRoom(roomId: string, options: RoomOptions = {}): RoomData {
    const room: RoomData = {
      id: roomId,
      name: options.name || `Room ${roomId}`,
      topic: options.topic || "General discussion",
      participants: new Map(), // socketId -> user data
      createdAt: Date.now(),
      maxParticipants: options.maxParticipants || 50,
      isActive: true,
    };

    this.rooms.set(roomId, room);
    return room;
  }

  /**
   * Get room by ID
   * @param {string} roomId - Room identifier
   * @returns {Object|null} Room data or null if not found
   */
  getRoom(roomId: string): RoomData | null {
    return this.rooms.get(roomId) || null;
  }

  /**
   * Join a room
   * @param {string} socketId - Socket identifier
   * @param {string} roomId - Room identifier
   * @param {Object} userData - User data
   * @returns {Object|null} Room data or null if failed
   */
  joinRoom(
    socketId: string,
    roomId: string,
    userData: RoomUserData
  ): RoomData | null {
    let room = this.getRoom(roomId);
    
    // Create room if it doesn't exist
    if (!room) {
      room = this.createRoom(roomId);
    }

    // Check if room is full
    if (room.participants.size >= room.maxParticipants) {
      return null;
    }

    // Remove user from previous room
    this.leaveCurrentRoom(socketId);

    // Add user to new room
    room.participants.set(socketId, {
      ...userData,
      socketId,
      joinedAt: Date.now(),
    } as RoomParticipant);

    this.userRooms.set(socketId, roomId);
    return room;
  }

  /**
   * Leave current room
   * @param {string} socketId - Socket identifier
   * @returns {string|null} Previous room ID or null
   */
  leaveCurrentRoom(socketId: string): string | null {
    const currentRoomId = this.userRooms.get(socketId);
    if (!currentRoomId) {
      return null;
    }

    const room = this.getRoom(currentRoomId);
    if (room) {
      room.participants.delete(socketId);
      
      // Remove empty rooms (except default room)
      if (room.participants.size === 0 && currentRoomId !== "default") {
        this.rooms.delete(currentRoomId);
      }
    }

    this.userRooms.delete(socketId);
    return currentRoomId;
  }

  /**
   * Get user's current room
   * @param {string} socketId - Socket identifier
   * @returns {Object|null} Room data or null
   */
  getUserRoom(socketId: string): RoomData | null {
    const roomId = this.userRooms.get(socketId);
    return roomId ? this.getRoom(roomId) : null;
  }

  /**
   * Get all participants in a room
   * @param {string} roomId - Room identifier
   * @returns {Array} Array of participant data
   */
  getRoomParticipants(roomId: string): RoomParticipant[] {
    const room = this.getRoom(roomId);
    return room ? Array.from(room.participants.values()) : [];
  }

  /**
   * Update room topic
   * @param {string} roomId - Room identifier
   * @param {string} newTopic - New topic
   * @param {string} changedBy - Who changed the topic
   * @returns {boolean} Success status
   */
  updateRoomTopic(roomId: string, newTopic: string, changedBy: string): boolean {
    const room = this.getRoom(roomId);
    if (!room) {
      return false;
    }

    room.topic = newTopic;
    room.lastTopicChange = {
      topic: newTopic,
      changedBy,
      timestamp: Date.now(),
    };

    return true;
  }

  /**
   * Get room list with basic info
   * @returns {Array} Array of room info
   */
  getRoomList(): RoomSummary[] {
    return Array.from(this.rooms.values()).map((room) => ({
      id: room.id,
      name: room.name,
      topic: room.topic,
      participantCount: room.participants.size,
      maxParticipants: room.maxParticipants,
      createdAt: room.createdAt,
      isActive: room.isActive,
    }));
  }

  /**
   * Get statistics
   * @returns {Object} Statistics object
   */
  getStats(): RoomStats {
    const totalRooms = this.rooms.size;
    const activeRooms = Array.from(this.rooms.values()).filter(
      (room) => room.isActive
    ).length;
    const totalParticipants = Array.from(this.rooms.values())
      .reduce((sum, room) => sum + room.participants.size, 0);

    return {
      totalRooms,
      activeRooms,
      totalParticipants,
      avgParticipantsPerRoom: totalRooms > 0 ? totalParticipants / totalRooms : 0,
    };
  }

  /**
   * Cleanup - remove disconnected users
   * @param {string} socketId - Socket identifier
   */
  cleanup(socketId: string): void {
    this.leaveCurrentRoom(socketId);
  }

  /**
   * Check if user is in a room
   * @param {string} socketId - Socket identifier
   * @returns {boolean} True if user is in a room
   */
  isUserInRoom(socketId: string): boolean {
    return this.userRooms.has(socketId);
  }

  /**
   * Get room ID for user
   * @param {string} socketId - Socket identifier
   * @returns {string|null} Room ID or null
   */
  getUserRoomId(socketId: string): string | null {
    return this.userRooms.get(socketId) || null;
  }
}
