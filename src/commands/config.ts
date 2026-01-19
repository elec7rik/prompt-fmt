import ora from 'ora';
import chalk from 'chalk';
import { password } from '@inquirer/prompts';
import { Provider, Verbosity, PROVIDER_CONFIGS } from '../types.js';
import { getConfig, setProvider, setVerbosity, getConfigPath, setApiKey, hasStoredApiKey } from '../lib/config.js';
import { loadProjectContext, getProjectConfigPath } from '../lib/project-context.js';
import { validateApiKey, ApiKeyError } from '../providers/index.js';

interface ConfigOptions {
  show?: boolean;
  setProvider?: string;
  setVerbosity?: string;
  setApiKey?: string | boolean;
}

const VALID_PROVIDERS: Provider[] = ['openai', 'anthropic', 'google'];
const VALID_VERBOSITIES: Verbosity[] = ['concise', 'detailed'];

export async function configCommand(options: ConfigOptions): Promise<void> {
  // If --set-api-key is specified
  if (options.setApiKey !== undefined) {
    const config = getConfig();
    // Determine which provider to set the key for
    let provider: Provider;
    if (typeof options.setApiKey === 'string') {
      const requestedProvider = options.setApiKey.toLowerCase() as Provider;
      if (!VALID_PROVIDERS.includes(requestedProvider)) {
        console.error(
          chalk.red(`Invalid provider: ${options.setApiKey}. Valid options: ${VALID_PROVIDERS.join(', ')}`)
        );
        process.exit(1);
      }
      provider = requestedProvider;
    } else {
      // Use current default provider
      provider = config.provider;
    }

    const envVar = PROVIDER_CONFIGS[provider].envVar;
    console.log(chalk.cyan(`\nSet API key for ${provider}\n`));
    console.log(chalk.dim(`This will be stored securely in your config file.`));
    console.log(chalk.dim(`Alternative: set ${envVar} environment variable.\n`));

    // Loop until valid key is provided or user cancels
    while (true) {
      const apiKey = await password({
        message: 'Paste your API key:',
        mask: '*',
      });

      if (!apiKey.trim()) {
        console.error(chalk.red('Error: API key cannot be empty'));
        process.exit(1);
      }

      // Validate the API key before saving
      const spinner = ora(`Validating API key for ${provider}...`).start();

      try {
        await validateApiKey(provider, apiKey);
        spinner.stop();
        setApiKey(provider, apiKey);
        console.log(chalk.green(`\n✓ API key validated and saved for ${provider}`));
        return;
      } catch (error) {
        spinner.stop();

        if (error instanceof ApiKeyError) {
          console.error(chalk.red('\n' + error.message));
          console.log(chalk.yellow('Please enter a valid API key.\n'));
          continue;
        }

        // For non-auth errors, show the error and exit
        console.error(chalk.red('\nError validating API key:'), (error as Error).message);
        process.exit(1);
      }
    }
  }

  // If --set-provider is specified
  if (options.setProvider) {
    const provider = options.setProvider.toLowerCase() as Provider;
    if (!VALID_PROVIDERS.includes(provider)) {
      console.error(
        chalk.red(`Invalid provider: ${options.setProvider}. Valid options: ${VALID_PROVIDERS.join(', ')}`)
      );
      process.exit(1);
    }
    setProvider(provider);
    console.log(chalk.green(`✓ Provider set to: ${provider}`));
    return;
  }

  // If --set-verbosity is specified
  if (options.setVerbosity) {
    const verbosity = options.setVerbosity.toLowerCase() as Verbosity;
    if (!VALID_VERBOSITIES.includes(verbosity)) {
      console.error(
        chalk.red(`Invalid verbosity: ${options.setVerbosity}. Valid options: ${VALID_VERBOSITIES.join(', ')}`)
      );
      process.exit(1);
    }
    setVerbosity(verbosity);
    console.log(chalk.green(`✓ Verbosity set to: ${verbosity}`));
    return;
  }

  // Default: show current config
  const config = getConfig();
  console.log(chalk.cyan('\nCurrent configuration:\n'));
  console.log(`  Provider:  ${chalk.white(config.provider)}`);
  console.log(`  Verbosity: ${chalk.white(config.verbosity)}`);

  // Show API key status for all providers
  console.log(chalk.cyan('\nAPI keys:\n'));
  for (const provider of VALID_PROVIDERS) {
    const envVar = PROVIDER_CONFIGS[provider].envVar;
    const hasStored = hasStoredApiKey(provider);
    const hasEnv = !!process.env[envVar];

    let status: string;
    if (hasStored) {
      status = chalk.green('configured (stored)');
    } else if (hasEnv) {
      status = chalk.green('configured (env)');
    } else {
      status = chalk.dim('not set');
    }
    console.log(`  ${provider.padEnd(10)} ${status}`);
  }

  // Show project context if available
  const projectContext = loadProjectContext();
  if (projectContext) {
    console.log(chalk.cyan('\nProject context:\n'));
    if (projectContext.language) {
      console.log(`  Language:    ${chalk.white(projectContext.language)}`);
    }
    if (projectContext.framework) {
      console.log(`  Framework:   ${chalk.white(projectContext.framework)}`);
    }
    if (projectContext.testRunner) {
      console.log(`  Test runner: ${chalk.white(projectContext.testRunner)}`);
    }
    if (projectContext.dependencies && projectContext.dependencies.length > 0) {
      console.log(`  Dependencies: ${chalk.white(projectContext.dependencies.join(', '))}`);
    }
  } else {
    console.log(chalk.dim("\nProject context: (not initialized - run 'prompt-formatter init')"));
  }

  console.log(chalk.dim(`\n  Global config:  ${getConfigPath()}`));
  console.log(chalk.dim(`  Project config: ${getProjectConfigPath()}`));
  console.log();
}
