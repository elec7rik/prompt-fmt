import chalk from 'chalk';
import { Provider, Verbosity } from '../types.js';
import { getConfig, setProvider, setVerbosity, getConfigPath } from '../lib/config.js';
import { loadProjectContext, getProjectConfigPath } from '../lib/project-context.js';

interface ConfigOptions {
  show?: boolean;
  setProvider?: string;
  setVerbosity?: string;
}

const VALID_PROVIDERS: Provider[] = ['openai', 'anthropic', 'google'];
const VALID_VERBOSITIES: Verbosity[] = ['concise', 'detailed'];

export function configCommand(options: ConfigOptions): void {
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
    console.log(chalk.dim("\nProject context: (not initialized - run 'prompt-fmt init')"));
  }

  console.log(chalk.dim(`\n  Global config:  ${getConfigPath()}`));
  console.log(chalk.dim(`  Project config: ${getProjectConfigPath()}`));
  console.log();
}
