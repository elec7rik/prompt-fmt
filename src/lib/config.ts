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
  apiKeys: {
    type: 'object' as const,
    default: {},
    properties: {
      openai: { type: 'string' as const },
      anthropic: { type: 'string' as const },
      google: { type: 'string' as const },
    },
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

export function setApiKey(provider: Provider, key: string): void {
  const apiKeys = config.get('apiKeys') || {};
  config.set('apiKeys', { ...apiKeys, [provider]: key });
}

export function getStoredApiKey(provider: Provider): string | undefined {
  const apiKeys = config.get('apiKeys');
  return apiKeys?.[provider];
}

export function hasStoredApiKey(provider: Provider): boolean {
  return !!getStoredApiKey(provider);
}
