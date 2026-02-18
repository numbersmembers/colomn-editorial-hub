import { WRITING_SYSTEM } from '../prompts/writing';
import { buildStyleConversionPrompt } from '../prompts/styleConversion';

import type { ModelProviderInterface } from '@/types';

export async function convertStyle(
  sourceColumnBody: string,
  model: ModelProviderInterface,
): Promise<string> {
  const prompt = buildStyleConversionPrompt(sourceColumnBody);
  return model.generate(prompt, { system: WRITING_SYSTEM });
}
