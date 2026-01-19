import Conf from 'conf';
import type { Config, Provider, Verbosity } from '../types.js';

const schema = {
  provider: {
    type: 'string' as const,
    default: 'anthropic',
  },
  verbosity: {
    type: 'string' as const,
    default: 'concise',
  },
};

const config = new Conf<Config>({
  projectName: 'prompt-formatter',
  schema,
});

export function getConfig(): Config {
  return {
    provider: config.get('provider') as Provider,
    verbosity: config.get('verbosity') as Verbosity,
  };
}

export function setProvider(provider: Provider): void {
  config.set('provider', provider);
}

export function setVerbosity(verbosity: Verbosity): void {
  config.set('verbosity', verbosity);
}

export function getConfigPath(): string {
  return config.path;
}
