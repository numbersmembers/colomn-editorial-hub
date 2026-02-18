import type { ModelId, ModelProviderInterface } from '@/types';

import { GeminiProvider } from './gemini';
import { AnthropicProvider } from './anthropic';
import { OpenAIProvider } from './openai';

export function createModel(modelId: ModelId): ModelProviderInterface {
  if (modelId.startsWith('gemini')) {
    return new GeminiProvider(modelId);
  }
  if (modelId.startsWith('claude')) {
    return new AnthropicProvider(modelId);
  }
  if (modelId.startsWith('gpt')) {
    return new OpenAIProvider(modelId);
  }
  throw new Error(`Unknown model: ${modelId}. Use gemini-*, claude-*, or gpt-*`);
}
