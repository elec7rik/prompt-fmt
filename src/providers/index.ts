import { generateText, APICallError } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { Provider, PROVIDER_CONFIGS } from '../types.js';
import { getSystemPrompt } from '../lib/prompts.js';
import { getStoredApiKey, hasStoredApiKey } from '../lib/config.js';

function getFriendlyErrorMessage(error: unknown, provider: Provider): string {
  const envVar = PROVIDER_CONFIGS[provider].envVar;

  // Handle API errors from the AI SDK
  if (error instanceof APICallError) {
    const status = error.statusCode;

    if (status === 401 || status === 403) {
      return `Invalid API key for ${provider}. Check your ${envVar}.`;
    }

    if (status === 429) {
      return 'Rate limited. Wait a moment and try again.';
    }

    if (status === 500 || status === 502 || status === 503) {
      return `${provider} service is temporarily unavailable. Try again later.`;
    }

    // Return the API error message if available
    if (error.message) {
      return error.message;
    }
  }

  // Handle network errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('fetch failed') || message.includes('network') || message.includes('econnrefused')) {
      return 'Network error. Check your internet connection.';
    }

    if (message.includes('timeout') || message.includes('timed out')) {
      return 'Request timed out. Try again.';
    }

    return error.message;
  }

  return 'An unexpected error occurred.';
}

export function hasApiKey(provider: Provider): boolean {
  // Check stored config first, then environment variable
  if (hasStoredApiKey(provider)) {
    return true;
  }
  const envVar = PROVIDER_CONFIGS[provider].envVar;
  return !!process.env[envVar];
}

export function getApiKey(provider: Provider): string {
  // Check stored config first
  const storedKey = getStoredApiKey(provider);
  if (storedKey) {
    return storedKey;
  }

  // Fall back to environment variable
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

  try {
    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: input,
    });

    return text;
  } catch (error) {
    throw new Error(getFriendlyErrorMessage(error, provider));
  }
}
