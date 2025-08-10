import { Timestamp, GeoPoint, DocumentReference } from '@google-cloud/firestore';

export function normalizeValue(value, options = {}) {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Timestamp) {
    return {
      _type: 'Timestamp',
      seconds: value.seconds,
      nanoseconds: value.nanoseconds,
      iso: value.toDate().toISOString()
    };
  }

  if (value instanceof GeoPoint) {
    return {
      _type: 'GeoPoint',
      latitude: value.latitude,
      longitude: value.longitude
    };
  }

  if (value instanceof DocumentReference) {
    return {
      _type: 'DocumentReference',
      path: value.path,
      id: value.id
    };
  }

  if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
    return {
      _type: 'Bytes',
      base64: Buffer.from(value).toString('base64'),
      length: value.length
    };
  }

  if (value instanceof Date) {
    return {
      _type: 'Date',
      iso: value.toISOString(),
      timestamp: value.getTime()
    };
  }

  if (Array.isArray(value)) {
    return value.map(item => normalizeValue(item, options));
  }

  if (typeof value === 'object' && value !== null) {
    const normalized = {};
    
    for (const [key, val] of Object.entries(value)) {
      if (options.ignoreFields && options.ignoreFields.includes(key)) {
        continue;
      }
      
      if (options.fields && !options.fields.includes(key)) {
        continue;
      }
      
      normalized[key] = normalizeValue(val, options);
    }
    
    return sortObject(normalized);
  }

  return value;
}

export function normalizeDocument(doc, options = {}) {
  if (!doc) {
    return null;
  }

  const normalized = {
    _id: doc.id,
    _metadata: {
      createTime: doc.metadata?.createTime ? normalizeValue(doc.metadata.createTime) : null,
      updateTime: doc.metadata?.updateTime ? normalizeValue(doc.metadata.updateTime) : null
    }
  };

  if (doc.data) {
    const normalizedData = normalizeValue(doc.data, options);
    Object.assign(normalized, normalizedData);
  }

  return sortObject(normalized);
}

export function normalizeQueryResults(results, options = {}) {
  const normalizedResults = [];
  
  for (const doc of results) {
    const normalized = normalizeDocument(doc, options);
    if (normalized) {
      normalizedResults.push(normalized);
    }
  }

  if (options.key && options.key !== 'id') {
    return normalizedResults.sort((a, b) => {
      const aKey = getNestedValue(a, options.key);
      const bKey = getNestedValue(b, options.key);
      
      if (aKey === bKey) return 0;
      if (aKey === null || aKey === undefined) return 1;
      if (bKey === null || bKey === undefined) return -1;
      
      return aKey < bKey ? -1 : 1;
    });
  }

  return normalizedResults.sort((a, b) => {
    const aId = a._id || '';
    const bId = b._id || '';
    return aId.localeCompare(bId);
  });
}

function sortObject(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObject);
  }

  const sorted = {};
  const keys = Object.keys(obj).sort();

  for (const key of keys) {
    sorted[key] = sortObject(obj[key]);
  }

  return sorted;
}

function getNestedValue(obj, path) {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return null;
    }
    current = current[part];
  }

  return current;
}

export function filterFields(data, options = {}) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => filterFields(item, options));
  }

  const filtered = {};

  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('_')) {
      filtered[key] = value;
      continue;
    }

    if (options.ignoreFields && options.ignoreFields.includes(key)) {
      continue;
    }

    if (options.fields && !options.fields.includes(key)) {
      continue;
    }

    filtered[key] = filterFields(value, options);
  }

  return filtered;
}