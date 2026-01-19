import { generateText, APICallError } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { Provider, PROVIDER_CONFIGS } from '../types.js';
import { getSystemPrompt } from '../lib/prompts.js';
import { getStoredApiKey, hasStoredApiKey } from '../lib/config.js';

export class ApiKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiKeyError';
  }
}

function isAuthRelatedMessage(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return lowerMessage.includes('api key') ||
         lowerMessage.includes('invalid key') ||
         lowerMessage.includes('unauthorized') ||
         lowerMessage.includes('authentication') ||
         lowerMessage.includes('api_key');
}

function getFriendlyErrorMessage(error: unknown, provider: Provider): { message: string; isAuthError: boolean } {
  // Handle API errors from the AI SDK
  if (error instanceof APICallError) {
    const status = error.statusCode;

    if (status === 401 || status === 403) {
      return { message: `Invalid API key for ${provider}.`, isAuthError: true };
    }

    // Check error message for auth-related content (some providers use different status codes)
    if (error.message && isAuthRelatedMessage(error.message)) {
      return { message: `Invalid API key for ${provider}.`, isAuthError: true };
    }

    if (status === 429) {
      return { message: 'Rate limited. Wait a moment and try again.', isAuthError: false };
    }

    if (status === 500 || status === 502 || status === 503) {
      return { message: `${provider} service is temporarily unavailable. Try again later.`, isAuthError: false };
    }

    // Return the API error message if available
    if (error.message) {
      return { message: error.message, isAuthError: false };
    }
  }

  // Handle other errors
  if (error instanceof Error) {
    // Check for auth-related error messages (covers various provider error formats)
    if (isAuthRelatedMessage(error.message)) {
      return { message: `Invalid API key for ${provider}.`, isAuthError: true };
    }

    const message = error.message.toLowerCase();

    if (message.includes('fetch failed') || message.includes('network') || message.includes('econnrefused')) {
      return { message: 'Network error. Check your internet connection.', isAuthError: false };
    }

    if (message.includes('timeout') || message.includes('timed out')) {
      return { message: 'Request timed out. Try again.', isAuthError: false };
    }

    return { message: error.message, isAuthError: false };
  }

  return { message: 'An unexpected error occurred.', isAuthError: false };
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

export async function validateApiKey(provider: Provider, apiKey: string): Promise<void> {
  const model = getModel(provider, apiKey);

  try {
    // Make a minimal API call to validate the key
    await generateText({
      model,
      prompt: 'hi',
      maxTokens: 1,
    });
  } catch (error) {
    const { message, isAuthError } = getFriendlyErrorMessage(error, provider);
    if (isAuthError) {
      throw new ApiKeyError(message);
    }
    throw new Error(message);
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
    const { message, isAuthError } = getFriendlyErrorMessage(error, provider);
    if (isAuthError) {
      throw new ApiKeyError(message);
    }
    throw new Error(message);
  }
}
