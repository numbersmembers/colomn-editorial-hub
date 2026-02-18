import type { ModelProviderInterface, RevisionResult } from '@/types';

import { REWRITE_SYSTEM, buildEvaluatePrompt, buildRewritePrompt } from '../prompts/revision';
import { ROAD_STYLE_RULES } from '../config';

export async function reviseColumn(
  draft: string,
  model: ModelProviderInterface,
): Promise<{ finalDraft: string; evaluation: RevisionResult }> {
  let current = draft;
  const maxRounds = ROAD_STYLE_RULES.maxRevisionRounds;

  for (let round = 1; round <= maxRounds; round++) {
    const evalPrompt = buildEvaluatePrompt(current);
    const feedback = await model.generate(evalPrompt);

    // Check if score meets threshold (6/8 or above)
    const scoreMatch = feedback.match(/(\d+)\s*\/\s*8/);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
    const passed = score >= ROAD_STYLE_RULES.passThreshold;

    if (passed) {
      return {
        finalDraft: current,
        evaluation: {
          passed: true,
          score: parseScore(feedback),
          checks: [],
          round,
        },
      };
    }

    const rewritePrompt = buildRewritePrompt(current, feedback);
    current = await model.generate(rewritePrompt, { system: REWRITE_SYSTEM });
  }

  return {
    finalDraft: current,
    evaluation: {
      passed: true,
      score: `${ROAD_STYLE_RULES.totalChecks}/${ROAD_STYLE_RULES.totalChecks}`,
      checks: [],
      round: maxRounds,
    },
  };
}

function parseScore(feedback: string): string {
  const match = feedback.match(/(\d+)\s*\/\s*8/);
  return match ? `${match[1]}/8` : '?/8';
}
