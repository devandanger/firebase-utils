# Testing Guide for fsdiff

This document outlines the testing strategy and how to run tests for the fsdiff CLI tool.

## Test Structure

```
test/
├── unit/                 # Unit tests for individual modules
│   ├── normalizer.test.mjs
│   ├── formatter.test.mjs
│   ├── differ.test.mjs
│   └── firestore-client.test.mjs
├── integration/          # Integration tests for CLI functionality
│   ├── cli-basic.test.mjs
│   ├── cli-output.test.mjs
│   └── performance.test.mjs
├── fixtures/             # Test data and sample documents
│   └── sample-data.mjs
└── helpers/              # Test utilities and helpers
    └── test-utils.mjs
```

## Test Categories

### 1. Unit Tests
Test individual modules in isolation:
- **Normalizer**: Firestore type normalization, field filtering
- **Formatter**: Pretty, side-by-side, and JSON output formatting
- **Differ**: Object comparison and diff generation
- **Firestore Client**: Authentication, query parsing, data fetching

### 2. Integration Tests
Test CLI commands and end-to-end flows:
- **Basic CLI**: Argument validation, help, version, error handling
- **Output**: File generation, format options, field filtering
- **Performance**: Startup time, memory usage, timeout handling

### 3. Mock Tests
Test with mocked Firestore connections:
- Service account validation
- Query building and filtering
- Document retrieval
- Stream processing

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### With Coverage
```bash
npm run test:coverage
```

## Test Utilities

### CLIRunner
Helper class for testing CLI commands:

```javascript
import { CLIRunner } from '../helpers/test-utils.mjs';

// Run CLI command and expect success
const result = await CLIRunner.runExpectingSuccess(['--help']);

// Run CLI command and expect failure  
const result = await CLIRunner.runExpectingFailure(['--invalid-arg']);

// Run with custom options
const result = await CLIRunner.run(['--version'], { 
  timeout: 5000,
  env: { NODE_ENV: 'test' }
});
```

### TempDirectory
Helper for managing temporary test directories:

```javascript
import { TempDirectory } from '../helpers/test-utils.mjs';

const tempDir = new TempDirectory();
await tempDir.create();

// Write test files
await tempDir.writeFile('test.json', '{"test": true}');

// Clean up
await tempDir.cleanup();
```

### Output Assertions
Helpers for validating CLI output:

```javascript
import { assertOutputContains, assertOutputDoesNotContain } from '../helpers/test-utils.mjs';

assertOutputContains(result.stdout, ['Expected text', 'Another expected']);
assertOutputDoesNotContain(result.stderr, ['Unexpected error']);
```

## Test Data

### Sample Documents
Realistic Firestore documents with special types:

```javascript
import { sampleDocuments, normalizedSampleData } from '../fixtures/sample-data.mjs';

// Use in tests
const user = sampleDocuments.user1;
const normalized = normalizedSampleData.user1;
```

### Filter Test Data
Pre-built data for testing query filters:

```javascript
import { filterTestData, errorTestCases } from '../fixtures/sample-data.mjs';

const activeUsers = filterTestData.activeUsers;
const invalidProject = errorTestCases.invalidProjectId;
```

## Best Practices

### 1. Test Naming
Use descriptive test names following the pattern:
```javascript
it('should normalize Timestamp values correctly', () => {
  // Test implementation
});
```

### 2. Test Structure (AAA Pattern)
```javascript
it('should detect added fields', () => {
  // Arrange
  const objA = { name: 'John' };
  const objB = { name: 'John', age: 30 };
  
  // Act
  const diff = createDiff(objA, objB);
  
  // Assert
  assert.strictEqual(diff.length, 1);
  assert.strictEqual(diff[0].type, 'added');
});
```

### 3. Error Testing
Always test error conditions:
```javascript
it('should throw error for invalid filter format', () => {
  assert.throws(
    () => client.parseFilter('invalid-filter'),
    /Invalid filter format/
  );
});
```

### 4. Async Testing
Use proper async/await patterns:
```javascript
it('should handle async operations', async () => {
  const result = await CLIRunner.runExpectingSuccess(['--help']);
  assert.ok(result.success);
});
```

### 5. Resource Cleanup
Always clean up resources in afterEach:
```javascript
afterEach(async () => {
  if (tempDir) {
    await tempDir.cleanup();
  }
  sinon.restore(); // For mocked tests
});
```

## Coverage Goals

- **Lines**: 80% minimum
- **Functions**: 80% minimum  
- **Branches**: 70% minimum
- **Statements**: 80% minimum

## Mocking Strategy

### Firestore Mocking
Use Sinon to mock Firestore operations:
```javascript
const mockFirestore = {
  doc: sinon.stub(),
  collection: sinon.stub(),
  listCollections: sinon.stub().resolves([])
};
```

### File System Mocking
Mock fs operations for service account testing:
```javascript
sinon.stub(fs, 'access').resolves(); // File exists
sinon.stub(fs, 'readFile').resolves('{"valid": "json"}');
```

## Performance Testing

### Startup Performance
Test CLI startup time:
```javascript
const startTime = Date.now();
const result = await CLIRunner.runExpectingSuccess(['--help']);
const duration = Date.now() - startTime;
assert.ok(duration < 2000, 'Should start quickly');
```

### Memory Testing
Monitor memory usage:
```javascript
const beforeMemory = process.memoryUsage().heapUsed;
await CLIRunner.runExpectingSuccess(['--help']);
const afterMemory = process.memoryUsage().heapUsed;
const increase = afterMemory - beforeMemory;
assert.ok(increase < 50 * 1024 * 1024, 'Memory usage reasonable');
```

## Continuous Integration

Tests run automatically on:
- Pull requests
- Pushes to main branch
- Multiple Node.js versions (18, 20, 21)

## Debugging Tests

### Run Single Test
```bash
npm test -- --grep "specific test name"
```

### Enable Verbose Output
```bash
npm test -- --reporter=spec
```

### Debug with Node Inspector
```bash
node --inspect-brk node_modules/.bin/c8 npm test
```