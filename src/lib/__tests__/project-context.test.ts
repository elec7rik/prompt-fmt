import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  detectProjectContext,
  formatContextForPrompt,
  loadProjectContext,
  saveProjectContext,
  getProjectConfigPath,
} from '../project-context.js';
import type { ProjectContext } from '../../types.js';

describe('project-context', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    // Create a temporary directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-fmt-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(() => {
    // Restore original cwd and clean up
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('detectProjectContext', () => {
    it('detects TypeScript project with package.json', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          dependencies: {},
          devDependencies: { typescript: '^5.0.0' },
        })
      );

      const context = await detectProjectContext();
      expect(context.language).toBe('typescript');
    });

    it('detects TypeScript via tsconfig.json', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ dependencies: {} })
      );
      fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');

      const context = await detectProjectContext();
      expect(context.language).toBe('typescript');
    });

    it('detects JavaScript when no TypeScript', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ dependencies: { lodash: '4.0.0' } })
      );

      const context = await detectProjectContext();
      expect(context.language).toBe('javascript');
    });

    it('detects React framework', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ dependencies: { react: '^18.0.0' } })
      );

      const context = await detectProjectContext();
      expect(context.framework).toBe('react');
    });

    it('detects Next.js framework (takes priority over React)', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          dependencies: { react: '^18.0.0', next: '^14.0.0' },
        })
      );

      const context = await detectProjectContext();
      expect(context.framework).toBe('next.js');
    });

    it('detects vitest test runner', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ devDependencies: { vitest: '^1.0.0' } })
      );

      const context = await detectProjectContext();
      expect(context.testRunner).toBe('vitest');
    });

    it('detects jest test runner', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ devDependencies: { jest: '^29.0.0' } })
      );

      const context = await detectProjectContext();
      expect(context.testRunner).toBe('jest');
    });

    it('detects Python project via requirements.txt', async () => {
      fs.writeFileSync(path.join(tempDir, 'requirements.txt'), 'flask==2.0.0');

      const context = await detectProjectContext();
      expect(context.language).toBe('python');
      expect(context.framework).toBe('flask');
    });

    it('detects Python FastAPI project', async () => {
      fs.writeFileSync(path.join(tempDir, 'requirements.txt'), 'fastapi==0.100.0\nuvicorn');

      const context = await detectProjectContext();
      expect(context.language).toBe('python');
      expect(context.framework).toBe('fastapi');
    });

    it('detects pytest via config files', async () => {
      fs.writeFileSync(path.join(tempDir, 'requirements.txt'), 'pytest');
      fs.writeFileSync(path.join(tempDir, 'pytest.ini'), '');

      const context = await detectProjectContext();
      expect(context.testRunner).toBe('pytest');
    });

    it('detects Go project', async () => {
      fs.writeFileSync(path.join(tempDir, 'go.mod'), 'module example.com/test');

      const context = await detectProjectContext();
      expect(context.language).toBe('go');
      expect(context.testRunner).toBe('go test');
    });

    it('detects Rust project', async () => {
      fs.writeFileSync(path.join(tempDir, 'Cargo.toml'), '[package]\nname = "test"');

      const context = await detectProjectContext();
      expect(context.language).toBe('rust');
      expect(context.testRunner).toBe('cargo test');
    });

    it('detects src directory', async () => {
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');
      fs.mkdirSync(path.join(tempDir, 'src'));

      const context = await detectProjectContext();
      expect(context.directories?.source).toBe('src');
    });

    it('detects tests directory', async () => {
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');
      fs.mkdirSync(path.join(tempDir, 'tests'));

      const context = await detectProjectContext();
      expect(context.directories?.tests).toBe('tests');
    });

    it('detects __tests__ directory', async () => {
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');
      fs.mkdirSync(path.join(tempDir, '__tests__'));

      const context = await detectProjectContext();
      expect(context.directories?.tests).toBe('__tests__');
    });

    it('extracts notable dependencies', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          dependencies: {
            lodash: '4.0.0',
            axios: '1.0.0',
            zod: '3.0.0',
          },
        })
      );

      const context = await detectProjectContext();
      expect(context.dependencies).toContain('lodash');
      expect(context.dependencies).toContain('axios');
      expect(context.dependencies).toContain('zod');
    });

    it('filters out @types packages from dependencies', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          dependencies: { lodash: '4.0.0' },
          devDependencies: { '@types/lodash': '4.0.0', '@types/node': '20.0.0' },
        })
      );

      const context = await detectProjectContext();
      expect(context.dependencies).not.toContain('@types/lodash');
      expect(context.dependencies).not.toContain('@types/node');
    });

    it('returns empty context for empty directory', async () => {
      const context = await detectProjectContext();
      expect(context).toEqual({});
    });
  });

  describe('formatContextForPrompt', () => {
    it('formats full context', () => {
      const context: ProjectContext = {
        language: 'typescript',
        framework: 'react',
        testRunner: 'vitest',
        directories: { source: 'src', tests: 'tests' },
        dependencies: ['lodash', 'axios'],
      };

      const result = formatContextForPrompt(context);

      expect(result).toContain('Project Context:');
      expect(result).toContain('Language: typescript');
      expect(result).toContain('Framework: react');
      expect(result).toContain('Test runner: vitest');
      expect(result).toContain('Key directories:');
      expect(result).toContain('Notable deps: lodash, axios');
    });

    it('handles partial context', () => {
      const context: ProjectContext = {
        language: 'python',
      };

      const result = formatContextForPrompt(context);

      expect(result).toContain('Language: python');
      expect(result).not.toContain('Framework:');
      expect(result).not.toContain('Test runner:');
    });

    it('handles empty context', () => {
      const context: ProjectContext = {};
      const result = formatContextForPrompt(context);
      expect(result).toBe('Project Context:');
    });
  });

  describe('loadProjectContext / saveProjectContext', () => {
    it('returns null when no config file exists', () => {
      const result = loadProjectContext();
      expect(result).toBeNull();
    });

    it('saves and loads context correctly', () => {
      const context: ProjectContext = {
        language: 'typescript',
        framework: 'react',
      };

      saveProjectContext(context);
      const loaded = loadProjectContext();

      expect(loaded).toEqual(context);
    });

    it('returns null for invalid JSON', () => {
      fs.writeFileSync(path.join(tempDir, '.prompt-fmt.json'), 'invalid json');
      const result = loadProjectContext();
      expect(result).toBeNull();
    });
  });

  describe('getProjectConfigPath', () => {
    it('returns path in current directory', () => {
      const result = getProjectConfigPath();
      // Use realpath to handle macOS /private/var symlink
      const expectedPath = path.join(fs.realpathSync(tempDir), '.prompt-fmt.json');
      expect(result).toBe(expectedPath);
    });
  });
});
