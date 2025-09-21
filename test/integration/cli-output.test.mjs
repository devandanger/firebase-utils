import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { CLIRunner, TempDirectory, assertOutputContains, normalizeOutput } from '../helpers/test-utils.mjs';

describe('CLI Output Functionality', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = new TempDirectory();
    await tempDir.create();
  });

  afterEach(async () => {
    if (tempDir) {
      await tempDir.cleanup();
    }
  });

  describe('Output Directory Creation', () => {
    it('should create output directory and files on mock comparison', async () => {
      const outputPath = tempDir.filePath('output');
      
      // This will fail due to fake projects but should create output directory
      await CLIRunner.runExpectingFailure([
        '--mode=doc',
        '--projectA=fake-project-123',
        '--projectB=fake-project-456', 
        '--pathA=users/test1',
        '--pathB=users/test2',
        `--output-dir=${outputPath}`
      ]);
      
      // Verify directory was created
      const exists = await tempDir.exists('output');
      assert.ok(exists, 'Output directory should be created even on failure');
    });

    it('should accept different output formats in arguments', async () => {
      // Test that format options are parsed without error
      const result = await CLIRunner.runExpectingFailure([
        '--mode=doc',
        '--projectA=fake-project',
        '--projectB=fake-project',
        '--pathA=users/test',
        '--pathB=users/test',
        '--output-dir=/tmp/test',
        '--output-format=yaml',
        '--separate-files'
      ]);
      
      // Should fail due to fake project, not argument parsing
      assert.ok(result.stderr.includes('Error:'));
      assert.ok(!result.stderr.includes('Unknown option'));
    });
  });

  describe('Format Options', () => {
    it('should accept pretty format', async () => {
      const result = await CLIRunner.runExpectingFailure([
        '--mode=doc',
        '--projectA=fake-project',
        '--projectB=fake-project', 
        '--pathA=users/test',
        '--pathB=users/test',
        '--format=pretty'
      ]);
      
      // Should fail on connection, not format validation
      assert.ok(!result.stderr.includes('Invalid format'));
    });

    it('should accept side-by-side format', async () => {
      const result = await CLIRunner.runExpectingFailure([
        '--mode=doc',
        '--projectA=fake-project',
        '--projectB=fake-project',
        '--pathA=users/test', 
        '--pathB=users/test',
        '--format=side-by-side'
      ]);
      
      // Should fail on connection, not format validation
      assert.ok(!result.stderr.includes('Invalid format'));
    });

    it('should accept json format', async () => {
      const result = await CLIRunner.runExpectingFailure([
        '--mode=doc',
        '--projectA=fake-project',
        '--projectB=fake-project',
        '--pathA=users/test',
        '--pathB=users/test',
        '--format=json'
      ]);
      
      // Should fail on connection, not format validation
      assert.ok(!result.stderr.includes('Invalid format'));
    });
  });

  describe('Field Filtering', () => {
    it('should accept fields parameter', async () => {
      const result = await CLIRunner.runExpectingFailure([
        '--mode=query',
        '--projectA=fake-project',
        '--projectB=fake-project',
        '--collectionA=users',
        '--collectionB=users',
        '--fields=name,email,role'
      ]);
      
      // Should fail on connection, not parameter parsing
      assert.ok(!result.stderr.includes('Unknown option'));
    });

    it('should accept ignore-fields parameter', async () => {
      const result = await CLIRunner.runExpectingFailure([
        '--mode=query',
        '--projectA=fake-project',
        '--projectB=fake-project',
        '--collectionA=users',
        '--collectionB=users',
        '--ignore-fields=timestamp,metadata'
      ]);
      
      // Should fail on connection, not parameter parsing
      assert.ok(!result.stderr.includes('Unknown option'));
    });

    it('should accept custom key parameter', async () => {
      const result = await CLIRunner.runExpectingFailure([
        '--mode=query',
        '--projectA=fake-project',
        '--projectB=fake-project',
        '--collectionA=orders',
        '--collectionB=orders',
        '--key=orderId'
      ]);
      
      // Should fail on connection, not parameter parsing
      assert.ok(!result.stderr.includes('Unknown option'));
    });
  });

  describe('Query Filters', () => {
    it('should accept single where clause', async () => {
      const result = await CLIRunner.runExpectingFailure([
        '--mode=query',
        '--projectA=fake-project',
        '--projectB=fake-project',
        '--collectionA=users',
        '--collectionB=users',
        '--whereA=active==true',
        '--whereB=active==true'
      ]);
      
      // Should fail on connection, not filter parsing
      assert.ok(!result.stderr.includes('Unknown option'));
    });

    it('should accept multiple where clauses', async () => {
      const result = await CLIRunner.runExpectingFailure([
        '--mode=query',
        '--projectA=fake-project',
        '--projectB=fake-project',
        '--collectionA=users',
        '--collectionB=users',
        '--whereA=active==true',
        '--whereA=role==admin',
        '--whereB=active==true',
        '--whereB=role==admin'
      ]);
      
      // Should fail on connection, not filter parsing
      assert.ok(!result.stderr.includes('Unknown option'));
    });

    it('should accept limit parameter', async () => {
      const result = await CLIRunner.runExpectingFailure([
        '--mode=query',
        '--projectA=fake-project',
        '--projectB=fake-project',
        '--collectionA=users',
        '--collectionB=users',
        '--limit=100'
      ]);
      
      // Should fail on connection, not parameter parsing
      assert.ok(!result.stderr.includes('Unknown option'));
    });

    it('should accept stream parameter', async () => {
      const result = await CLIRunner.runExpectingFailure([
        '--mode=query',
        '--projectA=fake-project', 
        '--projectB=fake-project',
        '--collectionA=users',
        '--collectionB=users',
        '--stream'
      ]);
      
      // Should fail on connection, not parameter parsing
      assert.ok(!result.stderr.includes('Unknown option'));
    });
  });

  describe('Error Message Quality', () => {
    it('should provide clear error for missing required arguments', async () => {
      const result = await CLIRunner.runExpectingFailure([
        '--mode=doc'
        // Missing projectA, projectB, pathA, pathB
      ]);
      
      const output = normalizeOutput(result.stderr);
      assert.ok(output.includes('Error:'));
      assert.ok(output.includes('required') || output.includes('Required'));
    });

    it('should provide helpful error for connection issues', async () => {
      const result = await CLIRunner.runExpectingFailure([
        '--mode=doc',
        '--projectA=definitely-nonexistent-project-12345',
        '--projectB=also-nonexistent-project-67890',
        '--pathA=users/test',
        '--pathB=users/test'
      ], { timeout: 10000 });
      
      const output = normalizeOutput(result.stderr);
      assert.ok(output.includes('Error:'));
      assert.ok(
        output.includes('connect') || 
        output.includes('permission') || 
        output.includes('project') ||
        output.includes('authentication')
      );
    });

    it('should provide clear error for invalid service account', async () => {
      const nonExistentPath = tempDir.filePath('nonexistent-sa.json');
      
      const result = await CLIRunner.runExpectingFailure([
        '--mode=doc',
        '--projectA=test-project',
        '--projectB=test-project',
        '--pathA=users/test',
        '--pathB=users/test',
        `--saA=${nonExistentPath}`,
        `--saB=${nonExistentPath}`
      ]);
      
      const output = normalizeOutput(result.stderr);
      assert.ok(output.includes('Error:'));
      assert.ok(
        output.includes('service account') ||
        output.includes('file') ||
        output.includes('Invalid')
      );
    });
  });

  describe('Spinner and Progress', () => {
    it('should show initialization spinner', async () => {
      const result = await CLIRunner.runExpectingFailure([
        '--mode=doc',
        '--projectA=fake-project',
        '--projectB=fake-project',
        '--pathA=users/test',
        '--pathB=users/test'
      ], { timeout: 5000 });
      
      // The CLI should attempt to show progress, though we can't easily test the spinner
      assert.ok(result.code !== 0); // Should fail but not hang
    });

    it('should handle verbose output flag', async () => {
      const result = await CLIRunner.runExpectingFailure([
        '--mode=doc',
        '--projectA=fake-project',
        '--projectB=fake-project',
        '--pathA=users/test',
        '--pathB=users/test',
        '--verbose'
      ]);
      
      const output = normalizeOutput(result.stderr);
      assert.ok(output.includes('Options:') || output.includes('verbose'));
    });
  });
});