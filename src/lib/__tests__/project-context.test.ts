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

    // ============================================
    // Swift / iOS / macOS Tests
    // ============================================
    it('detects Swift project via Package.swift', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'Package.swift'),
        `// swift-tools-version:5.5
import PackageDescription
let package = Package(name: "MyApp")`
      );

      const context = await detectProjectContext();
      expect(context.language).toBe('swift');
      expect(context.testRunner).toBe('xctest');
    });

    it('detects SwiftUI framework', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'Package.swift'),
        `import PackageDescription
import SwiftUI
let package = Package(name: "MyApp")`
      );

      const context = await detectProjectContext();
      expect(context.language).toBe('swift');
      expect(context.framework).toBe('swiftui');
    });

    it('detects Vapor framework', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'Package.swift'),
        `import PackageDescription
import Vapor
let package = Package(name: "MyApp")`
      );

      const context = await detectProjectContext();
      expect(context.language).toBe('swift');
      expect(context.framework).toBe('vapor');
    });

    it('detects iOS project via Podfile', async () => {
      fs.writeFileSync(path.join(tempDir, 'Package.swift'), 'import PackageDescription');
      fs.writeFileSync(
        path.join(tempDir, 'Podfile'),
        `platform :ios, '14.0'
pod 'Alamofire'
pod 'SnapKit'`
      );

      const context = await detectProjectContext();
      expect(context.language).toBe('swift');
      // Dependencies are lowercased during extraction
      expect(context.dependencies).toContain('alamofire');
    });

    // ============================================
    // Java Tests
    // ============================================
    it('detects Java project via pom.xml', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'pom.xml'),
        `<project>
  <dependencies>
    <dependency>
      <groupId>org.springframework</groupId>
    </dependency>
  </dependencies>
</project>`
      );

      const context = await detectProjectContext();
      expect(context.language).toBe('java');
      expect(context.framework).toBe('spring');
      expect(context.testRunner).toBe('junit');
    });

    it('detects Spring Boot framework', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'pom.xml'),
        `<project>
  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
  </parent>
</project>`
      );

      const context = await detectProjectContext();
      expect(context.language).toBe('java');
      expect(context.framework).toBe('spring-boot');
    });

    it('detects Java project via build.gradle', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'build.gradle'),
        `plugins {
  id 'java'
}
dependencies {
  implementation 'org.springframework.boot:spring-boot-starter'
}`
      );

      const context = await detectProjectContext();
      expect(context.language).toBe('java');
      expect(context.framework).toBe('spring-boot');
    });

    // ============================================
    // Kotlin / Android Tests
    // ============================================
    it('detects Kotlin project via build.gradle.kts', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'build.gradle.kts'),
        `plugins {
  kotlin("jvm") version "1.9.0"
}`
      );

      const context = await detectProjectContext();
      expect(context.language).toBe('kotlin');
      expect(context.testRunner).toBe('junit');
    });

    it('detects Android project', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'build.gradle'),
        `plugins {
  id 'com.android.application'
}
android {
  compileSdk 34
}`
      );

      const context = await detectProjectContext();
      expect(context.language).toBe('kotlin');
      expect(context.framework).toBe('android');
    });

    it('detects Ktor framework', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'build.gradle.kts'),
        `plugins {
  kotlin("jvm")
}
dependencies {
  implementation("io.ktor:ktor-server-core")
}`
      );

      const context = await detectProjectContext();
      expect(context.language).toBe('kotlin');
      expect(context.framework).toBe('ktor');
    });

    // ============================================
    // C# / .NET Tests
    // ============================================
    it('detects C# project via .csproj', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'MyApp.csproj'),
        `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
  </PropertyGroup>
</Project>`
      );

      const context = await detectProjectContext();
      expect(context.language).toBe('csharp');
      expect(context.testRunner).toBe('xunit');
    });

    it('detects ASP.NET Core framework', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'MyApp.csproj'),
        `<Project Sdk="Microsoft.NET.Sdk.Web">
  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.App" />
  </ItemGroup>
</Project>`
      );

      const context = await detectProjectContext();
      expect(context.language).toBe('csharp');
      expect(context.framework).toBe('asp.net-core');
    });

    it('detects NUnit test runner', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'Tests.csproj'),
        `<Project>
  <ItemGroup>
    <PackageReference Include="NUnit" />
  </ItemGroup>
</Project>`
      );

      const context = await detectProjectContext();
      expect(context.testRunner).toBe('nunit');
    });

    // ============================================
    // Ruby Tests
    // ============================================
    it('detects Ruby project via Gemfile', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'Gemfile'),
        `source 'https://rubygems.org'
gem 'rails'`
      );

      const context = await detectProjectContext();
      expect(context.language).toBe('ruby');
      expect(context.framework).toBe('rails');
    });

    it('detects Sinatra framework', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'Gemfile'),
        `gem 'sinatra'`
      );

      const context = await detectProjectContext();
      expect(context.language).toBe('ruby');
      expect(context.framework).toBe('sinatra');
    });

    it('detects RSpec test runner', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'Gemfile'),
        `gem 'rspec'`
      );

      const context = await detectProjectContext();
      expect(context.language).toBe('ruby');
      expect(context.testRunner).toBe('rspec');
    });

    // ============================================
    // PHP Tests
    // ============================================
    it('detects PHP project via composer.json', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'composer.json'),
        JSON.stringify({
          require: { 'laravel/framework': '^10.0' },
        })
      );

      const context = await detectProjectContext();
      expect(context.language).toBe('php');
      expect(context.framework).toBe('laravel');
    });

    it('detects Symfony framework', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'composer.json'),
        JSON.stringify({
          require: { 'symfony/framework-bundle': '^6.0' },
        })
      );

      const context = await detectProjectContext();
      expect(context.language).toBe('php');
      expect(context.framework).toBe('symfony');
    });

    it('detects PHPUnit test runner', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'composer.json'),
        JSON.stringify({
          'require-dev': { 'phpunit/phpunit': '^10.0' },
        })
      );

      const context = await detectProjectContext();
      expect(context.language).toBe('php');
      expect(context.testRunner).toBe('phpunit');
    });

    // ============================================
    // Go Framework Tests
    // ============================================
    it('detects Gin framework', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'go.mod'),
        `module example.com/app
require github.com/gin-gonic/gin v1.9.0`
      );

      const context = await detectProjectContext();
      expect(context.language).toBe('go');
      expect(context.framework).toBe('gin');
    });

    it('detects Echo framework', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'go.mod'),
        `module example.com/app
require github.com/labstack/echo/v4 v4.11.0`
      );

      const context = await detectProjectContext();
      expect(context.language).toBe('go');
      expect(context.framework).toBe('echo');
    });

    // ============================================
    // Rust Framework Tests
    // ============================================
    it('detects Actix-web framework', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'Cargo.toml'),
        `[package]
name = "myapp"
[dependencies]
actix-web = "4"`
      );

      const context = await detectProjectContext();
      expect(context.language).toBe('rust');
      expect(context.framework).toBe('actix-web');
    });

    it('detects Tauri framework', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'Cargo.toml'),
        `[package]
name = "myapp"
[dependencies]
tauri = "1.0"`
      );

      const context = await detectProjectContext();
      expect(context.language).toBe('rust');
      expect(context.framework).toBe('tauri');
    });

    // ============================================
    // Elixir Tests
    // ============================================
    it('detects Elixir project via mix.exs', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'mix.exs'),
        `defmodule MyApp.MixProject do
  use Mix.Project
end`
      );

      const context = await detectProjectContext();
      expect(context.language).toBe('elixir');
      expect(context.testRunner).toBe('exunit');
    });

    it('detects Phoenix framework', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'mix.exs'),
        `defmodule MyApp.MixProject do
  defp deps do
    [{:phoenix, "~> 1.7"}]
  end
end`
      );

      const context = await detectProjectContext();
      expect(context.language).toBe('elixir');
      expect(context.framework).toBe('phoenix');
    });

    // ============================================
    // Scala Tests
    // ============================================
    it('detects Scala project via build.sbt', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'build.sbt'),
        `name := "myapp"
scalaVersion := "3.3.0"`
      );

      const context = await detectProjectContext();
      expect(context.language).toBe('scala');
      expect(context.testRunner).toBe('scalatest');
    });

    it('detects Play framework', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'build.sbt'),
        `name := "myapp"
libraryDependencies += "com.typesafe.play" %% "play" % "2.9.0"`
      );

      const context = await detectProjectContext();
      expect(context.language).toBe('scala');
      expect(context.framework).toBe('play');
    });

    // ============================================
    // C/C++ Tests
    // ============================================
    it('detects C project via CMakeLists.txt', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'CMakeLists.txt'),
        `cmake_minimum_required(VERSION 3.10)
project(myapp C)`
      );

      const context = await detectProjectContext();
      expect(context.language).toBe('c');
    });

    it('detects C++ project when .cpp files exist', async () => {
      fs.writeFileSync(path.join(tempDir, 'CMakeLists.txt'), 'project(myapp)');
      fs.writeFileSync(path.join(tempDir, 'main.cpp'), 'int main() {}');

      const context = await detectProjectContext();
      expect(context.language).toBe('cpp');
    });

    it('detects GoogleTest framework', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'CMakeLists.txt'),
        `project(myapp)
find_package(GTest REQUIRED)`
      );

      const context = await detectProjectContext();
      expect(context.testRunner).toBe('gtest');
    });

    // ============================================
    // Dart / Flutter Tests
    // ============================================
    it('detects Dart project via pubspec.yaml', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'pubspec.yaml'),
        `name: myapp
environment:
  sdk: '>=3.0.0 <4.0.0'`
      );

      const context = await detectProjectContext();
      expect(context.language).toBe('dart');
    });

    it('detects Flutter framework', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'pubspec.yaml'),
        `name: myapp
dependencies:
  flutter:
    sdk: flutter`
      );

      const context = await detectProjectContext();
      expect(context.language).toBe('dart');
      expect(context.framework).toBe('flutter');
    });

    // ============================================
    // Additional JS Framework Tests
    // ============================================
    it('detects Angular framework', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ dependencies: { '@angular/core': '^17.0.0' } })
      );

      const context = await detectProjectContext();
      expect(context.framework).toBe('angular');
    });

    it('detects React Native framework', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ dependencies: { 'react-native': '^0.72.0' } })
      );

      const context = await detectProjectContext();
      expect(context.framework).toBe('react-native');
    });

    it('detects Electron framework', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ dependencies: { electron: '^27.0.0' } })
      );

      const context = await detectProjectContext();
      expect(context.framework).toBe('electron');
    });

    it('detects NestJS framework', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ dependencies: { '@nestjs/core': '^10.0.0' } })
      );

      const context = await detectProjectContext();
      expect(context.framework).toBe('nestjs');
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
