import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CLIRunner } from '../helpers/test-utils.mjs';

describe('CLI Performance Tests', () => {
  describe('Startup Performance', () => {
    it('should start quickly for help command', async () => {
      const startTime = Date.now();
      
      const result = await CLIRunner.runExpectingSuccess(['--help']);
      
      const duration = Date.now() - startTime;
      
      assert.ok(result.success, 'Help command should succeed');
      assert.ok(duration < 2000, `Help should start quickly, took ${duration}ms`);
    });

    it('should start quickly for version command', async () => {
      const startTime = Date.now();
      
      const result = await CLIRunner.runExpectingSuccess(['--version']);
      
      const duration = Date.now() - startTime;
      
      assert.ok(result.success, 'Version command should succeed');
      assert.ok(duration < 2000, `Version should start quickly, took ${duration}ms`);
    });

    it('should handle invalid arguments quickly', async () => {
      const startTime = Date.now();
      
      const result = await CLIRunner.runExpectingFailure(['--invalid-argument']);
      
      const duration = Date.now() - startTime;
      
      assert.ok(duration < 3000, `Invalid args should fail quickly, took ${duration}ms`);
    });
  });

  describe('Memory Usage', () => {
    it('should not consume excessive memory for help', async () => {
      const beforeMemory = process.memoryUsage().heapUsed;
      
      await CLIRunner.runExpectingSuccess(['--help']);
      
      const afterMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = afterMemory - beforeMemory;
      
      // Memory increase should be reasonable (less than 50MB for help)
      assert.ok(memoryIncrease < 50 * 1024 * 1024, 
        `Memory usage too high: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
    });
  });

  describe('Timeout Handling', () => {
    it('should respect timeout limits', async () => {
      const startTime = Date.now();
      
      try {
        await CLIRunner.run([
          '--mode=doc',
          '--projectA=fake-project-that-will-timeout',
          '--projectB=fake-project-that-will-timeout',
          '--pathA=users/test',
          '--pathB=users/test'
        ], { timeout: 1000 }); // Very short timeout
        
        const duration = Date.now() - startTime;
        assert.ok(duration < 2000, 'Should timeout or fail quickly');
      } catch (error) {
        // Expected to timeout or fail
        const duration = Date.now() - startTime;
        assert.ok(duration < 2000, 'Should timeout quickly');
        assert.ok(error.message.includes('timeout') || error.message.includes('Error'));
      }
    });
  });

  describe('Argument Parsing Performance', () => {
    it('should parse complex arguments quickly', async () => {
      const complexArgs = [
        '--mode=query',
        '--projectA=test-project-a',
        '--projectB=test-project-b',
        '--collectionA=users',
        '--collectionB=users',
        '--whereA=active==true',
        '--whereA=role==admin',
        '--whereA=created>2024-01-01',
        '--whereB=active==true',
        '--whereB=role==admin',
        '--whereB=created>2024-01-01',
        '--fields=name,email,role,department,manager,phone',
        '--ignore-fields=password,sessionToken,internalId,metadata',
        '--key=employeeId',
        '--format=side-by-side',
        '--output-dir=/tmp/test-output',
        '--output-format=yaml',
        '--separate-files',
        '--limit=1000',
        '--stream',
        '--verbose'
      ];
      
      const startTime = Date.now();
      
      const result = await CLIRunner.runExpectingFailure(complexArgs);
      
      const duration = Date.now() - startTime;
      
      // Should fail due to fake project but parse args quickly
      assert.ok(result.code !== 0, 'Should fail due to fake project');
      assert.ok(duration < 5000, `Complex args parsing too slow: ${duration}ms`);
      assert.ok(!result.stderr.includes('Unknown option'), 'All options should be recognized');
    });
  });

  describe('Error Handling Performance', () => {
    it('should fail fast on invalid projects', async () => {
      const startTime = Date.now();
      
      const result = await CLIRunner.runExpectingFailure([
        '--mode=doc',
        '--projectA=invalid-project-12345',
        '--projectB=invalid-project-67890',
        '--pathA=users/test',
        '--pathB=users/test'
      ], { timeout: 8000 });
      
      const duration = Date.now() - startTime;
      
      assert.ok(result.code !== 0, 'Should fail on invalid project');
      assert.ok(duration < 10000, `Should fail within reasonable time: ${duration}ms`);
    });

    it('should handle missing files quickly', async () => {
      const startTime = Date.now();
      
      const result = await CLIRunner.runExpectingFailure([
        '--mode=doc',
        '--projectA=test-project',
        '--projectB=test-project',
        '--pathA=users/test',
        '--pathB=users/test',
        '--saA=/nonexistent/service/account.json',
        '--saB=/nonexistent/service/account.json'
      ]);
      
      const duration = Date.now() - startTime;
      
      assert.ok(result.code !== 0, 'Should fail on missing service account');
      assert.ok(duration < 3000, `File validation should be fast: ${duration}ms`);
    });
  });

  describe('Process Cleanup', () => {
    it('should clean up resources on normal exit', async () => {
      // Test that help exits cleanly
      const result = await CLIRunner.runExpectingSuccess(['--help']);
      
      assert.strictEqual(result.code, 0);
      assert.ok(result.stdout.includes('fsdiff'));
    });

    it('should clean up resources on error exit', async () => {
      // Test that error conditions exit cleanly
      const result = await CLIRunner.runExpectingFailure([
        '--mode=doc',
        '--projectA=invalid'
        // Missing required arguments
      ]);
      
      assert.strictEqual(result.code, 1);
      assert.ok(result.stderr.includes('Error:') || result.stderr.includes('required'));
    });

    it('should handle multiple rapid invocations', async () => {
      const promises = [];
      
      // Launch multiple help commands rapidly
      for (let i = 0; i < 5; i++) {
        promises.push(CLIRunner.runExpectingSuccess(['--version']));
      }
      
      const results = await Promise.all(promises);
      
      // All should succeed
      for (const result of results) {
        assert.strictEqual(result.code, 0);
        assert.ok(result.stdout.includes('1.0.0'));
      }
    });
  });
});