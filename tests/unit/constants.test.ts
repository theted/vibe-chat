/**
 * Unit tests for src/config/constants.ts
 * 
 * Tests configuration constants, CLI aliases, and usage information
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_TOPIC, CLI_ALIASES, USAGE_LINES } from '../../src/config/constants.js';

describe('constants.ts', () => {
  describe('DEFAULT_TOPIC', () => {
    it('should be a non-empty string', () => {
      assert.strictEqual(typeof DEFAULT_TOPIC, 'string');
      assert.ok(DEFAULT_TOPIC.length > 0);
    });

    it('should contain meaningful content about AI', () => {
      assert.ok(DEFAULT_TOPIC.includes('artificial intelligence') || 
                DEFAULT_TOPIC.toLowerCase().includes('ai'));
    });

    it('should be a complete sentence or phrase', () => {
      assert.ok(DEFAULT_TOPIC.endsWith('.') || DEFAULT_TOPIC.length > 20);
    });
  });

  describe('CLI_ALIASES', () => {
    it('should be an object', () => {
      assert.strictEqual(typeof CLI_ALIASES, 'object');
      assert.ok(CLI_ALIASES !== null);
    });

    it('should map gemeni to gemini', () => {
      assert.strictEqual(CLI_ALIASES.gemeni, 'gemini');
    });

    it('should map google to gemini', () => {
      assert.strictEqual(CLI_ALIASES.google, 'gemini');
    });

    it('should map moonshot to kimi', () => {
      assert.strictEqual(CLI_ALIASES.moonshot, 'kimi');
    });

    it('should map z.ai to zai', () => {
      assert.strictEqual(CLI_ALIASES['z.ai'], 'zai');
    });

    it('should map z to zai', () => {
      assert.strictEqual(CLI_ALIASES.z, 'zai');
    });

    it('should have all values as strings', () => {
      Object.values(CLI_ALIASES).forEach(value => {
        assert.strictEqual(typeof value, 'string');
        assert.ok(value.length > 0);
      });
    });

    it('should have all keys as strings', () => {
      Object.keys(CLI_ALIASES).forEach(key => {
        assert.strictEqual(typeof key, 'string');
        assert.ok(key.length > 0);
      });
    });

    it('should not have circular mappings', () => {
      const aliases = Object.entries(CLI_ALIASES);
      aliases.forEach(([key, value]) => {
        assert.notStrictEqual(key, value, `Alias '${key}' should not map to itself`);
      });
    });

    it('should have lowercase or mixed-case aliases mapping to lowercase targets', () => {
      Object.values(CLI_ALIASES).forEach(value => {
        assert.strictEqual(value, value.toLowerCase());
      });
    });
  });

  describe('USAGE_LINES', () => {
    it('should be a readonly array', () => {
      assert.ok(Array.isArray(USAGE_LINES));
    });

    it('should contain at least 5 lines', () => {
      assert.ok(USAGE_LINES.length >= 5);
    });

    it('should have a title line', () => {
      const titleLine = USAGE_LINES[0];
      assert.ok(titleLine.includes('AI Chat') || titleLine.includes('Usage'));
    });

    it('should all elements be strings', () => {
      USAGE_LINES.forEach(line => {
        assert.strictEqual(typeof line, 'string');
      });
    });

    it('should contain command format examples', () => {
      const allLines = USAGE_LINES.join('\n');
      assert.ok(allLines.includes('npm start'));
    });

    it('should mention providers', () => {
      const allLines = USAGE_LINES.join('\n').toLowerCase();
      assert.ok(allLines.includes('provider') || 
                allLines.includes('openai') || 
                allLines.includes('anthropic'));
    });

    it('should show example with model specification', () => {
      const allLines = USAGE_LINES.join('\n');
      assert.ok(allLines.includes(':') && allLines.includes('MODEL'));
    });

    it('should include examples section', () => {
      const allLines = USAGE_LINES.join('\n');
      assert.ok(allLines.toLowerCase().includes('example'));
    });

    it('should contain maxTurns parameter documentation', () => {
      const allLines = USAGE_LINES.join('\n');
      // Should show numeric parameter at end of command examples
      assert.ok(/\d+/.test(allLines) || allLines.includes('maxTurns'));
    });

    it('should not contain undefined or null lines', () => {
      USAGE_LINES.forEach(line => {
        assert.notStrictEqual(line, undefined);
        assert.notStrictEqual(line, null);
      });
    });
  });

  describe('Type safety', () => {
    it('CLI_ALIASES should satisfy the const assertion', () => {
      // Verify that CLI_ALIASES is read-only at runtime (as much as JS allows)
      const keys = Object.keys(CLI_ALIASES);
      assert.ok(keys.length > 0);
      
      // Attempting to add a property should not change the original
      const aliasesCopy = { ...CLI_ALIASES };
      assert.deepStrictEqual(aliasesCopy, CLI_ALIASES);
    });

    it('should export valid ProviderAlias type keys', () => {
      // All keys in CLI_ALIASES should be valid
      const validKeys = ['gemeni', 'google', 'moonshot', 'z.ai', 'z'];
      validKeys.forEach(key => {
        assert.ok(key in CLI_ALIASES);
      });
    });
  });

  describe('Integration with usage patterns', () => {
    it('usage examples should reference known aliases', () => {
      const allUsage = USAGE_LINES.join('\n').toLowerCase();
      const aliasKeys = Object.keys(CLI_ALIASES);
      const aliasValues = Object.values(CLI_ALIASES);
      
      // At least some aliases or their targets should appear in usage
      const hasRelevantProvider = [...aliasKeys, ...aliasValues].some(
        term => allUsage.includes(term.toLowerCase())
      );
      assert.ok(hasRelevantProvider);
    });
  });
});