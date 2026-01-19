import ora from 'ora';
import chalk from 'chalk';
import { input, select, password } from '@inquirer/prompts';
import { FormatOptions, Provider, PROVIDER_CONFIGS } from '../types.js';
import { getConfig, setProvider } from '../lib/config.js';
import { copyToClipboard } from '../lib/clipboard.js';
import { formatPrompt, getApiKey, hasApiKey } from '../providers/index.js';
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

  const envVar = PROVIDER_CONFIGS[provider].envVar;
  console.log(chalk.dim(`\nTip: Set ${envVar} environment variable to skip this next time.\n`));

  const apiKey = await password({
    message: 'Paste your API key:',
    mask: '*',
  });

  if (!apiKey.trim()) {
    console.error(chalk.red('Error: API key cannot be empty'));
    process.exit(1);
  }

  // Save provider preference
  setProvider(provider);
  console.log(chalk.green(`\n✓ Provider set to: ${provider}`));

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

  // Format the prompt
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
  } catch (error) {
    spinner.stop();
    console.error(chalk.red('Error formatting prompt:'), (error as Error).message);
    process.exit(1);
  }
}
