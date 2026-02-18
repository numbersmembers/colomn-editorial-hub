// === Generator Types ===

export type GeneratorId = 'road' | 'generic' | (string & {});

export type GeneratorConfig = {
  id: GeneratorId;
  name: string;
  description: string;
  defaultModel: ModelId;
  supportedModels: ModelId[];
  settings: GeneratorSettings;
}

export type GeneratorSettings = {
  persona?: string;
  audience?: string;
  structure?: 'PREP' | 'NARRATIVE' | 'HEGELIAN';
  style?: string;
  taboos?: string[];
  [key: string]: unknown;
}

export type GeneratorInput = {
  title: string;
  idea: string;
  sources?: string[];
  researchContext?: string;
  model?: ModelId;
  settings?: GeneratorSettings;
  sourceColumnBody?: string;
}

export type GeneratorOutput = {
  title: string;
  body: string;
  metadata: {
    generatorId: GeneratorId;
    charCount: number;
    model: string;
    steps?: StepLog[];
    evaluation?: RevisionResult;
    duration?: number;
  }
}

export type StepLog = {
  name: string;
  status: 'pending' | 'running' | 'done' | 'error';
  duration?: number;
  summary?: string;
}

// === Road Revision Types ===

export type RevisionResult = {
  passed: boolean;
  score: string;
  checks: RevisionCheck[];
  round: number;
}

export type RevisionCheck = {
  item: string;
  result: 'PASS' | 'FAIL';
  note?: string;
}

// === Model Types ===

export type ModelId = string;

export type ModelCallOptions = {
  system?: string;
  responseFormat?: 'text' | 'json';
  jsonSchema?: Record<string, unknown>;
}

export type ModelProviderInterface = {
  modelName: string;
  displayName: string;
  generate: (prompt: string, options?: ModelCallOptions) => Promise<string>;
}

export type ModelProviderInfo = {
  id: string;
  name: string;
  models: { id: ModelId; name: string }[];
}

// === Workspace Types ===

export type DraftData = {
  title: string;
  body: string;
}

export type ResearchItem = {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
}

export type FactSheet = {
  keyFacts: string[];
  timeline: { date: string; event: string }[];
  quotes: { text: string; source: string }[];
}

export type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export type DisplayNewsItem = {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
}

export type SearchResultCategory = {
  label: string;
  keywords?: string;
  type: string;
  items: DisplayNewsItem[];
}

// === Action Result ===

export type ActionResult<T> = { data: T } | { error: string };
