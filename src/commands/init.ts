import chalk from 'chalk';
import { confirm } from '@inquirer/prompts';
import {
  detectProjectContext,
  saveProjectContext,
  loadProjectContext,
  getProjectConfigPath,
} from '../lib/project-context.js';
import { ProjectContext } from '../types.js';

function displayContext(context: ProjectContext): void {
  console.log(chalk.cyan('\nDetected project context:\n'));

  if (context.language) {
    console.log(`  Language:    ${chalk.white(context.language)}`);
  }

  if (context.framework) {
    console.log(`  Framework:   ${chalk.white(context.framework)}`);
  }

  if (context.testRunner) {
    console.log(`  Test runner: ${chalk.white(context.testRunner)}`);
  }

  if (context.directories) {
    const dirs = Object.entries(context.directories)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}/`)
      .join(', ');
    if (dirs) {
      console.log(`  Directories: ${chalk.white(dirs)}`);
    }
  }

  if (context.dependencies && context.dependencies.length > 0) {
    console.log(`  Dependencies: ${chalk.white(context.dependencies.join(', '))}`);
  }

  console.log();
}

export async function initCommand(options: { force?: boolean }): Promise<void> {
  const existingContext = loadProjectContext();

  if (existingContext && !options.force) {
    console.log(chalk.yellow('\nProject already initialized.'));
    displayContext(existingContext);
    console.log(chalk.dim(`Config: ${getProjectConfigPath()}`));
    console.log(chalk.dim('Use --force to reinitialize.\n'));
    return;
  }

  console.log(chalk.cyan('\nScanning project...\n'));

  const context = await detectProjectContext();

  if (Object.keys(context).length === 0) {
    console.log(chalk.yellow('Could not detect project type.'));
    console.log(chalk.dim('Make sure you are in a project directory with package.json, requirements.txt, go.mod, or Cargo.toml.\n'));
    return;
  }

  displayContext(context);

  const shouldSave = await confirm({
    message: 'Save this configuration?',
    default: true,
  });

  if (shouldSave) {
    saveProjectContext(context);
    console.log(chalk.green(`\n✓ Created ${getProjectConfigPath()}`));
    console.log(chalk.dim('Future prompts will include this project context.\n'));
  } else {
    console.log(chalk.dim('\nConfiguration not saved.\n'));
  }
}
