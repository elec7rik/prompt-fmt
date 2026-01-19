export type Provider = 'openai' | 'anthropic' | 'google';

export type Verbosity = 'concise' | 'detailed';

export interface ProjectContext {
  language?: string;
  framework?: string;
  testRunner?: string;
  directories?: {
    source?: string;
    tests?: string;
    components?: string;
  };
  dependencies?: string[];
}

export interface Config {
  provider: Provider;
  verbosity: Verbosity;
  apiKeys?: {
    openai?: string;
    anthropic?: string;
    google?: string;
  };
}

export interface FormatOptions {
  provider?: Provider;
  apiKey?: string;
  detailed?: boolean;
  concise?: boolean;
  noCopy?: boolean;
}

export interface ProviderConfig {
  model: string;
  envVar: string;
}

export const PROVIDER_CONFIGS: Record<Provider, ProviderConfig> = {
  openai: {
    model: 'gpt-4o-mini',
    envVar: 'OPENAI_API_KEY',
  },
  anthropic: {
    model: 'claude-sonnet-4-20250514',
    envVar: 'ANTHROPIC_API_KEY',
  },
  google: {
    model: 'gemini-2.5-flash',
    envVar: 'GOOGLE_GENERATIVE_AI_API_KEY',
  },
};
