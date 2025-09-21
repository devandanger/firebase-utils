import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Timestamp, GeoPoint, DocumentReference } from '@google-cloud/firestore';
import { normalizeValue, normalizeDocument, normalizeQueryResults } from '../../lib/normalizer.mjs';
import { sampleDocuments, normalizedSampleData } from '../fixtures/sample-data.mjs';

describe('Normalizer', () => {
  describe('normalizeValue', () => {
    it('should normalize primitive values', () => {
      assert.strictEqual(normalizeValue(null), null);
      assert.strictEqual(normalizeValue(undefined), null);
      assert.strictEqual(normalizeValue('hello'), 'hello');
      assert.strictEqual(normalizeValue(42), 42);
      assert.strictEqual(normalizeValue(true), true);
    });

    it('should normalize Timestamp values', () => {
      const timestamp = Timestamp.fromDate(new Date('2024-01-01T00:00:00Z'));
      const normalized = normalizeValue(timestamp);
      
      assert.strictEqual(normalized._type, 'Timestamp');
      assert.strictEqual(normalized.seconds, timestamp.seconds);
      assert.strictEqual(normalized.nanoseconds, timestamp.nanoseconds);
      assert.strictEqual(normalized.iso, '2024-01-01T00:00:00.000Z');
    });

    it('should normalize GeoPoint values', () => {
      const geoPoint = new GeoPoint(37.7749, -122.4194);
      const normalized = normalizeValue(geoPoint);
      
      assert.strictEqual(normalized._type, 'GeoPoint');
      assert.strictEqual(normalized.latitude, 37.7749);
      assert.strictEqual(normalized.longitude, -122.4194);
    });

    it('should normalize arrays recursively', () => {
      const array = [1, 'test', { nested: true }];
      const normalized = normalizeValue(array);
      
      assert.ok(Array.isArray(normalized));
      assert.strictEqual(normalized[0], 1);
      assert.strictEqual(normalized[1], 'test');
      assert.deepStrictEqual(normalized[2], { nested: true });
    });

    it('should normalize objects recursively and sort keys', () => {
      const obj = { z: 1, a: 2, m: { nested: true } };
      const normalized = normalizeValue(obj);
      
      const keys = Object.keys(normalized);
      assert.deepStrictEqual(keys, ['a', 'm', 'z']); // Should be sorted
      assert.strictEqual(normalized.z, 1);
      assert.strictEqual(normalized.a, 2);
      assert.deepStrictEqual(normalized.m, { nested: true });
    });

    it('should handle field filtering', () => {
      const obj = { field1: 'keep', field2: 'ignore', field3: 'keep' };
      const options = { fields: ['field1', 'field3'] };
      const normalized = normalizeValue(obj, options);
      
      assert.ok('field1' in normalized);
      assert.ok(!('field2' in normalized));
      assert.ok('field3' in normalized);
    });

    it('should handle field ignoring', () => {
      const obj = { field1: 'keep', field2: 'ignore', field3: 'keep' };
      const options = { ignoreFields: ['field2'] };
      const normalized = normalizeValue(obj, options);
      
      assert.ok('field1' in normalized);
      assert.ok(!('field2' in normalized));
      assert.ok('field3' in normalized);
    });
  });

  describe('normalizeDocument', () => {
    it('should normalize a complete document', () => {
      const normalized = normalizeDocument(sampleDocuments.user1);
      
      assert.strictEqual(normalized._id, 'user-001');
      assert.ok(normalized._metadata);
      assert.strictEqual(normalized.name, 'John Doe');
      assert.strictEqual(normalized.email, 'john@example.com');
      assert.strictEqual(normalized.location._type, 'GeoPoint');
    });

    it('should return null for null document', () => {
      const normalized = normalizeDocument(null);
      assert.strictEqual(normalized, null);
    });

    it('should apply field filtering to documents', () => {
      const options = { fields: ['name', 'email'] };
      const normalized = normalizeDocument(sampleDocuments.user1, options);
      
      assert.ok('name' in normalized);
      assert.ok('email' in normalized);
      assert.ok(!('age' in normalized));
      assert.ok(!('role' in normalized));
    });
  });

  describe('normalizeQueryResults', () => {
    it('should normalize array of documents', () => {
      const results = [sampleDocuments.user1, sampleDocuments.user2];
      const normalized = normalizeQueryResults(results);
      
      assert.strictEqual(normalized.length, 2);
      assert.strictEqual(normalized[0]._id, 'user-001');
      assert.strictEqual(normalized[1]._id, 'user-002');
    });

    it('should sort results by _id by default', () => {
      const results = [sampleDocuments.user2, sampleDocuments.user1]; // Reversed order
      const normalized = normalizeQueryResults(results);
      
      assert.strictEqual(normalized[0]._id, 'user-001'); // Should be first after sorting
      assert.strictEqual(normalized[1]._id, 'user-002');
    });

    it('should sort by custom key when specified', () => {
      const results = [
        { id: 'doc1', data: { priority: 3, name: 'Third' } },
        { id: 'doc2', data: { priority: 1, name: 'First' } },
        { id: 'doc3', data: { priority: 2, name: 'Second' } }
      ];
      const options = { key: 'priority' };
      const normalized = normalizeQueryResults(results, options);
      
      assert.strictEqual(normalized[0].name, 'First');  // priority: 1
      assert.strictEqual(normalized[1].name, 'Second'); // priority: 2
      assert.strictEqual(normalized[2].name, 'Third');  // priority: 3
    });

    it('should handle empty results', () => {
      const normalized = normalizeQueryResults([]);
      assert.strictEqual(normalized.length, 0);
    });
  });

  describe('Edge cases', () => {
    it('should handle circular references gracefully', () => {
      const obj = { name: 'test' };
      obj.self = obj; // Create circular reference
      
      // This should not throw, though exact behavior depends on implementation
      assert.doesNotThrow(() => {
        normalizeValue(obj);
      });
    });

    it('should handle very deep nesting', () => {
      let deepObj = { value: 1 };
      for (let i = 0; i < 100; i++) {
        deepObj = { nested: deepObj };
      }
      
      assert.doesNotThrow(() => {
        normalizeValue(deepObj);
      });
    });

    it('should handle special JavaScript values', () => {
      const values = [NaN, Infinity, -Infinity, Symbol('test')];
      
      for (const value of values) {
        assert.doesNotThrow(() => {
          normalizeValue(value);
        });
      }
    });
  });
});