import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatDiff } from '../../lib/formatter.mjs';

describe('Formatter', () => {
  describe('formatDiff', () => {
    it('should format document differences in pretty mode', () => {
      const differences = [
        { type: 'added', path: 'newField', value: 'new value' },
        { type: 'removed', path: 'oldField', value: 'old value' },
        { type: 'changed', path: 'email', oldValue: 'old@example.com', newValue: 'new@example.com' }
      ];
      
      const formatted = formatDiff(differences, 'pretty');
      
      assert.ok(formatted.includes('Document differences found'));
      assert.ok(formatted.includes('newField'));
      assert.ok(formatted.includes('oldField'));
      assert.ok(formatted.includes('email'));
    });

    it('should format query differences in pretty mode', () => {
      const queryDiff = {
        added: [{ key: 'user-2', document: { name: 'Jane' } }],
        removed: [{ key: 'user-1', document: { name: 'John' } }],
        changed: [{ 
          key: 'user-3', 
          diff: [{ type: 'changed', path: 'name', oldValue: 'Bob', newValue: 'Robert' }],
          documentA: { name: 'Bob' },
          documentB: { name: 'Robert' }
        }]
      };
      
      const formatted = formatDiff(queryDiff, 'pretty');
      
      assert.ok(formatted.includes('Query differences found'));
      assert.ok(formatted.includes('Added'));
      assert.ok(formatted.includes('Removed'));
      assert.ok(formatted.includes('Changed'));
    });

    it('should format side-by-side differences', () => {
      const differences = [
        { type: 'changed', path: 'name', oldValue: 'John', newValue: 'Jane' }
      ];
      
      const formatted = formatDiff(differences, 'side-by-side');
      
      assert.ok(formatted.includes('SOURCE A'));
      assert.ok(formatted.includes('SOURCE B'));
      assert.ok(formatted.includes('│')); // Column separator
    });

    it('should format JSON output', () => {
      const differences = [
        { type: 'added', path: 'newField', value: 'value' }
      ];
      
      const formatted = formatDiff(differences, 'json');
      
      assert.strictEqual(typeof formatted, 'object');
      assert.strictEqual(formatted.type, 'document');
      assert.strictEqual(formatted.hasDifferences, true);
      assert.ok(Array.isArray(formatted.differences));
    });

    it('should indicate no differences when arrays are empty', () => {
      const formatted = formatDiff([], 'pretty');
      assert.ok(formatted.includes('identical'));
    });

    it('should handle query diff with no differences', () => {
      const queryDiff = {
        added: [],
        removed: [],
        changed: []
      };
      
      const formatted = formatDiff(queryDiff, 'pretty');
      assert.ok(formatted.includes('identical'));
    });
  });

  describe('Side-by-side formatting', () => {
    it('should handle long values by truncating', () => {
      const longValue = 'x'.repeat(200);
      const differences = [
        { type: 'changed', path: 'description', oldValue: longValue, newValue: 'short' }
      ];
      
      const formatted = formatDiff(differences, 'side-by-side');
      
      // Should contain truncated content
      assert.ok(formatted.includes('...') || formatted.length < longValue.length + 100);
    });

    it('should handle nested objects compactly', () => {
      const complexObject = {
        level1: {
          level2: {
            level3: {
              data: 'deep',
              array: [1, 2, 3, 4, 5]
            }
          }
        }
      };
      
      const differences = [
        { type: 'added', path: 'complex', value: complexObject }
      ];
      
      const formatted = formatDiff(differences, 'side-by-side');
      
      // Should be formatted compactly, not spanning many lines
      const lines = formatted.split('\n');
      assert.ok(lines.length < 20); // Reasonable number of lines
    });
  });

  describe('Special value formatting', () => {
    it('should format Firestore special types', () => {
      const differences = [
        { 
          type: 'added', 
          path: 'timestamp', 
          value: { _type: 'Timestamp', iso: '2024-01-01T00:00:00Z' }
        },
        {
          type: 'added',
          path: 'location',
          value: { _type: 'GeoPoint', latitude: 37.7749, longitude: -122.4194 }
        }
      ];
      
      const formatted = formatDiff(differences, 'pretty');
      
      assert.ok(formatted.includes('Timestamp'));
      assert.ok(formatted.includes('GeoPoint'));
      assert.ok(formatted.includes('2024-01-01T00:00:00Z'));
    });

    it('should format null and undefined values', () => {
      const differences = [
        { type: 'added', path: 'nullField', value: null },
        { type: 'removed', path: 'undefinedField', value: undefined }
      ];
      
      const formatted = formatDiff(differences, 'pretty');
      
      assert.ok(formatted.includes('null'));
    });
  });

  describe('Color handling', () => {
    it('should not crash when colors are used', () => {
      const differences = [
        { type: 'added', path: 'field', value: 'value' }
      ];
      
      // Should not throw even if terminal doesn't support colors
      assert.doesNotThrow(() => {
        formatDiff(differences, 'pretty');
        formatDiff(differences, 'side-by-side');
      });
    });
  });
});