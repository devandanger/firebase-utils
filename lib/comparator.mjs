import { normalizeDocument, normalizeQueryResults, filterFields } from './normalizer.mjs';
import { createDiff } from './differ.mjs';

export async function compareDocuments(clientA, clientB, pathA, pathB, options = {}) {
  const [docA, docB] = await Promise.all([
    clientA.getDocument(pathA),
    clientB.getDocument(pathB)
  ]);

  const normalizedA = normalizeDocument(docA, options);
  const normalizedB = normalizeDocument(docB, options);

  const filteredA = filterFields(normalizedA, options);
  const filteredB = filterFields(normalizedB, options);

  const diff = createDiff(filteredA, filteredB);

  return {
    normalizedA: filteredA,
    normalizedB: filteredB,
    diff,
    hasDifferences: diff.length > 0
  };
}

export async function compareQueries(clientA, clientB, options = {}) {
  const {
    collectionA,
    collectionB,
    whereA = [],
    whereB = [],
    key = 'id',
    fields,
    ignoreFields,
    limit,
    stream = false
  } = options;

  const queryOptions = {
    orderBy: key !== 'id' ? key : undefined,
    limit,
    stream
  };

  const normOptions = {
    fields,
    ignoreFields,
    key
  };

  if (stream) {
    return compareQueriesStream(
      clientA,
      clientB,
      collectionA,
      collectionB,
      whereA,
      whereB,
      queryOptions,
      normOptions
    );
  }

  const [resultsA, resultsB] = await Promise.all([
    clientA.queryCollection(collectionA, whereA, queryOptions),
    clientB.queryCollection(collectionB, whereB, queryOptions)
  ]);

  const normalizedA = normalizeQueryResults(resultsA, normOptions);
  const normalizedB = normalizeQueryResults(resultsB, normOptions);

  const filteredA = normalizedA.map(doc => filterFields(doc, normOptions));
  const filteredB = normalizedB.map(doc => filterFields(doc, normOptions));

  const diff = createQueryDiff(filteredA, filteredB, key);

  return {
    normalizedA: filteredA,
    normalizedB: filteredB,
    diff,
    hasDifferences: diff.added.length > 0 || diff.removed.length > 0 || diff.changed.length > 0
  };
}

async function compareQueriesStream(
  clientA,
  clientB,
  collectionA,
  collectionB,
  whereA,
  whereB,
  queryOptions,
  normOptions
) {
  const docsA = new Map();
  const docsB = new Map();
  
  const streamA = clientA.queryCollection(collectionA, whereA, queryOptions);
  const streamB = clientB.queryCollection(collectionB, whereB, queryOptions);

  const processStream = async (stream, docsMap) => {
    for await (const doc of stream) {
      const normalized = normalizeDocument(doc, normOptions);
      const filtered = filterFields(normalized, normOptions);
      const key = normOptions.key === 'id' ? doc.id : getKeyValue(filtered, normOptions.key);
      docsMap.set(key, filtered);
    }
  };

  await Promise.all([
    processStream(streamA, docsA),
    processStream(streamB, docsB)
  ]);

  const normalizedA = Array.from(docsA.values());
  const normalizedB = Array.from(docsB.values());

  const diff = createQueryDiff(normalizedA, normalizedB, normOptions.key);

  return {
    normalizedA,
    normalizedB,
    diff,
    hasDifferences: diff.added.length > 0 || diff.removed.length > 0 || diff.changed.length > 0
  };
}

function createQueryDiff(docsA, docsB, keyField) {
  const mapA = new Map();
  const mapB = new Map();

  for (const doc of docsA) {
    const key = getKeyValue(doc, keyField);
    mapA.set(key, doc);
  }

  for (const doc of docsB) {
    const key = getKeyValue(doc, keyField);
    mapB.set(key, doc);
  }

  const added = [];
  const removed = [];
  const changed = [];

  for (const [key, docA] of mapA) {
    if (!mapB.has(key)) {
      removed.push({ key, document: docA });
    } else {
      const docB = mapB.get(key);
      const diff = createDiff(docA, docB);
      if (diff.length > 0) {
        changed.push({ key, diff, documentA: docA, documentB: docB });
      }
    }
  }

  for (const [key, docB] of mapB) {
    if (!mapA.has(key)) {
      added.push({ key, document: docB });
    }
  }

  return {
    added: added.sort((a, b) => String(a.key).localeCompare(String(b.key))),
    removed: removed.sort((a, b) => String(a.key).localeCompare(String(b.key))),
    changed: changed.sort((a, b) => String(a.key).localeCompare(String(b.key)))
  };
}

function getKeyValue(doc, keyField) {
  if (keyField === 'id') {
    return doc._id;
  }

  const parts = keyField.split('.');
  let current = doc;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return null;
    }
    current = current[part];
  }

  return current;
}