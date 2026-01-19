# prompt-formatter

Transform casual prompts into well-formatted prompts optimized for AI coding assistants.

## Installation

### Homebrew (macOS/Linux)

```bash
brew tap elec7rik/prompt-formatter
brew install prompt-formatter
```

### npm (requires Node.js 18+)

```bash
npm install -g prompt-formatter
```

### Standalone Binary

Download from [GitHub Releases](https://github.com/elec7rik/prompt-fmt/releases):

```bash
# macOS (Apple Silicon)
curl -L https://github.com/elec7rik/prompt-fmt/releases/latest/download/prompt-formatter-darwin-arm64.tar.gz | tar xz
sudo mv prompt-formatter /usr/local/bin/

# macOS (Intel)
curl -L https://github.com/elec7rik/prompt-fmt/releases/latest/download/prompt-formatter-darwin-x64.tar.gz | tar xz
sudo mv prompt-formatter /usr/local/bin/

# Linux (x64)
curl -L https://github.com/elec7rik/prompt-fmt/releases/latest/download/prompt-formatter-linux-x64.tar.gz | tar xz
sudo mv prompt-formatter /usr/local/bin/
```

## Quick Start

```bash
# Format a prompt (copies result to clipboard)
prompt-formatter "fix the login bug"

# Interactive mode - prompts for input
prompt-formatter
```

On first run, you'll be guided through provider selection and API key setup.

## Usage

```bash
prompt-formatter [prompt] [options]
```

### Options

| Option | Description |
|--------|-------------|
| `-p, --provider <provider>` | LLM provider: `google`, `anthropic`, or `openai` |
| `--api-key <key>` | API key (overrides environment variable) |
| `--detailed` | Detailed mode with numbered steps and edge cases |
| `--concise` | Concise mode - brief but clear (default) |
| `--no-copy` | Don't copy result to clipboard |

### Examples

```bash
# Basic usage
prompt-formatter "add user authentication"

# Detailed output with numbered steps
prompt-formatter "refactor the database layer" --detailed

# Use a specific provider
prompt-formatter "optimize this query" --provider anthropic

# Don't copy to clipboard
prompt-formatter "add tests" --no-copy
```

## Project Context

Run `prompt-formatter init` to enable project-aware prompts. This scans your project and creates `.prompt-formatter.json` with detected language, framework, test runner, and directory structure.

```bash
cd my-project
prompt-formatter init
```

Re-running `init` in an existing project checks for changes and prompts to update:

```
Project config exists. Checking for changes...

Detected updates:

  + dependency: axios
  ~ framework: react → next.js

Update config? (Y/n)
```

Use `--force` to reinitialize without prompts:

```bash
prompt-formatter init --force
```

## Supported Languages & Frameworks

| Language | Frameworks | Test Runner |
|----------|------------|-------------|
| TypeScript/JavaScript | Next.js, Remix, Nuxt, React, Vue, Angular, Svelte, Solid, Express, NestJS, Fastify, Hono, Koa, Electron, React Native, Expo | Vitest, Jest, Mocha, AVA, Jasmine |
| Python | Django, FastAPI, Flask, Tornado, aiohttp | pytest, unittest |
| Swift | SwiftUI, Vapor, RxSwift | XCTest |
| Java | Spring Boot, Spring, Quarkus, Micronaut | JUnit |
| Kotlin | Android, Ktor, Spring Boot | JUnit, Android Test |
| Go | Gin, Echo, Fiber, Chi | go test |
| Rust | Actix-web, Axum, Rocket, Warp, Tauri | cargo test |
| C# | ASP.NET Core, MAUI, Blazor, WPF, Xamarin | xUnit, NUnit, MSTest |
| Ruby | Rails, Sinatra, Hanami | RSpec, Minitest |
| PHP | Laravel, Symfony, Slim, CodeIgniter | PHPUnit, Pest |
| Elixir | Phoenix | ExUnit |
| Scala | Play, Akka HTTP, http4s | ScalaTest |
| Dart | Flutter | flutter test |
| C/C++ | Qt | Google Test, Catch2 |

## Configuration

```bash
# Show current configuration and project context
prompt-formatter config --show

# Set default provider
prompt-formatter config --set-provider google

# Set default verbosity
prompt-formatter config --set-verbosity detailed
```

## API Keys

Set your API key as an environment variable:

```bash
# Google Gemini (default, free tier available)
export GOOGLE_GENERATIVE_AI_API_KEY=your-key

# Anthropic Claude
export ANTHROPIC_API_KEY=your-key

# OpenAI
export OPENAI_API_KEY=your-key
```

Or pass directly:

```bash
prompt-formatter "fix bug" --api-key your-key --provider google
```

## Commands

| Command | Description |
|---------|-------------|
| `prompt-formatter [prompt]` | Format a prompt |
| `prompt-formatter init` | Initialize project context |
| `prompt-formatter config --show` | Show current configuration |
| `prompt-formatter help` | Show help information |

## License

MIT
