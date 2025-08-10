import { diffJson } from 'diff';

export function createDiff(objA, objB) {
  if (objA === objB) {
    return [];
  }

  if (objA === null || objA === undefined) {
    return [{ type: 'added', path: '', value: objB }];
  }

  if (objB === null || objB === undefined) {
    return [{ type: 'removed', path: '', value: objA }];
  }

  const differences = [];
  compareObjects(objA, objB, '', differences);
  return differences;
}

function compareObjects(objA, objB, path, differences) {
  const keysA = new Set(Object.keys(objA));
  const keysB = new Set(Object.keys(objB));
  const allKeys = new Set([...keysA, ...keysB]);

  for (const key of allKeys) {
    const currentPath = path ? `${path}.${key}` : key;
    const valueA = objA[key];
    const valueB = objB[key];

    if (!keysA.has(key)) {
      differences.push({
        type: 'added',
        path: currentPath,
        value: valueB
      });
    } else if (!keysB.has(key)) {
      differences.push({
        type: 'removed',
        path: currentPath,
        value: valueA
      });
    } else if (!deepEqual(valueA, valueB)) {
      if (isObject(valueA) && isObject(valueB) && !isSpecialType(valueA) && !isSpecialType(valueB)) {
        compareObjects(valueA, valueB, currentPath, differences);
      } else {
        differences.push({
          type: 'changed',
          path: currentPath,
          oldValue: valueA,
          newValue: valueB
        });
      }
    }
  }
}

function deepEqual(a, b) {
  if (a === b) return true;
  
  if (a === null || b === null) return false;
  if (a === undefined || b === undefined) return false;
  if (typeof a !== typeof b) return false;

  if (typeof a !== 'object') return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (Array.isArray(a) || Array.isArray(b)) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isSpecialType(value) {
  return value && value._type && (
    value._type === 'Timestamp' ||
    value._type === 'GeoPoint' ||
    value._type === 'DocumentReference' ||
    value._type === 'Bytes' ||
    value._type === 'Date'
  );
}

export function createDetailedDiff(objA, objB) {
  const jsonDiff = diffJson(objA || {}, objB || {}, {
    ignoreWhitespace: false
  });

  const formatted = [];
  
  for (const part of jsonDiff) {
    if (part.added) {
      formatted.push({
        type: 'added',
        value: part.value
      });
    } else if (part.removed) {
      formatted.push({
        type: 'removed',
        value: part.value
      });
    }
  }

  return formatted;
}