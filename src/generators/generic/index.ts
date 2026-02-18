import { createModel } from '@/models/factory';

import type { GeneratorInput, GeneratorOutput, GeneratorSettings } from '@/types';

import type { ColumnGenerator, ProgressCallback } from '../types';
import { GENERIC_CONFIG, STRUCTURE_MAP, GENERIC_TUTOR_PROMPT } from './config';

function buildSystemPrompt(settings: GeneratorSettings, researchContext?: string): string {
  const personaText = settings.persona || GENERIC_CONFIG.settings.persona!;
  const audienceText = settings.audience || GENERIC_CONFIG.settings.audience!;
  const structureKey = settings.structure || 'PREP';
  const structureText = STRUCTURE_MAP[structureKey] || STRUCTURE_MAP.PREP;
  const styleText = settings.style || GENERIC_CONFIG.settings.style!;
  const taboosText = (settings.taboos && settings.taboos.length > 0)
    ? settings.taboos.join(', ')
    : GENERIC_CONFIG.settings.taboos!.join(', ');

  return `You are an AI Editorial Assistant specializing in long-form analytical journalism.
Your task is to generate a comprehensive, in-depth 1st draft of a column based on the provided details.

**CRITICAL INSTRUCTION**:
- If real-time news context is provided below, YOU MUST USE THIS CONTEXT to ground your draft in reality.
- Cite specific facts, numbers, or events from the context if relevant.

${researchContext ? `[Background Context]\n${researchContext}` : ''}

[Output Requirements]
- Generate a LONG-FORM article (minimum 2000-3000 characters in Korean)
- Structure like a professional analytical report or feature article
- Include multiple perspectives: economic, social, political, ethical viewpoints
- Provide concrete examples, data points, and real-world cases where relevant
- Include counter-arguments and alternative viewpoints

[Constraints]
- Persona & Perspective: ${personaText}
- Audience: ${audienceText}
- Logical Structure: ${structureText}
- Style Guide: ${styleText}
- Taboos (Strictly avoid): ${taboosText}

[Format]
- Title: A compelling, thought-provoking headline
- Body: Structured with clear sections:
  1. 리드(Lead): Hook the reader with a compelling opening
  2. 본론(Body): In-depth analysis with multiple angles
  3. 반론/대안적 시각(Counter): Present opposing viewpoints fairly
  4. 결론(Conclusion): Synthesize insights without being preachy

Speak in professional Korean.
**Style**: Use a plain journalistic tone (평어체, ~한다, ~했다). Do not use honorifics (~습니다).`;
}

export const genericGenerator: ColumnGenerator = {
  config: GENERIC_CONFIG,

  async generate(input: GeneratorInput, _onProgress?: ProgressCallback): Promise<GeneratorOutput> {
    const startTime = Date.now();
    const modelId = input.model || this.config.defaultModel;
    const model = createModel(modelId);
    const settings = { ...this.config.settings, ...input.settings };

    const systemPrompt = buildSystemPrompt(settings, input.researchContext);

    // Build user prompt including sources if available
    let userPrompt = `Headline suggestion: ${input.title}\nCore Idea: ${input.idea}`;

    if (input.sources && input.sources.length > 0) {
      const validSources = input.sources
        .filter(s => s && !s.startsWith('[기사 로드 실패'))
        .map((s, i) => `=== 참고 기사 ${i + 1} ===\n${s}`)
        .join('\n\n');
      if (validSources) {
        userPrompt += `\n\n[Reference Articles - 반드시 이 기사 내용을 참고하여 칼럼을 작성하라]\n${validSources}`;
      }
    }

    const response = await model.generate(userPrompt, {
      system: systemPrompt,
      responseFormat: 'json',
      jsonSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          body: { type: 'string' },
        },
        required: ['title', 'body'],
      },
    });

    const result = JSON.parse(response) as { title: string; body: string };

    return {
      title: result.title,
      body: result.body,
      metadata: {
        generatorId: 'generic',
        charCount: result.body.length,
        model: model.displayName,
        duration: Date.now() - startTime,
      },
    };
  },

  getTutorSystemPrompt: () => GENERIC_TUTOR_PROMPT,
};
