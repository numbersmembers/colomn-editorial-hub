import type { ReactNode } from 'react';

import type { GeneratorConfig, GeneratorInput, GeneratorOutput, StepLog } from '@/types';

export type ProgressCallback = (steps: StepLog[]) => void;

export type ColumnGenerator = {
  config: GeneratorConfig;
  generate: (input: GeneratorInput, onProgress?: ProgressCallback) => Promise<GeneratorOutput>;
  getSettingsUI?: () => ReactNode;
  getTutorSystemPrompt?: () => string;
}
