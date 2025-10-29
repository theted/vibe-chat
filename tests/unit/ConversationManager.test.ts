/**
 * Unit tests for src/conversation/ConversationManager.ts
 * 
 * Tests conversation management, participant handling, and message flow
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ConversationManager } from '../../src/conversation/ConversationManager.js';

describe('ConversationManager', () => {
  describe('Constructor', () => {
    it('should create instance with default config', () => {
      const manager = new ConversationManager();
      
      assert.ok(manager !== null);
      assert.ok(manager !== undefined);
      assert.strictEqual(manager.participants.length, 0);
      assert.strictEqual(manager.messages.length, 0);
      assert.strictEqual(manager.isActive, false);
      assert.strictEqual(manager.turnCount, 0);
      assert.strictEqual(manager.startTime, null);
    });

    it('should create instance with custom maxTurns', () => {
      const manager = new ConversationManager({ maxTurns: 20 });
      
      assert.strictEqual(manager.config.maxTurns, 20);
    });

    it('should create instance with custom timeoutMs', () => {
      const manager = new ConversationManager({ timeoutMs: 60000 });
      
      assert.strictEqual(manager.config.timeoutMs, 60000);
    });

    it('should create instance with custom logLevel', () => {
      const manager = new ConversationManager({ logLevel: 'debug' });
      
      assert.strictEqual(manager.config.logLevel, 'debug');
    });

    it('should create instance with all custom options', () => {
      const manager = new ConversationManager({
        maxTurns: 15,
        timeoutMs: 120000,
        logLevel: 'verbose',
      });
      
      assert.strictEqual(manager.config.maxTurns, 15);
      assert.strictEqual(manager.config.timeoutMs, 120000);
      assert.strictEqual(manager.config.logLevel, 'verbose');
    });

    it('should handle empty config object', () => {
      const manager = new ConversationManager({});
      
      assert.ok(manager.config.maxTurns > 0);
      assert.ok(manager.config.timeoutMs > 0);
      assert.ok(typeof manager.config.logLevel === 'string');
    });

    it('should normalize invalid maxTurns to default', () => {
      const manager = new ConversationManager({ maxTurns: NaN });
      
      assert.strictEqual(manager.config.maxTurns, 10);
    });

    it('should normalize invalid timeoutMs to default', () => {
      const manager = new ConversationManager({ timeoutMs: Infinity });
      
      assert.strictEqual(manager.config.timeoutMs, 300000);
    });

    it('should handle negative maxTurns', () => {
      const manager = new ConversationManager({ maxTurns: -5 });
      
      // Should use the value as-is or default, but not crash
      assert.ok(typeof manager.config.maxTurns === 'number');
    });

    it('should handle string values for numeric fields', () => {
      const manager = new ConversationManager({ 
        maxTurns: '15' as any,
        timeoutMs: '30000' as any,
      });
      
      // Should convert or use defaults
      assert.ok(typeof manager.config.maxTurns === 'number');
      assert.ok(typeof manager.config.timeoutMs === 'number');
    });
  });

  describe('addMessage', () => {
    let manager: ConversationManager;

    beforeEach(() => {
      manager = new ConversationManager();
    });

    it('should add a message to the conversation', () => {
      manager.addMessage({
        role: 'user',
        content: 'Hello',
        participantId: null,
      });

      assert.strictEqual(manager.messages.length, 1);
      assert.strictEqual(manager.messages[0].role, 'user');
      assert.strictEqual(manager.messages[0].content, 'Hello');
    });

    it('should add timestamp to message', () => {
      const beforeTime = new Date().toISOString();
      
      manager.addMessage({
        role: 'user',
        content: 'Test',
        participantId: null,
      });

      const afterTime = new Date().toISOString();
      
      assert.ok(manager.messages[0].timestamp);
      assert.ok(manager.messages[0].timestamp! >= beforeTime);
      assert.ok(manager.messages[0].timestamp! <= afterTime);
    });

    it('should handle multiple messages', () => {
      manager.addMessage({
        role: 'user',
        content: 'Message 1',
        participantId: null,
      });

      manager.addMessage({
        role: 'assistant',
        content: 'Message 2',
        participantId: 0,
      });

      assert.strictEqual(manager.messages.length, 2);
    });

    it('should preserve existing timestamp if provided', () => {
      const customTimestamp = '2024-01-01T00:00:00.000Z';
      
      manager.addMessage({
        role: 'user',
        content: 'Test',
        participantId: null,
        timestamp: customTimestamp,
      });

      assert.strictEqual(manager.messages[0].timestamp, customTimestamp);
    });

    it('should handle null participantId', () => {
      manager.addMessage({
        role: 'user',
        content: 'User message',
        participantId: null,
      });

      assert.strictEqual(manager.messages[0].participantId, null);
    });

    it('should handle numeric participantId', () => {
      manager.addMessage({
        role: 'assistant',
        content: 'AI message',
        participantId: 0,
      });

      assert.strictEqual(manager.messages[0].participantId, 0);
    });

    it('should handle different role types', () => {
      const roles: Array<'user' | 'assistant' | 'system'> = ['user', 'assistant', 'system'];
      
      roles.forEach((role, index) => {
        manager.addMessage({
          role,
          content: `Message ${index}`,
          participantId: null,
        });
      });

      assert.strictEqual(manager.messages.length, 3);
      roles.forEach((role, index) => {
        assert.strictEqual(manager.messages[index].role, role);
      });
    });

    it('should handle empty content', () => {
      manager.addMessage({
        role: 'user',
        content: '',
        participantId: null,
      });

      assert.strictEqual(manager.messages[0].content, '');
    });

    it('should handle very long content', () => {
      const longContent = 'x'.repeat(10000);
      
      manager.addMessage({
        role: 'user',
        content: longContent,
        participantId: null,
      });

      assert.strictEqual(manager.messages[0].content, longContent);
    });

    it('should handle special characters in content', () => {
      const specialContent = '{"test": "value"}\n\t\r';
      
      manager.addMessage({
        role: 'user',
        content: specialContent,
        participantId: null,
      });

      assert.strictEqual(manager.messages[0].content, specialContent);
    });
  });

  describe('getConversationHistory', () => {
    let manager: ConversationManager;

    beforeEach(() => {
      manager = new ConversationManager();
    });

    it('should return empty array for new conversation', () => {
      const history = manager.getConversationHistory();
      
      assert.ok(Array.isArray(history));
      assert.strictEqual(history.length, 0);
    });

    it('should return conversation history with user message', () => {
      manager.addMessage({
        role: 'user',
        content: 'Hello',
        participantId: null,
      });

      const history = manager.getConversationHistory();
      
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].from, 'User');
      assert.strictEqual(history[0].content, 'Hello');
      assert.ok(history[0].timestamp);
    });

    it('should return history with multiple messages', () => {
      manager.addMessage({
        role: 'user',
        content: 'Hello',
        participantId: null,
      });

      manager.addMessage({
        role: 'assistant',
        content: 'Hi there',
        participantId: 0,
      });

      const history = manager.getConversationHistory();
      
      assert.strictEqual(history.length, 2);
    });

    it('should format timestamps correctly', () => {
      manager.addMessage({
        role: 'user',
        content: 'Test',
        participantId: null,
        timestamp: '2024-01-01T12:00:00.000Z',
      });

      const history = manager.getConversationHistory();
      
      assert.strictEqual(history[0].timestamp, '2024-01-01T12:00:00.000Z');
    });

    it('should generate timestamp if not provided', () => {
      manager.addMessage({
        role: 'user',
        content: 'Test',
        participantId: null,
      });

      const history = manager.getConversationHistory();
      
      assert.ok(history[0].timestamp);
      assert.ok(history[0].timestamp.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/));
    });

    it('should preserve message order', () => {
      const messages = ['First', 'Second', 'Third'];
      
      messages.forEach(content => {
        manager.addMessage({
          role: 'user',
          content,
          participantId: null,
        });
      });

      const history = manager.getConversationHistory();
      
      messages.forEach((content, index) => {
        assert.strictEqual(history[index].content, content);
      });
    });
  });

  describe('stopConversation', () => {
    it('should set isActive to false', () => {
      const manager = new ConversationManager();
      manager.isActive = true;
      
      manager.stopConversation();
      
      assert.strictEqual(manager.isActive, false);
    });

    it('should work when conversation is already stopped', () => {
      const manager = new ConversationManager();
      manager.isActive = false;
      
      manager.stopConversation();
      
      assert.strictEqual(manager.isActive, false);
    });

    it('should not affect other properties', () => {
      const manager = new ConversationManager();
      manager.turnCount = 5;
      manager.isActive = true;
      
      manager.stopConversation();
      
      assert.strictEqual(manager.turnCount, 5);
    });
  });

  describe('Configuration normalization', () => {
    it('should use default maxTurns when not provided', () => {
      const manager = new ConversationManager({});
      
      assert.strictEqual(manager.config.maxTurns, 10);
    });

    it('should use default timeoutMs when not provided', () => {
      const manager = new ConversationManager({});
      
      assert.strictEqual(manager.config.timeoutMs, 300000);
    });

    it('should use default logLevel when not provided', () => {
      const manager = new ConversationManager({});
      
      assert.strictEqual(manager.config.logLevel, 'info');
    });

    it('should handle zero maxTurns', () => {
      const manager = new ConversationManager({ maxTurns: 0 });
      
      assert.strictEqual(manager.config.maxTurns, 0);
    });

    it('should handle very large maxTurns', () => {
      const manager = new ConversationManager({ maxTurns: 1000000 });
      
      assert.strictEqual(manager.config.maxTurns, 1000000);
    });

    it('should handle very large timeoutMs', () => {
      const manager = new ConversationManager({ timeoutMs: 999999999 });
      
      assert.strictEqual(manager.config.timeoutMs, 999999999);
    });

    it('should handle various logLevel values', () => {
      const levels = ['debug', 'info', 'warn', 'error'];
      
      levels.forEach(level => {
        const manager = new ConversationManager({ logLevel: level });
        assert.strictEqual(manager.config.logLevel, level);
      });
    });
  });

  describe('Message tracking', () => {
    it('should track messages correctly', () => {
      const manager = new ConversationManager();
      
      assert.strictEqual(manager.messages.length, 0);
      
      manager.addMessage({
        role: 'user',
        content: 'Test',
        participantId: null,
      });
      
      assert.strictEqual(manager.messages.length, 1);
    });

    it('should maintain message references', () => {
      const manager = new ConversationManager();
      
      manager.addMessage({
        role: 'user',
        content: 'Test',
        participantId: null,
      });
      
      const messageRef = manager.messages[0];
      
      assert.strictEqual(messageRef.content, 'Test');
    });
  });

  describe('Participant tracking', () => {
    it('should start with empty participants array', () => {
      const manager = new ConversationManager();
      
      assert.ok(Array.isArray(manager.participants));
      assert.strictEqual(manager.participants.length, 0);
    });

    it('should maintain participants array reference', () => {
      const manager = new ConversationManager();
      const participantsRef = manager.participants;
      
      assert.strictEqual(manager.participants, participantsRef);
    });
  });

  describe('State management', () => {
    it('should initialize with correct state', () => {
      const manager = new ConversationManager();
      
      assert.strictEqual(manager.isActive, false);
      assert.strictEqual(manager.turnCount, 0);
      assert.strictEqual(manager.startTime, null);
    });

    it('should allow state modification', () => {
      const manager = new ConversationManager();
      
      manager.isActive = true;
      manager.turnCount = 5;
      manager.startTime = Date.now();
      
      assert.strictEqual(manager.isActive, true);
      assert.strictEqual(manager.turnCount, 5);
      assert.ok(manager.startTime !== null);
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined config gracefully', () => {
      const manager = new ConversationManager(undefined);
      
      assert.ok(manager.config);
      assert.ok(typeof manager.config.maxTurns === 'number');
    });

    it('should handle partial config objects', () => {
      const manager = new ConversationManager({ maxTurns: 5 });
      
      assert.strictEqual(manager.config.maxTurns, 5);
      assert.ok(manager.config.timeoutMs);
      assert.ok(manager.config.logLevel);
    });

    it('should handle messages with undefined fields', () => {
      const manager = new ConversationManager();
      
      manager.addMessage({
        role: 'user',
        content: 'Test',
        participantId: null,
        timestamp: undefined,
      });
      
      assert.ok(manager.messages[0].timestamp);
    });
  });
});