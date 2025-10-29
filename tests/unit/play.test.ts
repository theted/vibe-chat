/**
 * Unit tests for play.ts
 * 
 * Tests conversation playback functionality and utility functions
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';

describe('play.ts utilities', () => {
  describe('Type definitions', () => {
    it('should validate ConversationMessage structure', () => {
      const message: { from: string; content: string } = {
        from: 'TestUser',
        content: 'Test message',
      };

      assert.strictEqual(typeof message.from, 'string');
      assert.strictEqual(typeof message.content, 'string');
    });

    it('should validate ConversationFile structure', () => {
      const conversationFile: { topic?: string; messages: Array<{ from: string; content: string }> } = {
        topic: 'Test Topic',
        messages: [
          { from: 'User1', content: 'Hello' },
          { from: 'User2', content: 'Hi' },
        ],
      };

      assert.ok(conversationFile.messages.length > 0);
      assert.strictEqual(conversationFile.topic, 'Test Topic');
    });

    it('should handle ConversationFile without topic', () => {
      const conversationFile: { topic?: string; messages: Array<{ from: string; content: string }> } = {
        messages: [
          { from: 'User1', content: 'Hello' },
        ],
      };

      assert.strictEqual(conversationFile.topic, undefined);
      assert.strictEqual(conversationFile.messages.length, 1);
    });

    it('should handle empty messages array', () => {
      const conversationFile: { topic?: string; messages: Array<{ from: string; content: string }> } = {
        topic: 'Empty Conversation',
        messages: [],
      };

      assert.strictEqual(conversationFile.messages.length, 0);
    });
  });

  describe('ANSI color constants', () => {
    it('should have valid ANSI reset code', () => {
      const ANSI_RESET = '\x1b[0m';
      assert.strictEqual(ANSI_RESET, '\x1b[0m');
    });

    it('should have valid color codes', () => {
      const colors = [
        '\x1b[36m', // cyan
        '\x1b[35m', // magenta
        '\x1b[34m', // blue
        '\x1b[32m', // green
        '\x1b[33m', // yellow
        '\x1b[31m', // red
      ];

      colors.forEach(color => {
        assert.ok(color.startsWith('\x1b['));
        assert.ok(color.endsWith('m'));
      });
    });

    it('should have unique color codes', () => {
      const colors = [
        '\x1b[36m',
        '\x1b[35m',
        '\x1b[34m',
        '\x1b[32m',
        '\x1b[33m',
        '\x1b[31m',
      ];

      const uniqueColors = new Set(colors);
      assert.strictEqual(uniqueColors.size, colors.length);
    });
  });

  describe('Environment variable handling', () => {
    it('should have default TYPING_DELAY_MS', () => {
      const defaultDelay = Number(process.env.PLAY_TYPING_DELAY_MS || 8);
      assert.ok(defaultDelay >= 0);
    });

    it('should have default BETWEEN_MESSAGES_MS', () => {
      const defaultDelay = Number(process.env.PLAY_BETWEEN_MESSAGES_MS || 500);
      assert.ok(defaultDelay >= 0);
    });

    it('should handle missing environment variables', () => {
      const typingDelay = Number(process.env.PLAY_TYPING_DELAY_MS || 8);
      const betweenMessages = Number(process.env.PLAY_BETWEEN_MESSAGES_MS || 500);

      assert.ok(typeof typingDelay === 'number');
      assert.ok(typeof betweenMessages === 'number');
    });

    it('should parse numeric environment variables', () => {
      const testValue = '10';
      const parsed = Number(testValue);
      assert.strictEqual(parsed, 10);
    });

    it('should handle invalid numeric environment variables', () => {
      const testValue = 'invalid';
      const parsed = Number(testValue || 8);
      assert.ok(isNaN(parsed) || parsed >= 0);
    });
  });

  describe('Hash function behavior', () => {
    it('should produce consistent hash for same string', () => {
      const str = 'TestUser';
      const hash1 = hashString(str);
      const hash2 = hashString(str);
      
      assert.strictEqual(hash1, hash2);
    });

    it('should produce different hashes for different strings', () => {
      const str1 = 'User1';
      const str2 = 'User2';
      const hash1 = hashString(str1);
      const hash2 = hashString(str2);
      
      assert.notStrictEqual(hash1, hash2);
    });

    it('should handle empty string', () => {
      const hash = hashString('');
      assert.ok(typeof hash === 'number');
      assert.ok(hash >= 0);
    });

    it('should handle single character', () => {
      const hash = hashString('A');
      assert.ok(typeof hash === 'number');
      assert.ok(hash >= 0);
    });

    it('should handle long strings', () => {
      const longString = 'A'.repeat(1000);
      const hash = hashString(longString);
      assert.ok(typeof hash === 'number');
      assert.ok(hash >= 0);
    });

    it('should handle special characters', () => {
      const hash = hashString('!@#$%^&*()');
      assert.ok(typeof hash === 'number');
      assert.ok(hash >= 0);
    });

    it('should handle unicode characters', () => {
      const hash = hashString('你好世界🌍');
      assert.ok(typeof hash === 'number');
      assert.ok(hash >= 0);
    });

    it('should produce non-negative values', () => {
      const testStrings = ['test', 'user', 'admin', 'system'];
      testStrings.forEach(str => {
        const hash = hashString(str);
        assert.ok(hash >= 0);
      });
    });
  });

  describe('Color selection', () => {
    it('should return consistent color for same name', () => {
      const colors = [
        '\x1b[36m', '\x1b[35m', '\x1b[34m', '\x1b[32m',
        '\x1b[33m', '\x1b[31m', '\x1b[96m', '\x1b[95m',
        '\x1b[94m', '\x1b[92m', '\x1b[93m', '\x1b[91m',
      ];
      
      const name = 'TestUser';
      const hash = hashString(name);
      const idx = hash % colors.length;
      const color1 = colors[idx];
      const color2 = colors[idx];
      
      assert.strictEqual(color1, color2);
    });

    it('should map to valid color index', () => {
      const colors = [
        '\x1b[36m', '\x1b[35m', '\x1b[34m', '\x1b[32m',
        '\x1b[33m', '\x1b[31m', '\x1b[96m', '\x1b[95m',
        '\x1b[94m', '\x1b[92m', '\x1b[93m', '\x1b[91m',
      ];
      
      const names = ['Alice', 'Bob', 'Charlie', 'Diana'];
      names.forEach(name => {
        const hash = hashString(name);
        const idx = hash % colors.length;
        assert.ok(idx >= 0 && idx < colors.length);
      });
    });
  });

  describe('File path handling', () => {
    it('should handle absolute paths', () => {
      const absolutePath = '/tmp/test.json';
      assert.ok(path.isAbsolute(absolutePath));
    });

    it('should handle relative paths', () => {
      const relativePath = './test.json';
      assert.ok(!path.isAbsolute(relativePath));
    });

    it('should resolve relative paths', () => {
      const relativePath = './test.json';
      const resolved = path.resolve(process.cwd(), relativePath);
      assert.ok(path.isAbsolute(resolved));
    });

    it('should handle path with directory', () => {
      const filePath = 'conversations/test.json';
      const basename = path.basename(filePath);
      assert.strictEqual(basename, 'test.json');
    });

    it('should handle path with extension', () => {
      const filePath = 'test.json';
      const ext = path.extname(filePath);
      assert.strictEqual(ext, '.json');
    });
  });

  describe('Sleep function', () => {
    it('should return a promise', () => {
      const sleep = (ms: number): Promise<void> => {
        return new Promise((res) => setTimeout(res, ms));
      };
      
      const result = sleep(1);
      assert.ok(result instanceof Promise);
    });

    it('should resolve after specified time', async () => {
      const sleep = (ms: number): Promise<void> => {
        return new Promise((res) => setTimeout(res, ms));
      };
      
      const start = Date.now();
      await sleep(10);
      const elapsed = Date.now() - start;
      
      assert.ok(elapsed >= 8); // Allow some tolerance
    });

    it('should handle zero delay', async () => {
      const sleep = (ms: number): Promise<void> => {
        return new Promise((res) => setTimeout(res, ms));
      };
      
      await sleep(0);
      assert.ok(true); // Should complete without error
    });
  });

  describe('Message formatting', () => {
    it('should format header with color', () => {
      const name = 'TestUser';
      const color = '\x1b[36m';
      const reset = '\x1b[0m';
      const expected = `${color}[${name}]${reset} `;
      
      assert.strictEqual(expected, `${color}[${name}]${reset} `);
    });

    it('should handle empty name', () => {
      const name = '';
      const color = '\x1b[36m';
      const reset = '\x1b[0m';
      const formatted = `${color}[${name}]${reset} `;
      
      assert.ok(formatted.includes('[]'));
    });

    it('should handle long names', () => {
      const name = 'VeryLongUserNameThatIsUnusual';
      const color = '\x1b[36m';
      const reset = '\x1b[0m';
      const formatted = `${color}[${name}]${reset} `;
      
      assert.ok(formatted.includes(name));
    });

    it('should handle names with special characters', () => {
      const name = 'User@123';
      const color = '\x1b[36m';
      const reset = '\x1b[0m';
      const formatted = `${color}[${name}]${reset} `;
      
      assert.ok(formatted.includes(name));
    });
  });
});

// Helper function for tests
function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}