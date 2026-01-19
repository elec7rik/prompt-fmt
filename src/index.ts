import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { formatCommand } from './commands/format.js';
import { configCommand } from './commands/config.js';
import { initCommand } from './commands/init.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

const program = new Command();

program
  .name('prompt-formatter')
  .description('Transform casual prompts into well-formatted prompts for AI coding assistants')
  .version(pkg.version)
  .argument('[prompt]', 'prompt to format')
  .option('-p, --provider <name>', 'google, anthropic, or openai')
  .option('--api-key <key>', 'API key (or set env var)')
  .option('--detailed', 'verbose output with steps')
  .option('--concise', 'brief output (default)')
  .option('--no-copy', 'skip clipboard')
  .action(async (prompt, options) => {
    await formatCommand(prompt, {
      provider: options.provider,
      apiKey: options.apiKey,
      detailed: options.detailed,
      concise: options.concise,
      noCopy: !options.copy,
    });
  });

program
  .command('init')
  .description('detect project language/framework')
  .option('-f, --force', 'reinitialize')
  .action(async (options) => {
    await initCommand(options);
  });

program
  .command('config')
  .description('view/set configuration')
  .option('--show', 'show current config')
  .option('--set-provider <name>', 'set default provider')
  .option('--set-verbosity <level>', 'set concise or detailed')
  .option('--set-api-key [provider]', 'set API key (prompts securely)')
  .action(async (options) => {
    await configCommand(options);
  });

program.addHelpText('after', `
${chalk.cyan('Examples:')}
  $ prompt-formatter "fix the login bug"
  $ prompt-formatter "add auth" --detailed
  $ prompt-formatter "refactor" -p anthropic
  $ prompt-formatter init
  $ prompt-formatter config --show
  $ prompt-formatter config --set-api-key
  $ prompt-formatter config --set-api-key google

${chalk.cyan('API Keys (in priority order):')}
  1. Stored config (prompt-formatter config --set-api-key)
  2. Environment variable
`);

program.parse();
