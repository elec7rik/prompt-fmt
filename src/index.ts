import { Command } from 'commander';
import { formatCommand } from './commands/format.js';
import { configCommand } from './commands/config.js';

const program = new Command();

program
  .name('prompt-fmt')
  .description('Transform casual prompts into well-formatted prompts optimized for Claude Code')
  .version('1.0.0')
  .argument('[prompt]', 'The prompt to format')
  .option('-p, --provider <provider>', 'LLM provider (openai, anthropic, google)')
  .option('--api-key <key>', 'API key (overrides environment variable)')
  .option('--detailed', 'Use detailed mode (numbered steps, edge cases)')
  .option('--concise', 'Use concise mode (brief but clear, default)')
  .option('--no-copy', 'Do not copy result to clipboard')
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
  .command('config')
  .description('Manage configuration')
  .option('--show', 'Show current configuration')
  .option('--set-provider <provider>', 'Set default provider (openai, anthropic, google)')
  .option('--set-verbosity <verbosity>', 'Set default verbosity (concise, detailed)')
  .action((options) => {
    configCommand(options);
  });

program.parse();
