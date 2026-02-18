import type { GeneratorConfig, GeneratorId } from '@/types';

import type { ColumnGenerator } from './types';

const generators = new Map<GeneratorId, ColumnGenerator>();

export function registerGenerator(generator: ColumnGenerator): void {
  generators.set(generator.config.id, generator);
}

export function getGenerator(id: GeneratorId): ColumnGenerator | undefined {
  return generators.get(id);
}

export function listGenerators(): GeneratorConfig[] {
  return Array.from(generators.values()).map(g => g.config);
}

export function getDefaultGeneratorId(): GeneratorId {
  const first = generators.keys().next();
  return first.value ?? 'generic';
}
