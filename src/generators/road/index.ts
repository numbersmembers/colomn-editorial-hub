import { createModel } from '@/models/factory';

import type { GeneratorInput, GeneratorOutput, StepLog, RevisionResult } from '@/types';

import type { ColumnGenerator, ProgressCallback } from '../types';
import { ROAD_CONFIG, ROAD_TUTOR_PROMPT } from './config';
import { convertStyle } from './steps/convertStyle';
import { reviseColumn } from './steps/reviseColumn';

const STEP_NAMES = [
  'convertStyle',
  'reviseColumn',
] as const;

export const roadGenerator: ColumnGenerator = {
  config: ROAD_CONFIG,

  async generate(input: GeneratorInput, onProgress?: ProgressCallback): Promise<GeneratorOutput> {
    const startTime = Date.now();
    const modelId = input.model || ROAD_CONFIG.defaultModel;
    const model = createModel(modelId);

    const sourceColumnBody = input.sourceColumnBody;
    if (!sourceColumnBody || sourceColumnBody.trim().length === 0) {
      throw new Error('Road 스타일 변환에는 원본 칼럼 텍스트가 필요합니다.');
    }

    const steps: StepLog[] = STEP_NAMES.map(name => ({
      name,
      status: 'pending' as const,
    }));

    function markStep(index: number, status: StepLog['status'], summary?: string) {
      steps[index] = { ...steps[index], status, summary };
      onProgress?.(steps.map(s => ({ ...s })));
    }

    // Step 0: Convert Style
    markStep(0, 'running');
    let draft: string;
    try {
      draft = await convertStyle(sourceColumnBody, model);
      markStep(0, 'done', '스타일 변환 완료');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      markStep(0, 'error', msg);
      throw e;
    }

    // Step 1: Revise Column (self-evaluation)
    markStep(1, 'running');
    let finalDraft: string;
    let evaluation: RevisionResult;
    try {
      const result = await reviseColumn(draft, model);
      finalDraft = result.finalDraft;
      evaluation = result.evaluation;
      markStep(1, 'done', `자기교정 ${evaluation.round}라운드 (${evaluation.score})`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      markStep(1, 'error', msg);
      throw e;
    }

    // Extract title from markdown
    const titleMatch = finalDraft.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : input.title;
    const body = finalDraft.replace(/^#\s+.+\n+/, '');

    return {
      title,
      body,
      metadata: {
        generatorId: 'road',
        charCount: body.length,
        model: model.displayName,
        steps,
        evaluation,
        duration: Date.now() - startTime,
      },
    };
  },

  getTutorSystemPrompt: () => ROAD_TUTOR_PROMPT,
};
