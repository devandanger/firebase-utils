import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import sinon from 'sinon';
import { FirestoreClient } from '../../lib/firestore-client.mjs';
import { promises as fs } from 'fs';

describe('FirestoreClient', () => {
  let firestoreStub;
  let mockFirestore;
  let fsStub;

  beforeEach(() => {
    // Mock Firestore constructor and methods
    mockFirestore = {
      listCollections: sinon.stub().resolves([]),
      doc: sinon.stub(),
      collection: sinon.stub(),
      terminate: sinon.stub().resolves()
    };

    // Mock the Firestore import
    firestoreStub = sinon.stub().returns(mockFirestore);
    
    // Mock fs.access to simulate file existence
    fsStub = sinon.stub(fs, 'access');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('constructor', () => {
    it('should create client with project ID', () => {
      const client = new FirestoreClient({
        projectId: 'test-project'
      });
      
      assert.strictEqual(client.projectId, 'test-project');
      assert.strictEqual(client.db, null);
    });

    it('should store service account path', () => {
      const client = new FirestoreClient({
        projectId: 'test-project',
        serviceAccountPath: '/path/to/sa.json'
      });
      
      assert.strictEqual(client.serviceAccountPath, '/path/to/sa.json');
    });
  });

  describe('validateServiceAccount', () => {
    it('should validate existing service account file', async () => {
      const client = new FirestoreClient({ projectId: 'test' });
      
      fsStub.resolves(); // File exists
      sinon.stub(fs, 'readFile').resolves('{"type": "service_account"}');
      
      await assert.doesNotReject(
        client.validateServiceAccount('/path/to/sa.json')
      );
    });

    it('should reject non-existent service account file', async () => {
      const client = new FirestoreClient({ projectId: 'test' });
      
      fsStub.rejects(new Error('File not found')); // File doesn't exist
      
      await assert.rejects(
        client.validateServiceAccount('/path/to/nonexistent.json'),
        /Invalid service account file/
      );
    });

    it('should reject malformed JSON service account file', async () => {
      const client = new FirestoreClient({ projectId: 'test' });
      
      fsStub.resolves(); // File exists
      sinon.stub(fs, 'readFile').resolves('invalid json');
      
      await assert.rejects(
        client.validateServiceAccount('/path/to/invalid.json'),
        /Invalid service account file/
      );
    });
  });

  describe('getDocument', () => {
    it('should retrieve existing document', async () => {
      const client = new FirestoreClient({ projectId: 'test' });
      client.db = mockFirestore;
      
      const mockDoc = {
        exists: true,
        id: 'doc-123',
        data: () => ({ name: 'John', age: 30 }),
        createTime: new Date('2024-01-01'),
        updateTime: new Date('2024-01-15')
      };
      
      const mockDocRef = {
        get: sinon.stub().resolves(mockDoc)
      };
      
      mockFirestore.doc.returns(mockDocRef);
      
      const result = await client.getDocument('users/doc-123');
      
      assert.strictEqual(result.id, 'doc-123');
      assert.deepStrictEqual(result.data, { name: 'John', age: 30 });
      assert.ok(result.metadata.createTime);
      assert.ok(result.metadata.updateTime);
    });

    it('should return null for non-existent document', async () => {
      const client = new FirestoreClient({ projectId: 'test' });
      client.db = mockFirestore;
      
      const mockDoc = {
        exists: false
      };
      
      const mockDocRef = {
        get: sinon.stub().resolves(mockDoc)
      };
      
      mockFirestore.doc.returns(mockDocRef);
      
      const result = await client.getDocument('users/nonexistent');
      
      assert.strictEqual(result, null);
    });
  });

  describe('parseFilter', () => {
    it('should parse equality filter', () => {
      const client = new FirestoreClient({ projectId: 'test' });
      
      const filter = client.parseFilter('name==John');
      
      assert.strictEqual(filter.field, 'name');
      assert.strictEqual(filter.operator, '==');
      assert.strictEqual(filter.value, 'John');
    });

    it('should parse numeric filter', () => {
      const client = new FirestoreClient({ projectId: 'test' });
      
      const filter = client.parseFilter('age>25');
      
      assert.strictEqual(filter.field, 'age');
      assert.strictEqual(filter.operator, '>');
      assert.strictEqual(filter.value, 25);
    });

    it('should parse boolean filter', () => {
      const client = new FirestoreClient({ projectId: 'test' });
      
      const filter = client.parseFilter('active==true');
      
      assert.strictEqual(filter.field, 'active');
      assert.strictEqual(filter.operator, '==');
      assert.strictEqual(filter.value, true);
    });

    it('should parse null filter', () => {
      const client = new FirestoreClient({ projectId: 'test' });
      
      const filter = client.parseFilter('deleted==null');
      
      assert.strictEqual(filter.field, 'deleted');
      assert.strictEqual(filter.operator, '==');
      assert.strictEqual(filter.value, null);
    });

    it('should parse array filter', () => {
      const client = new FirestoreClient({ projectId: 'test' });
      
      const filter = client.parseFilter('tags==["premium","verified"]');
      
      assert.strictEqual(filter.field, 'tags');
      assert.strictEqual(filter.operator, '==');
      assert.deepStrictEqual(filter.value, ['premium', 'verified']);
    });

    it('should parse quoted string filter', () => {
      const client = new FirestoreClient({ projectId: 'test' });
      
      const filter = client.parseFilter('name=="John Doe"');
      
      assert.strictEqual(filter.field, 'name');
      assert.strictEqual(filter.operator, '==');
      assert.strictEqual(filter.value, 'John Doe');
    });

    it('should throw error for invalid filter format', () => {
      const client = new FirestoreClient({ projectId: 'test' });
      
      assert.throws(
        () => client.parseFilter('invalid-filter'),
        /Invalid filter format/
      );
    });
  });

  describe('parseFilterValue', () => {
    it('should parse different value types correctly', () => {
      const client = new FirestoreClient({ projectId: 'test' });
      
      assert.strictEqual(client.parseFilterValue('null'), null);
      assert.strictEqual(client.parseFilterValue('true'), true);
      assert.strictEqual(client.parseFilterValue('false'), false);
      assert.strictEqual(client.parseFilterValue('42'), 42);
      assert.strictEqual(client.parseFilterValue('3.14'), 3.14);
      assert.strictEqual(client.parseFilterValue('"quoted string"'), 'quoted string');
      assert.strictEqual(client.parseFilterValue('unquoted'), 'unquoted');
      assert.deepStrictEqual(client.parseFilterValue('[1,2,3]'), [1, 2, 3]);
    });

    it('should handle malformed JSON gracefully', () => {
      const client = new FirestoreClient({ projectId: 'test' });
      
      // Malformed array should be treated as string
      assert.strictEqual(client.parseFilterValue('[invalid json'), '[invalid json');
    });
  });

  describe('queryCollection', () => {
    it('should build query with filters', async () => {
      const client = new FirestoreClient({ projectId: 'test' });
      client.db = mockFirestore;
      
      const mockQuery = {
        where: sinon.stub().returnsThis(),
        orderBy: sinon.stub().returnsThis(),
        limit: sinon.stub().returnsThis(),
        get: sinon.stub().resolves({
          forEach: sinon.stub().callsArg(0)
        })
      };
      
      mockFirestore.collection.returns(mockQuery);
      
      const filters = ['active==true', 'age>25'];
      const options = { orderBy: 'name', limit: 10 };
      
      await client.queryCollection('users', filters, options);
      
      assert.ok(mockFirestore.collection.calledWith('users'));
      assert.ok(mockQuery.where.calledTwice);
      assert.ok(mockQuery.orderBy.calledWith('name'));
      assert.ok(mockQuery.limit.calledWith(10));
    });

    it('should return documents from query results', async () => {
      const client = new FirestoreClient({ projectId: 'test' });
      client.db = mockFirestore;
      
      const mockDocs = [
        {
          id: 'doc1',
          data: () => ({ name: 'John' }),
          createTime: new Date(),
          updateTime: new Date()
        },
        {
          id: 'doc2',
          data: () => ({ name: 'Jane' }),
          createTime: new Date(),
          updateTime: new Date()
        }
      ];
      
      const mockQuery = {
        get: sinon.stub().resolves({
          forEach: (callback) => mockDocs.forEach(callback)
        })
      };
      
      mockFirestore.collection.returns(mockQuery);
      
      const results = await client.queryCollection('users');
      
      assert.strictEqual(results.length, 2);
      assert.strictEqual(results[0].id, 'doc1');
      assert.strictEqual(results[1].id, 'doc2');
      assert.deepStrictEqual(results[0].data, { name: 'John' });
      assert.deepStrictEqual(results[1].data, { name: 'Jane' });
    });
  });

  describe('streamQuery', () => {
    it('should return async generator for streaming', async () => {
      const client = new FirestoreClient({ projectId: 'test' });
      
      const mockQuery = {
        stream: sinon.stub().returns({
          [Symbol.asyncIterator]: async function* () {
            yield {
              id: 'doc1',
              data: () => ({ name: 'John' }),
              createTime: new Date(),
              updateTime: new Date()
            };
            yield {
              id: 'doc2',
              data: () => ({ name: 'Jane' }),
              createTime: new Date(),
              updateTime: new Date()
            };
          }
        })
      };
      
      const generator = client.streamQuery(mockQuery);
      const results = [];
      
      for await (const doc of generator) {
        results.push(doc);
      }
      
      assert.strictEqual(results.length, 2);
      assert.strictEqual(results[0].id, 'doc1');
      assert.strictEqual(results[1].id, 'doc2');
    });
  });

  describe('close', () => {
    it('should terminate Firestore connection', async () => {
      const client = new FirestoreClient({ projectId: 'test' });
      client.db = mockFirestore;
      
      await client.close();
      
      assert.ok(mockFirestore.terminate.called);
    });

    it('should handle missing db gracefully', async () => {
      const client = new FirestoreClient({ projectId: 'test' });
      
      await assert.doesNotReject(client.close());
    });
  });
});