import { Command } from 'commander';
import chalk from 'chalk';
import { formatCommand } from './commands/format.js';
import { configCommand } from './commands/config.js';
import { initCommand } from './commands/init.js';

const program = new Command();

program
  .name('prompt-fmt')
  .description('Transform casual prompts into well-formatted prompts for AI coding assistants')
  .version('1.0.0')
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
  .action((options) => {
    configCommand(options);
  });

program.addHelpText('after', `
${chalk.cyan('Examples:')}
  $ prompt-fmt "fix the login bug"
  $ prompt-fmt "add auth" --detailed
  $ prompt-fmt "refactor" -p anthropic
  $ prompt-fmt init
  $ prompt-fmt config --show

${chalk.cyan('Environment:')}
  GOOGLE_GENERATIVE_AI_API_KEY    Google Gemini (default)
  ANTHROPIC_API_KEY               Anthropic Claude
  OPENAI_API_KEY                  OpenAI GPT
`);

program.parse();
