import * as fs from 'fs';
import * as path from 'path';
import { ProjectContext } from '../types.js';

const CONFIG_FILENAME = '.prompt-formatter.json';

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

// Helper to check if any file matching a glob pattern exists
function findFileWithExtension(dir: string, extensions: string[]): boolean {
  try {
    const files = fs.readdirSync(dir);
    return files.some(file => extensions.some(ext => file.endsWith(ext)));
  } catch {
    return false;
  }
}

export async function detectProjectContext(): Promise<ProjectContext> {
  const cwd = process.cwd();
  const context: ProjectContext = {};

  // ============================================
  // JavaScript / TypeScript (package.json)
  // ============================================
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

      // Detect framework (order matters - more specific first)
      if (allDeps['next']) {
        context.framework = 'next.js';
      } else if (allDeps['@remix-run/react'] || allDeps['remix']) {
        context.framework = 'remix';
      } else if (allDeps['gatsby']) {
        context.framework = 'gatsby';
      } else if (allDeps['nuxt']) {
        context.framework = 'nuxt';
      } else if (allDeps['@angular/core']) {
        context.framework = 'angular';
      } else if (allDeps['vue']) {
        context.framework = 'vue';
      } else if (allDeps['svelte'] || allDeps['@sveltejs/kit']) {
        context.framework = 'svelte';
      } else if (allDeps['solid-js']) {
        context.framework = 'solid';
      } else if (allDeps['react-native']) {
        context.framework = 'react-native';
      } else if (allDeps['expo']) {
        context.framework = 'expo';
      } else if (allDeps['electron']) {
        context.framework = 'electron';
      } else if (allDeps['react']) {
        context.framework = 'react';
      } else if (allDeps['nestjs'] || allDeps['@nestjs/core']) {
        context.framework = 'nestjs';
      } else if (allDeps['hono']) {
        context.framework = 'hono';
      } else if (allDeps['express']) {
        context.framework = 'express';
      } else if (allDeps['fastify']) {
        context.framework = 'fastify';
      } else if (allDeps['koa']) {
        context.framework = 'koa';
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
      } else if (allDeps['jasmine']) {
        context.testRunner = 'jasmine';
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

  // ============================================
  // Swift / iOS / macOS
  // ============================================
  const packageSwiftPath = path.join(cwd, 'Package.swift');
  const hasXcodeProj = findFileWithExtension(cwd, ['.xcodeproj', '.xcworkspace']);
  const podfilePath = path.join(cwd, 'Podfile');
  const cartfilePath = path.join(cwd, 'Cartfile');

  if (fs.existsSync(packageSwiftPath) || hasXcodeProj) {
    context.language = 'swift';
    context.testRunner = 'xctest';

    // Detect iOS/macOS frameworks from Package.swift or project files
    if (fs.existsSync(packageSwiftPath)) {
      const packageSwift = fs.readFileSync(packageSwiftPath, 'utf-8');

      if (packageSwift.includes('SwiftUI')) {
        context.framework = 'swiftui';
      } else if (packageSwift.includes('Vapor')) {
        context.framework = 'vapor';
      }

      // Extract dependencies from Package.swift
      const depMatches = packageSwift.match(/\.package\([^)]*url:\s*"[^"]*\/([^"\/]+)(?:\.git)?"/g);
      if (depMatches) {
        context.dependencies = depMatches
          .map(m => {
            const match = m.match(/\/([^"\/]+)(?:\.git)?"/);
            return match ? match[1] : null;
          })
          .filter((d): d is string => d !== null)
          .slice(0, 5);
      }
    }

    // Check Podfile for CocoaPods dependencies
    if (fs.existsSync(podfilePath)) {
      const podfile = fs.readFileSync(podfilePath, 'utf-8').toLowerCase();

      if (!context.framework) {
        if (podfile.includes('rxswift')) {
          context.framework = 'rxswift';
        }
      }

      // Extract pod dependencies
      const podMatches = podfile.match(/pod\s+['"]([^'"]+)['"]/g);
      if (podMatches && !context.dependencies) {
        context.dependencies = podMatches
          .map(m => {
            const match = m.match(/pod\s+['"]([^'"]+)['"]/);
            return match ? match[1] : null;
          })
          .filter((d): d is string => d !== null)
          .slice(0, 5);
      }
    }
  }

  // ============================================
  // Java (Maven / Gradle)
  // ============================================
  const pomPath = path.join(cwd, 'pom.xml');
  const gradlePath = path.join(cwd, 'build.gradle');
  const gradleKtsPath = path.join(cwd, 'build.gradle.kts');

  if (fs.existsSync(pomPath)) {
    context.language = 'java';
    context.testRunner = 'junit';

    const pom = fs.readFileSync(pomPath, 'utf-8').toLowerCase();
    if (pom.includes('spring-boot')) {
      context.framework = 'spring-boot';
    } else if (pom.includes('spring')) {
      context.framework = 'spring';
    } else if (pom.includes('quarkus')) {
      context.framework = 'quarkus';
    } else if (pom.includes('micronaut')) {
      context.framework = 'micronaut';
    }
  } else if (fs.existsSync(gradlePath) || fs.existsSync(gradleKtsPath)) {
    const gradleFile = fs.existsSync(gradleKtsPath) ? gradleKtsPath : gradlePath;
    const gradle = fs.readFileSync(gradleFile, 'utf-8').toLowerCase();

    // Check if it's Android or regular Java/Kotlin
    if (gradle.includes('com.android') || gradle.includes('android {')) {
      context.language = 'kotlin';
      context.framework = 'android';
      context.testRunner = 'android-test';
    } else if (fs.existsSync(gradleKtsPath) || gradle.includes('kotlin')) {
      context.language = 'kotlin';
      context.testRunner = 'junit';

      if (gradle.includes('ktor')) {
        context.framework = 'ktor';
      } else if (gradle.includes('spring-boot')) {
        context.framework = 'spring-boot';
      }
    } else {
      context.language = 'java';
      context.testRunner = 'junit';

      if (gradle.includes('spring-boot')) {
        context.framework = 'spring-boot';
      } else if (gradle.includes('spring')) {
        context.framework = 'spring';
      }
    }
  }

  // ============================================
  // C# / .NET
  // ============================================
  const hasCsproj = findFileWithExtension(cwd, ['.csproj']);
  const slnPath = findFileWithExtension(cwd, ['.sln']);

  if (hasCsproj || slnPath) {
    context.language = 'csharp';
    context.testRunner = 'xunit';

    // Try to detect framework from csproj
    try {
      const files = fs.readdirSync(cwd);
      const csprojFile = files.find(f => f.endsWith('.csproj'));
      if (csprojFile) {
        const csproj = fs.readFileSync(path.join(cwd, csprojFile), 'utf-8').toLowerCase();

        if (csproj.includes('microsoft.aspnetcore') || csproj.includes('web.sdk')) {
          context.framework = 'asp.net-core';
        } else if (csproj.includes('maui')) {
          context.framework = 'maui';
        } else if (csproj.includes('xamarin')) {
          context.framework = 'xamarin';
        } else if (csproj.includes('wpf')) {
          context.framework = 'wpf';
        } else if (csproj.includes('blazor')) {
          context.framework = 'blazor';
        }

        if (csproj.includes('nunit')) {
          context.testRunner = 'nunit';
        } else if (csproj.includes('mstest')) {
          context.testRunner = 'mstest';
        }
      }
    } catch {
      // Ignore errors
    }
  }

  // ============================================
  // Ruby (Gemfile)
  // ============================================
  const gemfilePath = path.join(cwd, 'Gemfile');
  if (fs.existsSync(gemfilePath)) {
    context.language = 'ruby';

    const gemfile = fs.readFileSync(gemfilePath, 'utf-8').toLowerCase();

    if (gemfile.includes('rails')) {
      context.framework = 'rails';
    } else if (gemfile.includes('sinatra')) {
      context.framework = 'sinatra';
    } else if (gemfile.includes('hanami')) {
      context.framework = 'hanami';
    }

    if (gemfile.includes('rspec')) {
      context.testRunner = 'rspec';
    } else if (gemfile.includes('minitest')) {
      context.testRunner = 'minitest';
    }
  }

  // ============================================
  // PHP (composer.json)
  // ============================================
  const composerPath = path.join(cwd, 'composer.json');
  if (fs.existsSync(composerPath)) {
    context.language = 'php';

    try {
      const composer = JSON.parse(fs.readFileSync(composerPath, 'utf-8'));
      const allDeps = {
        ...composer.require,
        ...composer['require-dev'],
      };

      if (allDeps['laravel/framework']) {
        context.framework = 'laravel';
      } else if (allDeps['symfony/framework-bundle']) {
        context.framework = 'symfony';
      } else if (allDeps['slim/slim']) {
        context.framework = 'slim';
      } else if (allDeps['codeigniter4/framework']) {
        context.framework = 'codeigniter';
      }

      if (allDeps['phpunit/phpunit']) {
        context.testRunner = 'phpunit';
      } else if (allDeps['pestphp/pest']) {
        context.testRunner = 'pest';
      }
    } catch {
      // Ignore parse errors
    }
  }

  // ============================================
  // Python (requirements.txt / pyproject.toml)
  // ============================================
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
      } else if (reqs.includes('tornado')) {
        context.framework = 'tornado';
      } else if (reqs.includes('aiohttp')) {
        context.framework = 'aiohttp';
      }

      if (reqs.includes('pytest') && !context.testRunner) {
        context.testRunner = 'pytest';
      } else if (reqs.includes('unittest') && !context.testRunner) {
        context.testRunner = 'unittest';
      }
    }
  }

  // ============================================
  // Go (go.mod)
  // ============================================
  if (fs.existsSync(path.join(cwd, 'go.mod'))) {
    context.language = 'go';
    context.testRunner = 'go test';

    const goMod = fs.readFileSync(path.join(cwd, 'go.mod'), 'utf-8').toLowerCase();
    if (goMod.includes('gin-gonic/gin')) {
      context.framework = 'gin';
    } else if (goMod.includes('labstack/echo')) {
      context.framework = 'echo';
    } else if (goMod.includes('gofiber/fiber')) {
      context.framework = 'fiber';
    } else if (goMod.includes('go-chi/chi')) {
      context.framework = 'chi';
    }
  }

  // ============================================
  // Rust (Cargo.toml)
  // ============================================
  if (fs.existsSync(path.join(cwd, 'Cargo.toml'))) {
    context.language = 'rust';
    context.testRunner = 'cargo test';

    const cargo = fs.readFileSync(path.join(cwd, 'Cargo.toml'), 'utf-8').toLowerCase();
    if (cargo.includes('actix-web')) {
      context.framework = 'actix-web';
    } else if (cargo.includes('rocket')) {
      context.framework = 'rocket';
    } else if (cargo.includes('axum')) {
      context.framework = 'axum';
    } else if (cargo.includes('warp')) {
      context.framework = 'warp';
    } else if (cargo.includes('tauri')) {
      context.framework = 'tauri';
    }
  }

  // ============================================
  // Elixir (mix.exs)
  // ============================================
  const mixPath = path.join(cwd, 'mix.exs');
  if (fs.existsSync(mixPath)) {
    context.language = 'elixir';
    context.testRunner = 'exunit';

    const mix = fs.readFileSync(mixPath, 'utf-8').toLowerCase();
    if (mix.includes(':phoenix')) {
      context.framework = 'phoenix';
    }
  }

  // ============================================
  // Scala (build.sbt)
  // ============================================
  const sbtPath = path.join(cwd, 'build.sbt');
  if (fs.existsSync(sbtPath)) {
    context.language = 'scala';
    context.testRunner = 'scalatest';

    const sbt = fs.readFileSync(sbtPath, 'utf-8').toLowerCase();
    if (sbt.includes('play')) {
      context.framework = 'play';
    } else if (sbt.includes('akka-http')) {
      context.framework = 'akka-http';
    } else if (sbt.includes('http4s')) {
      context.framework = 'http4s';
    }
  }

  // ============================================
  // C/C++ (CMakeLists.txt / Makefile)
  // ============================================
  const cmakePath = path.join(cwd, 'CMakeLists.txt');
  const makefilePath = path.join(cwd, 'Makefile');

  if (fs.existsSync(cmakePath) || fs.existsSync(makefilePath)) {
    // Check for common C++ indicators
    const hasCpp = findFileWithExtension(cwd, ['.cpp', '.cc', '.cxx', '.hpp']);
    context.language = hasCpp ? 'cpp' : 'c';

    if (fs.existsSync(cmakePath)) {
      const cmake = fs.readFileSync(cmakePath, 'utf-8').toLowerCase();
      if (cmake.includes('gtest') || cmake.includes('googletest')) {
        context.testRunner = 'gtest';
      } else if (cmake.includes('catch2')) {
        context.testRunner = 'catch2';
      }

      if (cmake.includes('qt')) {
        context.framework = 'qt';
      }
    }
  }

  // ============================================
  // Dart / Flutter (pubspec.yaml)
  // ============================================
  const pubspecPath = path.join(cwd, 'pubspec.yaml');
  if (fs.existsSync(pubspecPath)) {
    context.language = 'dart';
    context.testRunner = 'flutter test';

    const pubspec = fs.readFileSync(pubspecPath, 'utf-8').toLowerCase();
    if (pubspec.includes('flutter:')) {
      context.framework = 'flutter';
    }
  }

  // ============================================
  // Detect common directory structures
  // ============================================
  const directories: ProjectContext['directories'] = {};

  // Source directories vary by language
  const srcCandidates = ['src', 'lib', 'app', 'Sources', 'source'];
  for (const dir of srcCandidates) {
    if (fs.existsSync(path.join(cwd, dir)) && fs.statSync(path.join(cwd, dir)).isDirectory()) {
      directories.source = dir;
      break;
    }
  }

  const testCandidates = ['tests', 'test', '__tests__', 'spec', 'Tests', 'src/__tests__', 'src/test'];
  for (const dir of testCandidates) {
    if (fs.existsSync(path.join(cwd, dir)) && fs.statSync(path.join(cwd, dir)).isDirectory()) {
      directories.tests = dir;
      break;
    }
  }

  const componentCandidates = ['src/components', 'components', 'app/components', 'src/ui', 'Views'];
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
