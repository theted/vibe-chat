import { describe, it, beforeEach, expect } from "bun:test";
import { RoomManager } from "./RoomManager.js";

describe("RoomManager", () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  describe("createRoom", () => {
    it("creates room with default options", () => {
      const room = roomManager.createRoom("test-room");

      expect(room.id).toBe("test-room");
      expect(room.name).toBe("Room test-room");
      expect(room.topic).toBe("General discussion");
      expect(room.maxParticipants).toBe(50);
      expect(room.isActive).toBe(true);
      expect(room.participants.size).toBe(0);
      expect(room.createdAt).toBeGreaterThan(0);
    });

    it("creates room with custom options", () => {
      const room = roomManager.createRoom("custom-room", {
        name: "Custom Room",
        topic: "Custom topic",
        maxParticipants: 10,
      });

      expect(room.name).toBe("Custom Room");
      expect(room.topic).toBe("Custom topic");
      expect(room.maxParticipants).toBe(10);
    });
  });

  describe("getRoom", () => {
    it("returns null for non-existent room", () => {
      const room = roomManager.getRoom("non-existent");
      expect(room).toBe(null);
    });

    it("returns room after creation", () => {
      roomManager.createRoom("test-room");
      const room = roomManager.getRoom("test-room");

      expect(room).toBeTruthy();
      expect(room!.id).toBe("test-room");
    });
  });

  describe("joinRoom", () => {
    it("creates room if it does not exist", () => {
      const userData = { username: "testuser", joinedAt: Date.now() };
      const room = roomManager.joinRoom("socket-1", "new-room", userData);

      expect(room).toBeTruthy();
      expect(room!.id).toBe("new-room");
      expect(room!.participants.size).toBe(1);
    });

    it("adds user to existing room", () => {
      roomManager.createRoom("test-room");
      const userData = { username: "testuser", joinedAt: Date.now() };

      const room = roomManager.joinRoom("socket-1", "test-room", userData);

      expect(room).toBeTruthy();
      expect(room!.participants.size).toBe(1);
      const participant = room!.participants.get("socket-1");
      expect(participant).toBeTruthy();
      expect(participant!.username).toBe("testuser");
    });

    it("returns null when room is full", () => {
      roomManager.createRoom("small-room", { maxParticipants: 1 });
      const user1 = { username: "user1", joinedAt: Date.now() };
      const user2 = { username: "user2", joinedAt: Date.now() };

      roomManager.joinRoom("socket-1", "small-room", user1);
      const result = roomManager.joinRoom("socket-2", "small-room", user2);

      expect(result).toBe(null);
    });

    it("removes user from previous room when joining new room", () => {
      const userData = { username: "testuser", joinedAt: Date.now() };

      roomManager.joinRoom("socket-1", "room-1", userData);
      roomManager.joinRoom("socket-1", "room-2", userData);

      const room1 = roomManager.getRoom("room-1");
      const room2 = roomManager.getRoom("room-2");

      // room-1 should be deleted (empty and not default)
      expect(room1).toBe(null);
      expect(room2).toBeTruthy();
      expect(room2!.participants.size).toBe(1);
    });

    it("preserves default room when empty", () => {
      const userData = { username: "testuser", joinedAt: Date.now() };

      roomManager.joinRoom("socket-1", "default", userData);
      roomManager.joinRoom("socket-1", "other-room", userData);

      const defaultRoom = roomManager.getRoom("default");
      expect(defaultRoom).toBeTruthy();
      expect(defaultRoom!.participants.size).toBe(0);
    });
  });

  describe("leaveCurrentRoom", () => {
    it("returns null if user not in any room", () => {
      const result = roomManager.leaveCurrentRoom("unknown-socket");
      expect(result).toBe(null);
    });

    it("removes user from room and returns room id", () => {
      const userData = { username: "testuser", joinedAt: Date.now() };
      roomManager.joinRoom("socket-1", "test-room", userData);

      const result = roomManager.leaveCurrentRoom("socket-1");

      expect(result).toBe("test-room");
      expect(roomManager.isUserInRoom("socket-1")).toBe(false);
    });

    it("deletes empty non-default rooms", () => {
      const userData = { username: "testuser", joinedAt: Date.now() };
      roomManager.joinRoom("socket-1", "temp-room", userData);

      roomManager.leaveCurrentRoom("socket-1");

      expect(roomManager.getRoom("temp-room")).toBe(null);
    });
  });

  describe("getUserRoom", () => {
    it("returns null if user not in room", () => {
      const room = roomManager.getUserRoom("unknown-socket");
      expect(room).toBe(null);
    });

    it("returns room data for user in room", () => {
      const userData = { username: "testuser", joinedAt: Date.now() };
      roomManager.joinRoom("socket-1", "test-room", userData);

      const room = roomManager.getUserRoom("socket-1");

      expect(room).toBeTruthy();
      expect(room!.id).toBe("test-room");
    });
  });

  describe("getRoomParticipants", () => {
    it("returns empty array for non-existent room", () => {
      const participants = roomManager.getRoomParticipants("unknown");
      expect(participants).toEqual([]);
    });

    it("returns all participants in room", () => {
      const user1 = { username: "user1", joinedAt: Date.now() };
      const user2 = { username: "user2", joinedAt: Date.now() };

      roomManager.joinRoom("socket-1", "test-room", user1);
      roomManager.joinRoom("socket-2", "test-room", user2);

      const participants = roomManager.getRoomParticipants("test-room");

      expect(participants.length).toBe(2);
      const usernames = participants.map((p) => p.username);
      expect(usernames).toContain("user1");
      expect(usernames).toContain("user2");
    });
  });

  describe("updateRoomTopic", () => {
    it("returns false for non-existent room", () => {
      const result = roomManager.updateRoomTopic(
        "unknown",
        "New topic",
        "admin"
      );
      expect(result).toBe(false);
    });

    it("updates topic and records change metadata", () => {
      roomManager.createRoom("test-room");

      const result = roomManager.updateRoomTopic(
        "test-room",
        "New topic",
        "admin"
      );

      expect(result).toBe(true);
      const room = roomManager.getRoom("test-room");
      expect(room).toBeTruthy();
      expect(room!.topic).toBe("New topic");
      expect(room!.lastTopicChange).toBeTruthy();
      expect(room!.lastTopicChange!.topic).toBe("New topic");
      expect(room!.lastTopicChange!.changedBy).toBe("admin");
      expect(room!.lastTopicChange!.timestamp).toBeGreaterThan(0);
    });
  });

  describe("getRoomList", () => {
    it("returns empty array when no rooms", () => {
      const list = roomManager.getRoomList();
      expect(list).toEqual([]);
    });

    it("returns summary info for all rooms", () => {
      const user1 = { username: "user1", joinedAt: Date.now() };
      roomManager.createRoom("room-1", { name: "Room One", topic: "Topic 1" });
      roomManager.createRoom("room-2", { name: "Room Two", topic: "Topic 2" });
      roomManager.joinRoom("socket-1", "room-1", user1);

      const list = roomManager.getRoomList();

      expect(list.length).toBe(2);

      const room1 = list.find((r) => r.id === "room-1");
      expect(room1).toBeTruthy();
      expect(room1!.name).toBe("Room One");
      expect(room1!.topic).toBe("Topic 1");
      expect(room1!.participantCount).toBe(1);
    });
  });

  describe("getStats", () => {
    it("returns zero stats for empty manager", () => {
      const stats = roomManager.getStats();

      expect(stats.totalRooms).toBe(0);
      expect(stats.activeRooms).toBe(0);
      expect(stats.totalParticipants).toBe(0);
      expect(stats.avgParticipantsPerRoom).toBe(0);
    });

    it("calculates correct statistics", () => {
      const user1 = { username: "user1", joinedAt: Date.now() };
      const user2 = { username: "user2", joinedAt: Date.now() };

      roomManager.joinRoom("socket-1", "room-1", user1);
      roomManager.joinRoom("socket-2", "room-1", user2);
      roomManager.createRoom("room-2");

      const stats = roomManager.getStats();

      expect(stats.totalRooms).toBe(2);
      expect(stats.activeRooms).toBe(2);
      expect(stats.totalParticipants).toBe(2);
      expect(stats.avgParticipantsPerRoom).toBe(1);
    });
  });

  describe("cleanup", () => {
    it("removes user from room on cleanup", () => {
      const userData = { username: "testuser", joinedAt: Date.now() };
      roomManager.joinRoom("socket-1", "test-room", userData);

      roomManager.cleanup("socket-1");

      expect(roomManager.isUserInRoom("socket-1")).toBe(false);
    });
  });

  describe("isUserInRoom", () => {
    it("returns false for unknown socket", () => {
      expect(roomManager.isUserInRoom("unknown")).toBe(false);
    });

    it("returns true for user in room", () => {
      const userData = { username: "testuser", joinedAt: Date.now() };
      roomManager.joinRoom("socket-1", "test-room", userData);

      expect(roomManager.isUserInRoom("socket-1")).toBe(true);
    });
  });

  describe("getUserRoomId", () => {
    it("returns null for unknown socket", () => {
      expect(roomManager.getUserRoomId("unknown")).toBe(null);
    });

    it("returns room id for user in room", () => {
      const userData = { username: "testuser", joinedAt: Date.now() };
      roomManager.joinRoom("socket-1", "test-room", userData);

      expect(roomManager.getUserRoomId("socket-1")).toBe("test-room");
    });
  });
});
