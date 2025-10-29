/**
 * Unit tests for src/services/StatsTracker.ts
 * 
 * Tests Redis-backed statistics tracking with graceful degradation
 */

import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { statsTracker } from '../../src/services/StatsTracker.js';

describe('StatsTracker', () => {
  describe('Construction and initialization', () => {
    it('should be a singleton instance', () => {
      assert.ok(statsTracker !== null);
      assert.ok(statsTracker !== undefined);
    });

    it('should have recordMessage method', () => {
      assert.strictEqual(typeof statsTracker.recordMessage, 'function');
    });

    it('should have getClient method', () => {
      assert.strictEqual(typeof statsTracker.getClient, 'function');
    });
  });

  describe('recordMessage', () => {
    it('should accept a message with all fields', async () => {
      const message = {
        role: 'assistant',
        content: 'Test message',
        provider: 'openai',
        model: 'gpt-4',
      };

      // Should not throw
      await assert.doesNotReject(async () => {
        await statsTracker.recordMessage(message);
      });
    });

    it('should accept a message with minimal fields', async () => {
      const message = {
        role: 'user',
        content: 'Hello',
      };

      await assert.doesNotReject(async () => {
        await statsTracker.recordMessage(message);
      });
    });

    it('should handle null provider and model', async () => {
      const message = {
        role: 'system',
        content: 'System message',
        provider: null,
        model: null,
      };

      await assert.doesNotReject(async () => {
        await statsTracker.recordMessage(message);
      });
    });

    it('should handle empty content', async () => {
      const message = {
        role: 'assistant',
        content: '',
        provider: 'anthropic',
        model: 'claude-3',
      };

      await assert.doesNotReject(async () => {
        await statsTracker.recordMessage(message);
      });
    });

    it('should handle very long content', async () => {
      const longContent = 'x'.repeat(5000);
      const message = {
        role: 'assistant',
        content: longContent,
        provider: 'openai',
        model: 'gpt-4',
      };

      await assert.doesNotReject(async () => {
        await statsTracker.recordMessage(message);
      });
    });

    it('should handle special characters in content', async () => {
      const message = {
        role: 'assistant',
        content: '{"test": "value"}\n\t\r',
        provider: 'openai',
        model: 'gpt-4',
      };

      await assert.doesNotReject(async () => {
        await statsTracker.recordMessage(message);
      });
    });

    it('should handle unicode in content', async () => {
      const message = {
        role: 'assistant',
        content: '你好世界 🌍 émojis',
        provider: 'openai',
        model: 'gpt-4',
      };

      await assert.doesNotReject(async () => {
        await statsTracker.recordMessage(message);
      });
    });

    it('should handle different role types', async () => {
      const roles = ['assistant', 'user', 'system', 'function', 'tool'];
      
      for (const role of roles) {
        const message = {
          role,
          content: `Message from ${role}`,
        };

        await assert.doesNotReject(async () => {
          await statsTracker.recordMessage(message);
        });
      }
    });
  });

  describe('getClient', () => {
    it('should return a promise', async () => {
      const clientPromise = statsTracker.getClient();
      assert.ok(clientPromise instanceof Promise);
    });

    it('should handle multiple calls gracefully', async () => {
      const client1 = statsTracker.getClient();
      const client2 = statsTracker.getClient();
      
      assert.ok(client1 instanceof Promise);
      assert.ok(client2 instanceof Promise);

      // Should return the same promise (cached)
      const result1 = await client1;
      const result2 = await client2;
      
      // Both should be null (no Redis) or both the same client
      assert.strictEqual(result1, result2);
    });
  });

  describe('Error handling', () => {
    it('should gracefully handle Redis connection failures', async () => {
      const message = {
        role: 'assistant',
        content: 'Test message',
        provider: 'test',
        model: 'test-model',
      };

      // Should not throw even if Redis fails
      await assert.doesNotReject(async () => {
        await statsTracker.recordMessage(message);
      });
    });

    it('should handle malformed message objects without crashing', async () => {
      const malformedMessages = [
        { role: 'assistant' }, // missing content
        { content: 'test' }, // missing role
        {}, // empty object
      ];

      for (const msg of malformedMessages) {
        await assert.doesNotReject(async () => {
          await statsTracker.recordMessage(msg as any);
        });
      }
    });
  });

  describe('Type safety', () => {
    it('should accept valid StatsMessageRole values', async () => {
      const validRoles: Array<'assistant' | 'user' | 'system'> = [
        'assistant',
        'user', 
        'system'
      ];

      for (const role of validRoles) {
        await assert.doesNotReject(async () => {
          await statsTracker.recordMessage({
            role,
            content: 'test',
          });
        });
      }
    });

    it('should accept custom role strings', async () => {
      const customRole = 'custom_role_type';
      await assert.doesNotReject(async () => {
        await statsTracker.recordMessage({
          role: customRole,
          content: 'test',
        });
      });
    });
  });

  describe('Content truncation', () => {
    it('should handle content at max length boundary', async () => {
      const exactLength = 'x'.repeat(1000); // MAX_CONTENT_LENGTH
      const message = {
        role: 'assistant',
        content: exactLength,
      };

      await assert.doesNotReject(async () => {
        await statsTracker.recordMessage(message);
      });
    });

    it('should handle content exceeding max length', async () => {
      const tooLong = 'x'.repeat(2000); // Exceeds MAX_CONTENT_LENGTH
      const message = {
        role: 'assistant',
        content: tooLong,
      };

      await assert.doesNotReject(async () => {
        await statsTracker.recordMessage(message);
      });
    });
  });

  describe('Provider and model handling', () => {
    it('should accept various provider names', async () => {
      const providers = ['openai', 'anthropic', 'google', 'mistral', 'custom'];
      
      for (const provider of providers) {
        await assert.doesNotReject(async () => {
          await statsTracker.recordMessage({
            role: 'assistant',
            content: 'test',
            provider,
            model: 'test-model',
          });
        });
      }
    });

    it('should accept various model identifiers', async () => {
      const models = ['gpt-4', 'claude-3', 'gemini-pro', 'model_v1.0'];
      
      for (const model of models) {
        await assert.doesNotReject(async () => {
          await statsTracker.recordMessage({
            role: 'assistant',
            content: 'test',
            provider: 'test',
            model,
          });
        });
      }
    });

    it('should handle undefined provider and model', async () => {
      const message = {
        role: 'assistant',
        content: 'test',
        provider: undefined,
        model: undefined,
      };

      await assert.doesNotReject(async () => {
        await statsTracker.recordMessage(message);
      });
    });
  });

  describe('Concurrent operations', () => {
    it('should handle multiple simultaneous recordMessage calls', async () => {
      const messages = Array.from({ length: 10 }, (_, i) => ({
        role: 'assistant' as const,
        content: `Message ${i}`,
        provider: 'test',
        model: 'test-model',
      }));

      const promises = messages.map(msg => statsTracker.recordMessage(msg));

      await assert.doesNotReject(async () => {
        await Promise.all(promises);
      });
    });

    it('should handle rapid sequential calls', async () => {
      for (let i = 0; i < 5; i++) {
        await assert.doesNotReject(async () => {
          await statsTracker.recordMessage({
            role: 'assistant',
            content: `Rapid message ${i}`,
          });
        });
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle message with only whitespace content', async () => {
      const message = {
        role: 'assistant',
        content: '   \n\t\r   ',
      };

      await assert.doesNotReject(async () => {
        await statsTracker.recordMessage(message);
      });
    });

    it('should handle message with null characters', async () => {
      const message = {
        role: 'assistant',
        content: 'test\0message',
      };

      await assert.doesNotReject(async () => {
        await statsTracker.recordMessage(message);
      });
    });

    it('should handle messages with newlines and tabs', async () => {
      const message = {
        role: 'assistant',
        content: 'Line 1\nLine 2\tTabbed',
      };

      await assert.doesNotReject(async () => {
        await statsTracker.recordMessage(message);
      });
    });
  });
});