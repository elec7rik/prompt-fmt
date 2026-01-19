import ora from 'ora';
import chalk from 'chalk';
import { input } from '@inquirer/prompts';
import { FormatOptions, Provider } from '../types.js';
import { getConfig } from '../lib/config.js';
import { copyToClipboard } from '../lib/clipboard.js';
import { formatPrompt, getApiKey } from '../providers/index.js';

export async function formatCommand(
  promptArg: string | undefined,
  options: FormatOptions
): Promise<void> {
  const config = getConfig();

  // Get the prompt - either from argument or interactive input
  let userPrompt = promptArg;
  if (!userPrompt) {
    userPrompt = await input({
      message: 'Enter your prompt:',
    });
  }

  if (!userPrompt.trim()) {
    console.error(chalk.red('Error: Prompt cannot be empty'));
    process.exit(1);
  }

  // Determine provider
  const provider: Provider = options.provider || config.provider;

  // Determine verbosity
  const detailed = options.detailed || (!options.concise && config.verbosity === 'detailed');

  // Get API key
  let apiKey: string;
  try {
    apiKey = getApiKey(provider, options.apiKey);
  } catch (error) {
    console.error(chalk.red((error as Error).message));
    process.exit(1);
  }

  // Format the prompt
  const spinner = ora('Formatting prompt...').start();

  try {
    const formattedPrompt = await formatPrompt(userPrompt, provider, apiKey, detailed);
    spinner.stop();

    // Output the formatted prompt
    console.log('\n' + chalk.cyan('Formatted prompt:') + '\n');
    console.log(formattedPrompt);
    console.log();

    // Copy to clipboard unless --no-copy is set
    if (!options.noCopy) {
      const copied = await copyToClipboard(formattedPrompt);
      if (copied) {
        console.log(chalk.green('✓ Copied to clipboard'));
      } else {
        console.log(chalk.yellow('⚠ Could not copy to clipboard'));
      }
    }
  } catch (error) {
    spinner.stop();
    console.error(chalk.red('Error formatting prompt:'), (error as Error).message);
    process.exit(1);
  }
}
