import * as fs from 'fs';
import * as path from 'path';
import { ProjectContext } from '../types.js';

const CONFIG_FILENAME = '.prompt-fmt.json';

export function getProjectConfigPath(): string {
  return path.join(process.cwd(), CONFIG_FILENAME);
}

export function loadProjectContext(): ProjectContext | null {
  const configPath = getProjectConfigPath();

  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as ProjectContext;
  } catch {
    return null;
  }
}

export function saveProjectContext(context: ProjectContext): void {
  const configPath = getProjectConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(context, null, 2) + '\n');
}

export async function detectProjectContext(): Promise<ProjectContext> {
  const cwd = process.cwd();
  const context: ProjectContext = {};

  // Detect language and dependencies from package.json
  const packageJsonPath = path.join(cwd, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };

      // Detect language
      if (allDeps['typescript'] || fs.existsSync(path.join(cwd, 'tsconfig.json'))) {
        context.language = 'typescript';
      } else {
        context.language = 'javascript';
      }

      // Detect framework
      if (allDeps['next']) {
        context.framework = 'next.js';
      } else if (allDeps['@remix-run/react'] || allDeps['remix']) {
        context.framework = 'remix';
      } else if (allDeps['nuxt']) {
        context.framework = 'nuxt';
      } else if (allDeps['vue']) {
        context.framework = 'vue';
      } else if (allDeps['svelte'] || allDeps['@sveltejs/kit']) {
        context.framework = 'svelte';
      } else if (allDeps['react']) {
        context.framework = 'react';
      } else if (allDeps['express']) {
        context.framework = 'express';
      } else if (allDeps['fastify']) {
        context.framework = 'fastify';
      }

      // Detect test runner
      if (allDeps['vitest']) {
        context.testRunner = 'vitest';
      } else if (allDeps['jest']) {
        context.testRunner = 'jest';
      } else if (allDeps['mocha']) {
        context.testRunner = 'mocha';
      } else if (allDeps['ava']) {
        context.testRunner = 'ava';
      }

      // Extract notable dependencies (top 5 by relevance)
      const notableDeps = Object.keys(allDeps)
        .filter(dep => !dep.startsWith('@types/'))
        .filter(dep => !['typescript', 'prettier', 'eslint'].includes(dep))
        .filter(dep => dep !== context.framework && dep !== context.testRunner)
        .slice(0, 5);

      if (notableDeps.length > 0) {
        context.dependencies = notableDeps;
      }
    } catch {
      // Ignore package.json parse errors
    }
  }

  // Check for Python project
  const requirementsPath = path.join(cwd, 'requirements.txt');
  const pyprojectPath = path.join(cwd, 'pyproject.toml');
  if (fs.existsSync(requirementsPath) || fs.existsSync(pyprojectPath)) {
    context.language = 'python';

    if (fs.existsSync(path.join(cwd, 'pytest.ini')) || fs.existsSync(path.join(cwd, 'conftest.py'))) {
      context.testRunner = 'pytest';
    }

    // Detect Python frameworks
    if (fs.existsSync(path.join(cwd, 'manage.py'))) {
      context.framework = 'django';
    } else if (fs.existsSync(requirementsPath)) {
      const reqs = fs.readFileSync(requirementsPath, 'utf-8').toLowerCase();
      if (reqs.includes('fastapi')) {
        context.framework = 'fastapi';
      } else if (reqs.includes('flask')) {
        context.framework = 'flask';
      }
    }
  }

  // Check for Go project
  if (fs.existsSync(path.join(cwd, 'go.mod'))) {
    context.language = 'go';
    context.testRunner = 'go test';
  }

  // Check for Rust project
  if (fs.existsSync(path.join(cwd, 'Cargo.toml'))) {
    context.language = 'rust';
    context.testRunner = 'cargo test';
  }

  // Detect common directory structures
  const directories: ProjectContext['directories'] = {};

  const srcCandidates = ['src', 'lib', 'app'];
  for (const dir of srcCandidates) {
    if (fs.existsSync(path.join(cwd, dir)) && fs.statSync(path.join(cwd, dir)).isDirectory()) {
      directories.source = dir;
      break;
    }
  }

  const testCandidates = ['tests', 'test', '__tests__', 'spec', 'src/__tests__', 'src/test'];
  for (const dir of testCandidates) {
    if (fs.existsSync(path.join(cwd, dir)) && fs.statSync(path.join(cwd, dir)).isDirectory()) {
      directories.tests = dir;
      break;
    }
  }

  const componentCandidates = ['src/components', 'components', 'app/components', 'src/ui'];
  for (const dir of componentCandidates) {
    if (fs.existsSync(path.join(cwd, dir)) && fs.statSync(path.join(cwd, dir)).isDirectory()) {
      directories.components = dir;
      break;
    }
  }

  if (Object.keys(directories).length > 0) {
    context.directories = directories;
  }

  return context;
}

export function formatContextForPrompt(context: ProjectContext): string {
  const lines: string[] = ['Project Context:'];

  if (context.language) {
    lines.push(`- Language: ${context.language}`);
  }

  if (context.framework) {
    lines.push(`- Framework: ${context.framework}`);
  }

  if (context.testRunner) {
    lines.push(`- Test runner: ${context.testRunner}`);
  }

  if (context.directories) {
    const dirs = Object.entries(context.directories)
      .filter(([, v]) => v)
      .map(([k, v]) => `${v}/`)
      .join(', ');
    if (dirs) {
      lines.push(`- Key directories: ${dirs}`);
    }
  }

  if (context.dependencies && context.dependencies.length > 0) {
    lines.push(`- Notable deps: ${context.dependencies.join(', ')}`);
  }

  return lines.join('\n');
}
