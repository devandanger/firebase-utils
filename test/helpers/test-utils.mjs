import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_PATH = path.resolve(__dirname, '../../fsdiff.mjs');

export class CLIRunner {
  static async run(args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn('node', [CLI_PATH, ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...options.env }
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      if (options.stdin) {
        child.stdin.write(options.stdin);
        child.stdin.end();
      }

      const timeoutId = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error('CLI test timed out'));
      }, options.timeout || 10000);

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        resolve({
          code,
          stdout,
          stderr,
          success: code === 0
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  static async runExpectingFailure(args = [], options = {}) {
    const result = await this.run(args, options);
    if (result.success) {
      throw new Error(`Expected CLI to fail but it succeeded. stdout: ${result.stdout}`);
    }
    return result;
  }

  static async runExpectingSuccess(args = [], options = {}) {
    const result = await this.run(args, options);
    if (!result.success) {
      throw new Error(`Expected CLI to succeed but it failed. stderr: ${result.stderr}`);
    }
    return result;
  }
}

export class TempDirectory {
  constructor() {
    this.path = null;
  }

  async create() {
    this.path = await fs.mkdtemp(path.join(process.cwd(), 'temp-test-'));
    return this.path;
  }

  async cleanup() {
    if (this.path) {
      await fs.rm(this.path, { recursive: true, force: true });
      this.path = null;
    }
  }

  filePath(filename) {
    if (!this.path) throw new Error('TempDirectory not created');
    return path.join(this.path, filename);
  }

  async writeFile(filename, content) {
    const filePath = this.filePath(filename);
    await fs.writeFile(filePath, content);
    return filePath;
  }

  async readFile(filename) {
    const filePath = this.filePath(filename);
    return await fs.readFile(filePath, 'utf-8');
  }

  async exists(filename) {
    try {
      await fs.access(this.filePath(filename));
      return true;
    } catch {
      return false;
    }
  }
}

export function createMockFirestoreData() {
  return {
    document: {
      id: 'test-doc-123',
      data: {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        active: true,
        tags: ['user', 'premium'],
        metadata: {
          created: new Date('2024-01-01T00:00:00Z'),
          updated: new Date('2024-01-15T10:30:00Z')
        }
      },
      metadata: {
        createTime: new Date('2024-01-01T00:00:00Z'),
        updateTime: new Date('2024-01-15T10:30:00Z')
      }
    },
    collection: [
      {
        id: 'user-1',
        data: {
          name: 'Alice Smith',
          role: 'admin',
          active: true
        }
      },
      {
        id: 'user-2', 
        data: {
          name: 'Bob Johnson',
          role: 'user',
          active: false
        }
      }
    ]
  };
}

export function normalizeOutput(output) {
  return output
    .replace(/\u001b\[[0-9;]*m/g, '') // Remove ANSI color codes
    .replace(/\r\n/g, '\n') // Normalize line endings
    .trim();
}

export function assertOutputContains(output, expectedStrings) {
  const normalized = normalizeOutput(output);
  for (const expected of expectedStrings) {
    if (!normalized.includes(expected)) {
      throw new Error(`Expected output to contain "${expected}" but got: ${normalized}`);
    }
  }
}

export function assertOutputDoesNotContain(output, unexpectedStrings) {
  const normalized = normalizeOutput(output);
  for (const unexpected of unexpectedStrings) {
    if (normalized.includes(unexpected)) {
      throw new Error(`Expected output to NOT contain "${unexpected}" but got: ${normalized}`);
    }
  }
}