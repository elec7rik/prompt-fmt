import ora from 'ora';
import chalk from 'chalk';
import { input, select, password } from '@inquirer/prompts';
import { FormatOptions, Provider, PROVIDER_CONFIGS } from '../types.js';
import { getConfig, setProvider, setApiKey } from '../lib/config.js';
import { copyToClipboard } from '../lib/clipboard.js';
import { formatPrompt, getApiKey, hasApiKey, ApiKeyError } from '../providers/index.js';
import { loadProjectContext, formatContextForPrompt } from '../lib/project-context.js';

async function interactiveSetup(): Promise<{ provider: Provider; apiKey: string }> {
  console.log(chalk.cyan('\n🔧 First-time setup\n'));

  const provider = await select<Provider>({
    message: 'Select your LLM provider:',
    choices: [
      { value: 'google' as Provider, name: 'Google Gemini (gemini-2.5-flash) - free tier available' },
      { value: 'anthropic' as Provider, name: 'Anthropic Claude (claude-sonnet-4) - requires paid credits' },
      { value: 'openai' as Provider, name: 'OpenAI GPT (gpt-4o-mini) - requires paid credits' },
    ],
  });

  console.log(chalk.dim(`\nYour API key will be stored securely in the config file.\n`));

  const apiKey = await password({
    message: 'Paste your API key:',
    mask: '*',
  });

  if (!apiKey.trim()) {
    console.error(chalk.red('Error: API key cannot be empty'));
    process.exit(1);
  }

  // Save provider and API key
  setProvider(provider);
  setApiKey(provider, apiKey);
  console.log(chalk.green(`\n✓ Provider set to: ${provider}`));
  console.log(chalk.green(`✓ API key saved`));

  return { provider, apiKey };
}

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

  // Determine provider and API key
  let provider: Provider = options.provider || config.provider;
  let apiKey: string | undefined = options.apiKey;

  // Check if we have an API key for the current provider
  if (!apiKey && !hasApiKey(provider)) {
    // No API key available - run interactive setup
    const setup = await interactiveSetup();
    provider = setup.provider;
    apiKey = setup.apiKey;
  } else if (!apiKey) {
    apiKey = getApiKey(provider);
  }

  // Determine verbosity
  const detailed = options.detailed || (!options.concise && config.verbosity === 'detailed');

  // Load project context if available
  const projectContext = loadProjectContext();
  const contextString = projectContext ? formatContextForPrompt(projectContext) : undefined;

  // Format the prompt with retry on auth errors
  while (true) {
    const spinner = ora('Formatting prompt...').start();

    try {
      const formattedPrompt = await formatPrompt(userPrompt, provider, apiKey, detailed, contextString);
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
      break;
    } catch (error) {
      spinner.stop();

      if (error instanceof ApiKeyError) {
        console.error(chalk.red('\n' + error.message));
        console.log(chalk.yellow('Please enter a valid API key.\n'));

        const newApiKey = await password({
          message: 'Paste your API key:',
          mask: '*',
        });

        if (!newApiKey.trim()) {
          console.error(chalk.red('Error: API key cannot be empty'));
          process.exit(1);
        }

        apiKey = newApiKey;
        setApiKey(provider, apiKey);
        console.log(chalk.green('✓ API key saved\n'));
        continue;
      }

      console.error(chalk.red('Error formatting prompt:'), (error as Error).message);
      process.exit(1);
    }
  }
}
