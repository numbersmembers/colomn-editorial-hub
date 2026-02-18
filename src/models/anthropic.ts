import Anthropic from '@anthropic-ai/sdk';

import type { ModelCallOptions, ModelProviderInterface } from '@/types';

export class AnthropicProvider implements ModelProviderInterface {
  modelName: string;
  displayName: string;
  private client: Anthropic;

  constructor(modelName: string) {
    this.modelName = modelName;
    this.displayName = modelName;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
    this.client = new Anthropic({ apiKey });
  }

  async generate(prompt: string, options?: ModelCallOptions): Promise<string> {
    const response = await this.client.messages.create({
      model: this.modelName,
      max_tokens: 16384,
      system: options?.system || undefined,
      messages: [{ role: 'user', content: prompt }],
    });

    const block = response.content[0];
    if (block.type === 'text') {
      return block.text;
    }
    return '';
  }
}
