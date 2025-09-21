import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createDiff } from '../../lib/differ.mjs';

describe('Differ', () => {
  describe('createDiff', () => {
    it('should return empty array for identical objects', () => {
      const objA = { name: 'John', age: 30 };
      const objB = { name: 'John', age: 30 };
      
      const diff = createDiff(objA, objB);
      assert.strictEqual(diff.length, 0);
    });

    it('should detect added fields', () => {
      const objA = { name: 'John' };
      const objB = { name: 'John', age: 30 };
      
      const diff = createDiff(objA, objB);
      assert.strictEqual(diff.length, 1);
      assert.strictEqual(diff[0].type, 'added');
      assert.strictEqual(diff[0].path, 'age');
      assert.strictEqual(diff[0].value, 30);
    });

    it('should detect removed fields', () => {
      const objA = { name: 'John', age: 30 };
      const objB = { name: 'John' };
      
      const diff = createDiff(objA, objB);
      assert.strictEqual(diff.length, 1);
      assert.strictEqual(diff[0].type, 'removed');
      assert.strictEqual(diff[0].path, 'age');
      assert.strictEqual(diff[0].value, 30);
    });

    it('should detect changed fields', () => {
      const objA = { name: 'John', age: 30 };
      const objB = { name: 'John', age: 31 };
      
      const diff = createDiff(objA, objB);
      assert.strictEqual(diff.length, 1);
      assert.strictEqual(diff[0].type, 'changed');
      assert.strictEqual(diff[0].path, 'age');
      assert.strictEqual(diff[0].oldValue, 30);
      assert.strictEqual(diff[0].newValue, 31);
    });

    it('should handle nested object differences', () => {
      const objA = {
        user: {
          name: 'John',
          profile: { age: 30 }
        }
      };
      const objB = {
        user: {
          name: 'John',
          profile: { age: 31 }
        }
      };
      
      const diff = createDiff(objA, objB);
      assert.strictEqual(diff.length, 1);
      assert.strictEqual(diff[0].type, 'changed');
      assert.strictEqual(diff[0].path, 'user.profile.age');
      assert.strictEqual(diff[0].oldValue, 30);
      assert.strictEqual(diff[0].newValue, 31);
    });

    it('should handle array differences', () => {
      const objA = { tags: ['tag1', 'tag2'] };
      const objB = { tags: ['tag1', 'tag3'] };
      
      const diff = createDiff(objA, objB);
      assert.strictEqual(diff.length, 1);
      assert.strictEqual(diff[0].type, 'changed');
      assert.strictEqual(diff[0].path, 'tags');
    });

    it('should handle null and undefined values', () => {
      const objA = { field: null };
      const objB = { field: undefined };
      
      const diff = createDiff(objA, objB);
      assert.strictEqual(diff.length, 1);
      assert.strictEqual(diff[0].type, 'changed');
    });

    it('should handle special Firestore types', () => {
      const objA = {
        timestamp: { _type: 'Timestamp', seconds: 1000, nanoseconds: 0 }
      };
      const objB = {
        timestamp: { _type: 'Timestamp', seconds: 2000, nanoseconds: 0 }
      };
      
      const diff = createDiff(objA, objB);
      assert.strictEqual(diff.length, 1);
      assert.strictEqual(diff[0].type, 'changed');
      assert.strictEqual(diff[0].path, 'timestamp');
    });

    it('should handle complex nested changes', () => {
      const objA = {
        user: {
          name: 'John',
          contacts: {
            email: 'john@old.com',
            phone: '123-456-7890'
          },
          tags: ['user']
        }
      };
      
      const objB = {
        user: {
          name: 'John Doe', // Changed
          contacts: {
            email: 'john@old.com',
            // phone removed
            address: 'New Address' // Added
          },
          tags: ['user', 'premium'] // Added item
        }
      };
      
      const diff = createDiff(objA, objB);
      
      // Should detect multiple changes
      assert.ok(diff.length > 0);
      
      const paths = diff.map(d => d.path);
      assert.ok(paths.includes('user.name'));
      assert.ok(paths.includes('user.contacts.phone'));
      assert.ok(paths.includes('user.contacts.address'));
      assert.ok(paths.includes('user.tags'));
    });

    it('should handle empty objects', () => {
      const objA = {};
      const objB = { field: 'value' };
      
      const diff = createDiff(objA, objB);
      assert.strictEqual(diff.length, 1);
      assert.strictEqual(diff[0].type, 'added');
    });

    it('should handle comparing object to null', () => {
      const objA = { field: 'value' };
      const objB = null;
      
      const diff = createDiff(objA, objB);
      assert.strictEqual(diff.length, 1);
      assert.strictEqual(diff[0].type, 'removed');
      assert.strictEqual(diff[0].path, '');
    });

    it('should handle comparing null to object', () => {
      const objA = null;
      const objB = { field: 'value' };
      
      const diff = createDiff(objA, objB);
      assert.strictEqual(diff.length, 1);
      assert.strictEqual(diff[0].type, 'added');
      assert.strictEqual(diff[0].path, '');
    });
  });

  describe('Edge cases', () => {
    it('should handle very large objects efficiently', () => {
      const createLargeObject = (size) => {
        const obj = {};
        for (let i = 0; i < size; i++) {
          obj[`field${i}`] = `value${i}`;
        }
        return obj;
      };
      
      const objA = createLargeObject(1000);
      const objB = { ...objA, changed: 'value' };
      
      const start = Date.now();
      const diff = createDiff(objA, objB);
      const duration = Date.now() - start;
      
      assert.strictEqual(diff.length, 1);
      assert.ok(duration < 1000, `Diff took too long: ${duration}ms`); // Should be fast
    });

    it('should handle circular references without infinite loops', () => {
      const objA = { name: 'test' };
      objA.self = objA;
      
      const objB = { name: 'test' };
      objB.self = objB;
      
      // Should not hang or throw
      assert.doesNotThrow(() => {
        const diff = createDiff(objA, objB);
        assert.ok(Array.isArray(diff));
      });
    });

    it('should handle functions and symbols gracefully', () => {
      const objA = {
        func: () => 'test',
        symbol: Symbol('test'),
        normal: 'value'
      };
      
      const objB = {
        func: () => 'different',
        symbol: Symbol('test'),
        normal: 'changed'
      };
      
      assert.doesNotThrow(() => {
        const diff = createDiff(objA, objB);
        assert.ok(Array.isArray(diff));
      });
    });
  });
});