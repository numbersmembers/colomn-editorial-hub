import OpenAI from 'openai';

import type { ModelCallOptions, ModelProviderInterface } from '@/types';

export class OpenAIProvider implements ModelProviderInterface {
  modelName: string;
  displayName: string;
  private client: OpenAI;

  constructor(modelName: string) {
    this.modelName = modelName;
    this.displayName = modelName;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
    this.client = new OpenAI({ apiKey });
  }

  async generate(prompt: string, options?: ModelCallOptions): Promise<string> {
    const messages: OpenAI.ChatCompletionMessageParam[] = [];
    if (options?.system) {
      messages.push({ role: 'system', content: options.system });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await this.client.chat.completions.create({
      model: this.modelName,
      messages,
      max_tokens: 16384,
      ...(options?.responseFormat === 'json' && {
        response_format: { type: 'json_object' },
      }),
    });

    return response.choices[0]?.message?.content || '';
  }
}
