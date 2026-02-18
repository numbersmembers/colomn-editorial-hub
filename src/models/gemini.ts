import { GoogleGenAI } from '@google/genai';

import type { ModelCallOptions, ModelProviderInterface } from '@/types';

export class GeminiProvider implements ModelProviderInterface {
  modelName: string;
  displayName: string;
  private client: GoogleGenAI;

  constructor(modelName: string) {
    this.modelName = modelName;
    this.displayName = modelName;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
    this.client = new GoogleGenAI({ apiKey });
  }

  async generate(prompt: string, options?: ModelCallOptions): Promise<string> {
    const config: Record<string, unknown> = {
      maxOutputTokens: 16384,
    };
    if (options?.system) {
      config.systemInstruction = options.system;
    }
    if (options?.responseFormat === 'json') {
      config.responseMimeType = 'application/json';
      if (options.jsonSchema) {
        config.responseSchema = options.jsonSchema;
      }
    }

    const response = await this.client.models.generateContent({
      model: this.modelName,
      config,
      contents: prompt,
    });

    const candidate = response.candidates?.[0];
    if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
      console.warn(`[Gemini] finishReason: ${candidate.finishReason} (model: ${this.modelName})`);
    }

    return response.text || '';
  }
}
