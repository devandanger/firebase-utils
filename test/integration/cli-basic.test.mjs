import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { CLIRunner, TempDirectory, assertOutputContains, assertOutputDoesNotContain } from '../helpers/test-utils.mjs';

describe('CLI Basic Functionality', () => {
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

  describe('Help and Version', () => {
    it('should display help when --help is provided', async () => {
      const result = await CLIRunner.runExpectingSuccess(['--help']);
      
      assertOutputContains(result.stdout, [
        'fsdiff',
        'Compare Firestore data',
        '--mode',
        '--projectA',
        '--projectB'
      ]);
    });

    it('should display version when --version is provided', async () => {
      const result = await CLIRunner.runExpectingSuccess(['--version']);
      
      assertOutputContains(result.stdout, ['1.0.0']);
    });

    it('should display help when no arguments provided', async () => {
      const result = await CLIRunner.runExpectingSuccess([]);
      
      assertOutputContains(result.stdout, [
        'Usage:',
        'fsdiff'
      ]);
    });
  });

  describe('Argument Validation', () => {
    it('should fail when required projectA is missing in doc mode', async () => {
      const result = await CLIRunner.runExpectingFailure([
        '--mode=doc',
        '--pathA=users/test',
        '--pathB=users/test'
      ]);
      
      assertOutputContains(result.stderr, ['projectA', 'required']);
    });

    it('should fail when required projectB is missing in doc mode', async () => {
      const result = await CLIRunner.runExpectingFailure([
        '--mode=doc',
        '--projectA=test-project',
        '--pathA=users/test',
        '--pathB=users/test'
      ]);
      
      assertOutputContains(result.stderr, ['projectB', 'required']);
    });

    it('should fail when pathA is missing in doc mode', async () => {
      const result = await CLIRunner.runExpectingFailure([
        '--mode=doc',
        '--projectA=test-project',
        '--projectB=test-project',
        '--pathB=users/test'
      ]);
      
      assertOutputContains(result.stderr, ['pathA', 'required']);
    });

    it('should fail when pathB is missing in doc mode', async () => {
      const result = await CLIRunner.runExpectingFailure([
        '--mode=doc',
        '--projectA=test-project',
        '--projectB=test-project',
        '--pathA=users/test'
      ]);
      
      assertOutputContains(result.stderr, ['pathB', 'required']);
    });

    it('should fail when collectionA is missing in query mode', async () => {
      const result = await CLIRunner.runExpectingFailure([
        '--mode=query',
        '--projectA=test-project',
        '--projectB=test-project',
        '--collectionB=users'
      ]);
      
      assertOutputContains(result.stderr, ['collectionA', 'required']);
    });

    it('should fail when collectionB is missing in query mode', async () => {
      const result = await CLIRunner.runExpectingFailure([
        '--mode=query',
        '--projectA=test-project',
        '--projectB=test-project',
        '--collectionA=users'
      ]);
      
      assertOutputContains(result.stderr, ['collectionB', 'required']);
    });

    it('should fail with invalid mode', async () => {
      const result = await CLIRunner.runExpectingFailure([
        '--mode=invalid',
        '--projectA=test-project',
        '--projectB=test-project'
      ]);
      
      assertOutputContains(result.stderr, ['Invalid mode', 'invalid']);
    });

    it('should fail with invalid format', async () => {
      const result = await CLIRunner.runExpectingFailure([
        '--mode=doc',
        '--projectA=test-project',
        '--projectB=test-project',
        '--pathA=users/test',
        '--pathB=users/test',
        '--format=invalid'
      ], { timeout: 5000 });
      
      // This might be handled by commander.js validation or our code
      assert.ok(result.code !== 0);
    });
  });

  describe('Output Directory', () => {
    it('should create output directory when --output-dir is specified', async () => {
      const outputPath = tempDir.filePath('output');
      
      // This will fail due to invalid projects, but should create directory
      await CLIRunner.runExpectingFailure([
        '--mode=doc',
        '--projectA=fake-project',
        '--projectB=fake-project',
        '--pathA=users/test',
        '--pathB=users/test',
        `--output-dir=${outputPath}`
      ]);
      
      const exists = await tempDir.exists('output');
      assert.ok(exists, 'Output directory should be created');
    });

    it('should accept different output formats', async () => {
      const result = await CLIRunner.run([
        '--help' // Just test that these options are recognized
      ]);
      
      assertOutputContains(result.stdout, ['--output-format']);
      assertOutputContains(result.stdout, ['--separate-files']);
    });
  });

  describe('Verbose Output', () => {
    it('should show additional output when --verbose is used', async () => {
      const result = await CLIRunner.runExpectingFailure([
        '--mode=doc',
        '--projectA=fake-project',
        '--projectB=fake-project',
        '--pathA=users/test',
        '--pathB=users/test',
        '--verbose'
      ]);
      
      // With verbose, we should see more detailed error information
      assertOutputContains(result.stderr, ['Options:']);
    });
  });

  describe('Filter Options', () => {
    it('should accept multiple where clauses', async () => {
      // Test that multiple --whereA flags are accepted
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
      
      // Should fail due to fake project, but arguments should be parsed correctly
      assertOutputDoesNotContain(result.stderr, ['Unknown option']);
    });

    it('should accept fields option', async () => {
      const result = await CLIRunner.runExpectingFailure([
        '--mode=doc',
        '--projectA=fake-project',
        '--projectB=fake-project',
        '--pathA=users/test',
        '--pathB=users/test',
        '--fields=name,email,role'
      ]);
      
      // Should fail due to fake project, not argument parsing
      assertOutputDoesNotContain(result.stderr, ['Unknown option']);
    });

    it('should accept ignore-fields option', async () => {
      const result = await CLIRunner.runExpectingFailure([
        '--mode=doc',
        '--projectA=fake-project',
        '--projectB=fake-project',
        '--pathA=users/test',
        '--pathB=users/test',
        '--ignore-fields=timestamp,sessionToken'
      ]);
      
      // Should fail due to fake project, not argument parsing  
      assertOutputDoesNotContain(result.stderr, ['Unknown option']);
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      const result = await CLIRunner.runExpectingFailure([
        '--mode=doc',
        '--projectA=nonexistent-project-12345',
        '--projectB=nonexistent-project-12345',
        '--pathA=users/test',
        '--pathB=users/test'
      ]);
      
      assertOutputContains(result.stderr, ['Error:']);
      assert.strictEqual(result.code, 1); // Error exit code
    });

    it('should handle invalid service account paths', async () => {
      const result = await CLIRunner.runExpectingFailure([
        '--mode=doc',
        '--projectA=test-project',
        '--projectB=test-project',
        '--pathA=users/test',
        '--pathB=users/test',
        '--saA=/nonexistent/path.json',
        '--saB=/nonexistent/path.json'
      ]);
      
      assertOutputContains(result.stderr, ['Error:']);
      assert.strictEqual(result.code, 1);
    });

    it('should timeout on hanging operations', async () => {
      const result = await CLIRunner.run([
        '--mode=doc',
        '--projectA=fake-project',
        '--projectB=fake-project',
        '--pathA=users/test',
        '--pathB=users/test'
      ], { timeout: 2000 }); // Short timeout
      
      // Should either fail quickly or timeout
      assert.ok(result.code !== 0 || result.stderr.includes('timeout'));
    });
  });

  describe('Exit Codes', () => {
    it('should exit with 0 for help', async () => {
      const result = await CLIRunner.runExpectingSuccess(['--help']);
      assert.strictEqual(result.code, 0);
    });

    it('should exit with 0 for version', async () => {
      const result = await CLIRunner.runExpectingSuccess(['--version']);
      assert.strictEqual(result.code, 0);
    });

    it('should exit with 1 for errors', async () => {
      const result = await CLIRunner.runExpectingFailure([
        '--mode=doc',
        '--projectA=fake' // Missing required args
      ]);
      assert.strictEqual(result.code, 1);
    });
  });
});