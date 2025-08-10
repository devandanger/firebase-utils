import { Firestore } from '@google-cloud/firestore';
import { promises as fs } from 'fs';
import path from 'path';
import { homedir } from 'os';

export class FirestoreClient {
  constructor(options) {
    this.projectId = options.projectId;
    this.serviceAccountPath = options.serviceAccountPath;
    this.db = null;
  }

  async initialize() {
    const firestoreOptions = {
      projectId: this.projectId
    };

    if (this.serviceAccountPath) {
      const keyFilename = path.resolve(this.serviceAccountPath);
      await this.validateServiceAccount(keyFilename);
      firestoreOptions.keyFilename = keyFilename;
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const keyFilename = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
      await this.validateServiceAccount(keyFilename);
      firestoreOptions.keyFilename = keyFilename;
    } else {
      const adcPath = path.join(homedir(), '.config', 'gcloud', 'application_default_credentials.json');
      try {
        await fs.access(adcPath);
        firestoreOptions.keyFilename = adcPath;
      } catch {
        // Will attempt to use default credentials
      }
    }

    this.db = new Firestore(firestoreOptions);
    
    try {
      await this.db.listCollections();
    } catch (error) {
      throw new Error(`Failed to connect to Firestore for project ${this.projectId}: ${error.message}`);
    }
  }

  async validateServiceAccount(path) {
    try {
      await fs.access(path);
      const content = await fs.readFile(path, 'utf-8');
      JSON.parse(content);
    } catch (error) {
      throw new Error(`Invalid service account file at ${path}: ${error.message}`);
    }
  }

  async getDocument(documentPath) {
    const doc = await this.db.doc(documentPath).get();
    if (!doc.exists) {
      return null;
    }
    return {
      id: doc.id,
      data: doc.data(),
      metadata: {
        createTime: doc.createTime,
        updateTime: doc.updateTime
      }
    };
  }

  async queryCollection(collectionPath, filters = [], options = {}) {
    let query = this.db.collection(collectionPath);

    for (const filter of filters) {
      const parsed = this.parseFilter(filter);
      if (parsed) {
        query = query.where(parsed.field, parsed.operator, parsed.value);
      }
    }

    if (options.orderBy) {
      query = query.orderBy(options.orderBy);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.stream) {
      return this.streamQuery(query, options);
    }

    const snapshot = await query.get();
    const results = [];
    
    snapshot.forEach(doc => {
      results.push({
        id: doc.id,
        data: doc.data(),
        metadata: {
          createTime: doc.createTime,
          updateTime: doc.updateTime
        }
      });
    });

    return results;
  }

  async *streamQuery(query, options = {}) {
    const stream = query.stream();
    
    for await (const doc of stream) {
      yield {
        id: doc.id,
        data: doc.data(),
        metadata: {
          createTime: doc.createTime,
          updateTime: doc.updateTime
        }
      };
    }
  }

  parseFilter(filterString) {
    const operators = ['==', '!=', '>', '>=', '<', '<=', 'in', 'not-in', 'array-contains', 'array-contains-any'];
    
    for (const op of operators) {
      const parts = filterString.split(op);
      if (parts.length === 2) {
        const field = parts[0].trim();
        let value = parts[1].trim();
        
        value = this.parseFilterValue(value);
        
        return {
          field,
          operator: op,
          value
        };
      }
    }
    
    throw new Error(`Invalid filter format: ${filterString}. Expected format: field==value`);
  }

  parseFilterValue(value) {
    if (value === 'null') return null;
    if (value === 'true') return true;
    if (value === 'false') return false;
    
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    }
    
    const num = Number(value);
    if (!isNaN(num)) {
      return num;
    }
    
    return value;
  }

  close() {
    if (this.db) {
      return this.db.terminate();
    }
  }
}