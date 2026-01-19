import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { Provider, PROVIDER_CONFIGS } from '../types.js';
import { getSystemPrompt } from '../lib/prompts.js';

export function hasApiKey(provider: Provider): boolean {
  const envVar = PROVIDER_CONFIGS[provider].envVar;
  return !!process.env[envVar];
}

export function getApiKey(provider: Provider): string {
  const envVar = PROVIDER_CONFIGS[provider].envVar;
  const key = process.env[envVar];

  if (!key) {
    throw new Error(
      `API key not found. Set ${envVar} environment variable or use --api-key flag.`
    );
  }

  return key;
}

function getModel(provider: Provider, apiKey: string) {
  const modelName = PROVIDER_CONFIGS[provider].model;

  switch (provider) {
    case 'openai': {
      const openai = createOpenAI({ apiKey });
      return openai(modelName);
    }
    case 'anthropic': {
      const anthropic = createAnthropic({ apiKey });
      return anthropic(modelName);
    }
    case 'google': {
      const google = createGoogleGenerativeAI({ apiKey });
      return google(modelName);
    }
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export async function formatPrompt(
  input: string,
  provider: Provider,
  apiKey: string,
  detailed: boolean,
  projectContext?: string
): Promise<string> {
  const model = getModel(provider, apiKey);
  const systemPrompt = getSystemPrompt(detailed, projectContext);

  const { text } = await generateText({
    model,
    system: systemPrompt,
    prompt: input,
  });

  return text;
}
