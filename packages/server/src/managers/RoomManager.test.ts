import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { RoomManager } from "./RoomManager.js";

describe("RoomManager", () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  describe("createRoom", () => {
    it("creates room with default options", () => {
      const room = roomManager.createRoom("test-room");

      assert.equal(room.id, "test-room");
      assert.equal(room.name, "Room test-room");
      assert.equal(room.topic, "General discussion");
      assert.equal(room.maxParticipants, 50);
      assert.equal(room.isActive, true);
      assert.equal(room.participants.size, 0);
      assert.ok(room.createdAt > 0);
    });

    it("creates room with custom options", () => {
      const room = roomManager.createRoom("custom-room", {
        name: "Custom Room",
        topic: "Custom topic",
        maxParticipants: 10,
      });

      assert.equal(room.name, "Custom Room");
      assert.equal(room.topic, "Custom topic");
      assert.equal(room.maxParticipants, 10);
    });
  });

  describe("getRoom", () => {
    it("returns null for non-existent room", () => {
      const room = roomManager.getRoom("non-existent");
      assert.equal(room, null);
    });

    it("returns room after creation", () => {
      roomManager.createRoom("test-room");
      const room = roomManager.getRoom("test-room");

      assert.ok(room);
      assert.equal(room.id, "test-room");
    });
  });

  describe("joinRoom", () => {
    it("creates room if it does not exist", () => {
      const userData = { username: "testuser", joinedAt: Date.now() };
      const room = roomManager.joinRoom("socket-1", "new-room", userData);

      assert.ok(room);
      assert.equal(room.id, "new-room");
      assert.equal(room.participants.size, 1);
    });

    it("adds user to existing room", () => {
      roomManager.createRoom("test-room");
      const userData = { username: "testuser", joinedAt: Date.now() };

      const room = roomManager.joinRoom("socket-1", "test-room", userData);

      assert.ok(room);
      assert.equal(room.participants.size, 1);
      const participant = room.participants.get("socket-1");
      assert.ok(participant);
      assert.equal(participant.username, "testuser");
    });

    it("returns null when room is full", () => {
      roomManager.createRoom("small-room", { maxParticipants: 1 });
      const user1 = { username: "user1", joinedAt: Date.now() };
      const user2 = { username: "user2", joinedAt: Date.now() };

      roomManager.joinRoom("socket-1", "small-room", user1);
      const result = roomManager.joinRoom("socket-2", "small-room", user2);

      assert.equal(result, null);
    });

    it("removes user from previous room when joining new room", () => {
      const userData = { username: "testuser", joinedAt: Date.now() };

      roomManager.joinRoom("socket-1", "room-1", userData);
      roomManager.joinRoom("socket-1", "room-2", userData);

      const room1 = roomManager.getRoom("room-1");
      const room2 = roomManager.getRoom("room-2");

      // room-1 should be deleted (empty and not default)
      assert.equal(room1, null);
      assert.ok(room2);
      assert.equal(room2.participants.size, 1);
    });

    it("preserves default room when empty", () => {
      const userData = { username: "testuser", joinedAt: Date.now() };

      roomManager.joinRoom("socket-1", "default", userData);
      roomManager.joinRoom("socket-1", "other-room", userData);

      const defaultRoom = roomManager.getRoom("default");
      assert.ok(defaultRoom);
      assert.equal(defaultRoom.participants.size, 0);
    });
  });

  describe("leaveCurrentRoom", () => {
    it("returns null if user not in any room", () => {
      const result = roomManager.leaveCurrentRoom("unknown-socket");
      assert.equal(result, null);
    });

    it("removes user from room and returns room id", () => {
      const userData = { username: "testuser", joinedAt: Date.now() };
      roomManager.joinRoom("socket-1", "test-room", userData);

      const result = roomManager.leaveCurrentRoom("socket-1");

      assert.equal(result, "test-room");
      assert.equal(roomManager.isUserInRoom("socket-1"), false);
    });

    it("deletes empty non-default rooms", () => {
      const userData = { username: "testuser", joinedAt: Date.now() };
      roomManager.joinRoom("socket-1", "temp-room", userData);

      roomManager.leaveCurrentRoom("socket-1");

      assert.equal(roomManager.getRoom("temp-room"), null);
    });
  });

  describe("getUserRoom", () => {
    it("returns null if user not in room", () => {
      const room = roomManager.getUserRoom("unknown-socket");
      assert.equal(room, null);
    });

    it("returns room data for user in room", () => {
      const userData = { username: "testuser", joinedAt: Date.now() };
      roomManager.joinRoom("socket-1", "test-room", userData);

      const room = roomManager.getUserRoom("socket-1");

      assert.ok(room);
      assert.equal(room.id, "test-room");
    });
  });

  describe("getRoomParticipants", () => {
    it("returns empty array for non-existent room", () => {
      const participants = roomManager.getRoomParticipants("unknown");
      assert.deepEqual(participants, []);
    });

    it("returns all participants in room", () => {
      const user1 = { username: "user1", joinedAt: Date.now() };
      const user2 = { username: "user2", joinedAt: Date.now() };

      roomManager.joinRoom("socket-1", "test-room", user1);
      roomManager.joinRoom("socket-2", "test-room", user2);

      const participants = roomManager.getRoomParticipants("test-room");

      assert.equal(participants.length, 2);
      const usernames = participants.map((p) => p.username);
      assert.ok(usernames.includes("user1"));
      assert.ok(usernames.includes("user2"));
    });
  });

  describe("updateRoomTopic", () => {
    it("returns false for non-existent room", () => {
      const result = roomManager.updateRoomTopic(
        "unknown",
        "New topic",
        "admin"
      );
      assert.equal(result, false);
    });

    it("updates topic and records change metadata", () => {
      roomManager.createRoom("test-room");

      const result = roomManager.updateRoomTopic(
        "test-room",
        "New topic",
        "admin"
      );

      assert.equal(result, true);
      const room = roomManager.getRoom("test-room");
      assert.ok(room);
      assert.equal(room.topic, "New topic");
      assert.ok(room.lastTopicChange);
      assert.equal(room.lastTopicChange.topic, "New topic");
      assert.equal(room.lastTopicChange.changedBy, "admin");
      assert.ok(room.lastTopicChange.timestamp > 0);
    });
  });

  describe("getRoomList", () => {
    it("returns empty array when no rooms", () => {
      const list = roomManager.getRoomList();
      assert.deepEqual(list, []);
    });

    it("returns summary info for all rooms", () => {
      const user1 = { username: "user1", joinedAt: Date.now() };
      roomManager.createRoom("room-1", { name: "Room One", topic: "Topic 1" });
      roomManager.createRoom("room-2", { name: "Room Two", topic: "Topic 2" });
      roomManager.joinRoom("socket-1", "room-1", user1);

      const list = roomManager.getRoomList();

      assert.equal(list.length, 2);

      const room1 = list.find((r) => r.id === "room-1");
      assert.ok(room1);
      assert.equal(room1.name, "Room One");
      assert.equal(room1.topic, "Topic 1");
      assert.equal(room1.participantCount, 1);
    });
  });

  describe("getStats", () => {
    it("returns zero stats for empty manager", () => {
      const stats = roomManager.getStats();

      assert.equal(stats.totalRooms, 0);
      assert.equal(stats.activeRooms, 0);
      assert.equal(stats.totalParticipants, 0);
      assert.equal(stats.avgParticipantsPerRoom, 0);
    });

    it("calculates correct statistics", () => {
      const user1 = { username: "user1", joinedAt: Date.now() };
      const user2 = { username: "user2", joinedAt: Date.now() };

      roomManager.joinRoom("socket-1", "room-1", user1);
      roomManager.joinRoom("socket-2", "room-1", user2);
      roomManager.createRoom("room-2");

      const stats = roomManager.getStats();

      assert.equal(stats.totalRooms, 2);
      assert.equal(stats.activeRooms, 2);
      assert.equal(stats.totalParticipants, 2);
      assert.equal(stats.avgParticipantsPerRoom, 1);
    });
  });

  describe("cleanup", () => {
    it("removes user from room on cleanup", () => {
      const userData = { username: "testuser", joinedAt: Date.now() };
      roomManager.joinRoom("socket-1", "test-room", userData);

      roomManager.cleanup("socket-1");

      assert.equal(roomManager.isUserInRoom("socket-1"), false);
    });
  });

  describe("isUserInRoom", () => {
    it("returns false for unknown socket", () => {
      assert.equal(roomManager.isUserInRoom("unknown"), false);
    });

    it("returns true for user in room", () => {
      const userData = { username: "testuser", joinedAt: Date.now() };
      roomManager.joinRoom("socket-1", "test-room", userData);

      assert.equal(roomManager.isUserInRoom("socket-1"), true);
    });
  });

  describe("getUserRoomId", () => {
    it("returns null for unknown socket", () => {
      assert.equal(roomManager.getUserRoomId("unknown"), null);
    });

    it("returns room id for user in room", () => {
      const userData = { username: "testuser", joinedAt: Date.now() };
      roomManager.joinRoom("socket-1", "test-room", userData);

      assert.equal(roomManager.getUserRoomId("socket-1"), "test-room");
    });
  });
});
