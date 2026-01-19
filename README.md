# prompt-fmt

Transform casual prompts into well-formatted prompts optimized for AI coding assistants.

## Installation

### Homebrew (macOS/Linux)

```bash
brew tap elec7rik/prompt-fmt
brew install prompt-fmt
```

### Standalone Binary

Download from [GitHub Releases](https://github.com/elec7rik/prompt-fmt/releases):

```bash
# macOS (Apple Silicon)
curl -L https://github.com/elec7rik/prompt-fmt/releases/latest/download/prompt-fmt-darwin-arm64.tar.gz | tar xz
sudo mv prompt-fmt /usr/local/bin/

# macOS (Intel)
curl -L https://github.com/elec7rik/prompt-fmt/releases/latest/download/prompt-fmt-darwin-x64.tar.gz | tar xz
sudo mv prompt-fmt /usr/local/bin/

# Linux (x64)
curl -L https://github.com/elec7rik/prompt-fmt/releases/latest/download/prompt-fmt-linux-x64.tar.gz | tar xz
sudo mv prompt-fmt /usr/local/bin/
```

### npm (requires Node.js)

```bash
npm install -g prompt-fmt
```

## Usage

```bash
# Format a prompt
prompt-fmt "fix the login bug"

# Use detailed mode (more comprehensive output)
prompt-fmt "add user authentication" --detailed

# Use concise mode (brief output)
prompt-fmt "add dark mode" --concise

# Initialize project context for better prompts
prompt-fmt init
```

## Project Context

Run `prompt-fmt init` in your project directory to enable project-aware prompts:

```bash
cd my-project
prompt-fmt init
```

This scans your project and creates `.prompt-fmt.json` with detected:
- Language (TypeScript, Python, Swift, Java, Go, Rust, etc.)
- Framework (React, Next.js, Django, Rails, SwiftUI, Spring Boot, etc.)
- Test runner (Jest, Vitest, Pytest, XCTest, JUnit, etc.)
- Directory structure

Future prompts will automatically include this context for more specific suggestions.

## Supported Languages & Frameworks

| Language | Frameworks |
|----------|------------|
| TypeScript/JS | Next.js, React, Vue, Angular, Svelte, Express, NestJS |
| Python | Django, FastAPI, Flask |
| Swift | SwiftUI, Vapor |
| Java | Spring Boot, Quarkus |
| Kotlin | Android, Ktor |
| Go | Gin, Echo, Fiber |
| Rust | Actix-web, Axum, Tauri |
| C# | ASP.NET Core, MAUI, Blazor |
| Ruby | Rails, Sinatra |
| PHP | Laravel, Symfony |
| Dart | Flutter |

## Configuration

```bash
# Show current config
prompt-fmt config --show

# Set default provider
prompt-fmt config --set-provider google  # or anthropic, openai

# Set default verbosity
prompt-fmt config --set-verbosity detailed  # or concise
```

## API Keys

Set your API key as an environment variable:

```bash
# Google Gemini (default)
export GOOGLE_GENERATIVE_AI_API_KEY=your-key

# Anthropic Claude
export ANTHROPIC_API_KEY=your-key

# OpenAI
export OPENAI_API_KEY=your-key
```

Or pass it directly:

```bash
prompt-fmt "fix bug" --api-key your-key --provider google
```

## License

MIT
