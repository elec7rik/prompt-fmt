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

interface ContextChange {
  field: string;
  type: 'added' | 'removed' | 'changed';
  oldValue?: string;
  newValue?: string;
}

function compareContexts(existing: ProjectContext, detected: ProjectContext): ContextChange[] {
  const changes: ContextChange[] = [];

  // Compare simple fields
  const simpleFields: (keyof ProjectContext)[] = ['language', 'framework', 'testRunner'];
  for (const field of simpleFields) {
    const oldVal = existing[field] as string | undefined;
    const newVal = detected[field] as string | undefined;

    if (oldVal !== newVal) {
      if (!oldVal && newVal) {
        changes.push({ field, type: 'added', newValue: newVal });
      } else if (oldVal && !newVal) {
        changes.push({ field, type: 'removed', oldValue: oldVal });
      } else if (oldVal && newVal) {
        changes.push({ field, type: 'changed', oldValue: oldVal, newValue: newVal });
      }
    }
  }

  // Compare directories
  const oldDirs = existing.directories || {};
  const newDirs = detected.directories || {};
  const allDirKeys = new Set([...Object.keys(oldDirs), ...Object.keys(newDirs)]);

  for (const key of allDirKeys) {
    const oldVal = oldDirs[key as keyof typeof oldDirs];
    const newVal = newDirs[key as keyof typeof newDirs];

    if (oldVal !== newVal) {
      const fieldName = `directories.${key}`;
      if (!oldVal && newVal) {
        changes.push({ field: fieldName, type: 'added', newValue: `${newVal}/` });
      } else if (oldVal && !newVal) {
        changes.push({ field: fieldName, type: 'removed', oldValue: `${oldVal}/` });
      } else if (oldVal && newVal) {
        changes.push({ field: fieldName, type: 'changed', oldValue: `${oldVal}/`, newValue: `${newVal}/` });
      }
    }
  }

  // Compare dependencies
  const oldDeps = new Set(existing.dependencies || []);
  const newDeps = new Set(detected.dependencies || []);

  for (const dep of newDeps) {
    if (!oldDeps.has(dep)) {
      changes.push({ field: 'dependency', type: 'added', newValue: dep });
    }
  }

  for (const dep of oldDeps) {
    if (!newDeps.has(dep)) {
      changes.push({ field: 'dependency', type: 'removed', oldValue: dep });
    }
  }

  return changes;
}

function displayChanges(changes: ContextChange[]): void {
  console.log(chalk.cyan('\nDetected updates:\n'));

  for (const change of changes) {
    if (change.type === 'added') {
      console.log(chalk.green(`  + ${change.field}: ${change.newValue}`));
    } else if (change.type === 'removed') {
      console.log(chalk.red(`  - ${change.field}: ${change.oldValue}`));
    } else {
      console.log(chalk.yellow(`  ~ ${change.field}: ${change.oldValue} → ${change.newValue}`));
    }
  }

  console.log();
}

export async function initCommand(options: { force?: boolean }): Promise<void> {
  const existingContext = loadProjectContext();

  // If config exists and not forcing, check for changes
  if (existingContext && !options.force) {
    console.log(chalk.dim('\nProject config exists. Checking for changes...'));

    const detectedContext = await detectProjectContext();
    const changes = compareContexts(existingContext, detectedContext);

    if (changes.length === 0) {
      console.log(chalk.green('\n✓ Config is up to date.'));
      displayContext(existingContext);
      console.log(chalk.dim(`Config: ${getProjectConfigPath()}\n`));
      return;
    }

    displayChanges(changes);

    const shouldUpdate = await confirm({
      message: 'Update config?',
      default: true,
    });

    if (shouldUpdate) {
      saveProjectContext(detectedContext);
      console.log(chalk.green(`\n✓ Updated ${getProjectConfigPath()}\n`));
    } else {
      console.log(chalk.dim('\nConfig unchanged.\n'));
    }
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
