# Column Editorial Hub 재구축 Design Document

> **Summary**: 복수 칼럼니스트 Generator를 지원하는 3패널 편집 플랫폼의 상세 설계
>
> **Project**: column-editorial-hub
> **Version**: 0.1.0
> **Author**: user
> **Date**: 2026-02-14
> **Status**: Draft
> **Planning Doc**: [hub-rebuild.plan.md](../../01-plan/features/hub-rebuild.plan.md)

### Pipeline References

| Phase | Document | Status |
|-------|----------|--------|
| Phase 1 | Schema Definition | N/A (localStorage, no DB) |
| Phase 2 | Coding Conventions | N/A (CLAUDE.md로 대체) |
| Phase 3 | Mockup | N/A (기존 Hub UI 참조) |
| Phase 4 | API Spec | N/A (Server Actions 사용) |

---

## 1. Overview

### 1.1 Design Goals

1. **Generator 확장성**: 새 칼럼니스트 추가 시 파일 1개 + registry 등록 1줄로 완료
2. **파이프라인 보존**: Road-Column Python 6단계 파이프라인의 품질을 TS 포팅 후에도 유지
3. **공통 인프라 공유**: Research/Editor/Tutor를 모든 Generator가 공유
4. **API 키 보호**: 모든 AI/외부 호출은 Server Actions를 통해 서버사이드 실행

### 1.2 Design Principles

- **Plugin Architecture**: Generator는 공통 인터페이스를 구현하는 독립 모듈
- **Provider Pattern**: AI 모델 호출을 추상화하여 Generator별 모델 선택 지원
- **Separation of Concerns**: UI(Presentation) / Generator(Application) / Model(Infrastructure) 분리
- **No Over-engineering**: 최소 인터페이스로 시작, 필요 시 확장

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                             │
│  ┌──────────────┐  ┌───────────────────┐  ┌─────────────────────┐  │
│  │  TutorPanel   │  │   EditorArea       │  │ ResearchDashboard   │  │
│  │  - Chat       │  │   - Title/Body     │  │ - Search            │  │
│  │  - Settings   │  │   - CharCounter    │  │ - Saved             │  │
│  │  - Generator  │  │   - AutoSave       │  │ - FactSheet         │  │
│  │    Selector   │  │   - Export         │  │ - Sage (표시만)      │  │
│  └──────┬───────┘  └────────┬──────────┘  └──────────┬──────────┘  │
│         │                   │                         │             │
│  ┌──────┴───────────────────┴─────────────────────────┴──────────┐  │
│  │              WorkspaceContext (React Context)                   │  │
│  │  - draft, savedResearch, factSheet, selectedGenerator          │  │
│  │  - isGenerating, generatorProgress (step tracking)             │  │
│  └────────────────────────────┬───────────────────────────────────┘  │
└───────────────────────────────┼──────────────────────────────────────┘
                                │ Server Actions
                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│                         Server (Node.js)                              │
│                                                                       │
│  ┌─────────────────────────────────────────┐                          │
│  │          Server Actions (actions.ts)     │                          │
│  │  - generateColumnAction()               │                          │
│  │  - searchNewsAction()                   │                          │
│  │  - verifyFactAction()                   │                          │
│  │  - tutorChatAction()                    │                          │
│  └──────────┬──────────────────────────────┘                          │
│             │                                                         │
│  ┌──────────▼──────────────────────────────┐                          │
│  │       Generator Registry                 │                          │
│  │  ┌─────────┐  ┌───────────┐  ┌───────┐ │                          │
│  │  │  Road    │  │  Generic   │  │ ...   │ │                          │
│  │  │ 6-step  │  │  persona   │  │       │ │                          │
│  │  │ pipeline│  │  based     │  │       │ │                          │
│  │  └────┬────┘  └─────┬─────┘  └───────┘ │                          │
│  └───────┼─────────────┼───────────────────┘                          │
│          │             │                                              │
│  ┌───────▼─────────────▼───────────────────┐                          │
│  │       Model Provider Factory             │                          │
│  │  ┌────────┐ ┌──────────┐ ┌────────────┐ │                          │
│  │  │ Gemini │ │ Anthropic│ │   OpenAI   │ │                          │
│  │  └────────┘ └──────────┘ └────────────┘ │                          │
│  └─────────────────────────────────────────┘                          │
│                                                                       │
│  ┌─────────────────────────────────────────┐                          │
│  │       Research Agents                    │                          │
│  │  KoreanSearcher │ QueryRefiner │ FactCheck│                         │
│  └─────────────────────────────────────────┘                          │
└───────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

#### 칼럼 생성 플로우

```
User selects Generator → Inputs title/idea
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        Research Context  FactSheet     Tutor Feedback
        (saved articles)  (key facts)   (chat history)
              │               │               │
              └───────┬───────┘               │
                      ▼                       │
         generateColumnAction(               │
           generatorId, input, context)      │
                      │                       │
                      ▼                       │
              Generator.generate()            │
                      │                       │
          ┌───────────┼──────────┐            │
          ▼           ▼          ▼            │
       [Road]     [Generic]   [Future]        │
       6-step     single AI   ...             │
       pipeline   call                        │
          │           │                       │
          ▼           ▼                       │
         GeneratorOutput                      │
         { title, body, metadata }            │
                      │                       │
                      ▼                       │
              EditorArea에 표시               │
              (draft update)                  │
                      │                       │
                      ▼                       ▼
              Tutor에서 피드백 가능 (draft context 전달)
```

#### Road Generator 내부 파이프라인

```
GeneratorInput
    │
    ▼
Step 1: extractFacts(sources)
    │  → Facts { who/what/when/where/why/how, key_numbers, causation }
    ▼
Step 2: buildContext(facts)
    │  → Context { historical, similar_cases, structural, underrated }
    ▼
Step 3: editorialJudgment(facts, context)
    │  → Editorial { core_tension, so_what, discard_list, imply_list }
    ▼
Step 4: writeColumn(facts, context, editorial)
    │  → draft (1200-2000자, Road 문체)
    ▼
Step 5: reviseColumn(draft)  ← 8항목 체크리스트, max 2 rounds
    │  → final column + evaluation
    ▼
GeneratorOutput
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| TutorPanel | WorkspaceContext, Server Actions | AI 대화, Generator 설정 |
| EditorArea | WorkspaceContext | 초안 편집, 글자수 카운터 |
| ResearchDashboard | WorkspaceContext, Server Actions | 뉴스 검색, 팩트체크 |
| Generator Registry | Model Provider Factory | AI 모델 호출 |
| Road Generator | Generator Registry, Model Provider | 6단계 파이프라인 실행 |
| Generic Generator | Generator Registry, Model Provider | 단일 AI 호출 생성 |
| Model Provider Factory | Gemini/Anthropic/OpenAI SDK | 모델별 API 호출 |
| Research Agents | Naver API, Model Provider | 뉴스 검색, 쿼리 정제 |

---

## 3. Data Model

### 3.1 Core Types (Domain Layer)

```typescript
// src/types/index.ts

// === Generator Types ===

type GeneratorId = 'road' | 'generic' | string;

type GeneratorConfig = {
  id: GeneratorId;
  name: string;                    // 'Road(길진홍)' | '범용 칼럼'
  description: string;
  defaultModel: ModelId;
  supportedModels: ModelId[];
  settings: GeneratorSettings;
}

type GeneratorSettings = {
  // Generic: persona, structure, style, taboos
  persona?: string;
  audience?: string;
  structure?: 'PREP' | 'NARRATIVE' | 'HEGELIAN';
  style?: string;
  taboos?: string[];
  // Road: 고정 (config.ts에서 하드코딩)
  // 확장: Generator별 커스텀 필드
  [key: string]: unknown;
}

type GeneratorInput = {
  title: string;
  idea: string;
  sources?: string[];
  researchContext?: string;        // Research Dashboard에서 주입
  model?: ModelId;
  settings?: GeneratorSettings;    // TutorPanel에서 오버라이드
}

type GeneratorOutput = {
  title: string;
  body: string;
  metadata: {
    generatorId: GeneratorId;
    charCount: number;
    model: string;
    steps?: StepLog[];             // Road: 각 단계 로그
    evaluation?: RevisionResult;   // Road: 자기교정 결과
    duration?: number;             // ms
  }
}

type StepLog = {
  name: string;                    // 'extractFacts' | 'buildContext' | ...
  status: 'pending' | 'running' | 'done' | 'error';
  duration?: number;
  summary?: string;                // 요약 (UI 표시용)
}

// === Road Pipeline Types (Python types.py 포팅) ===

type SourceType = 'url' | 'file' | 'text';
type SourceRole = 'F' | 'A' | 'B' | 'F+A' | 'A+B' | 'F+B';

type ArticleSource = {
  type: SourceType;
  raw: string;
  content: string;
  title: string;
}

type SourceMap = {
  sourceCount: number;
  sources: ArticleSource[];
  roles: Record<number, SourceRole>;
  overlaps: string[];
  conflicts: string[];
  mergedContent: string;
}

type Facts = {
  whoWhatWhenWhereWhyHow: string;
  keyNumbers: string;
  peopleAndEntities: string;
  causation: string;
  sourcesInfo: string;
  raw: string;
}

type RoadContext = {
  historical: string;
  similarCases: string;
  structural: string;
  readerKnowledge: string;
  underrated: string;
  searchSupplement: string;
  raw: string;
}

type Editorial = {
  coreTension: string;
  soWhat: string;
  discardList: string;
  implyList: string;
  raw: string;
}

type RevisionResult = {
  passed: boolean;
  score: string;                   // '7/8'
  checks: RevisionCheck[];
  round: number;
}

type RevisionCheck = {
  item: string;
  result: 'PASS' | 'FAIL';
  note?: string;
}

// === Model Types ===

type ModelId = string;             // 'gemini-2.0-flash' | 'claude-sonnet-4-5-20250929' | 'gpt-4o'

type ModelProvider = {
  id: string;                      // 'gemini' | 'anthropic' | 'openai'
  name: string;
  models: { id: ModelId; name: string }[];
}

// === Workspace Types (기존 Hub 이관) ===

type DraftData = {
  title: string;
  body: string;
}

type ResearchItem = {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
}

type FactSheet = {
  keyFacts: string[];
  timeline: { date: string; event: string }[];
  quotes: { text: string; source: string }[];
}

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

type DisplayNewsItem = {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
}

type SearchResultCategory = {
  label: string;
  keywords?: string;
  type: string;
  items: DisplayNewsItem[];
}
```

### 3.2 Entity Relationships

```
[GeneratorRegistry] 1 ──── N [ColumnGenerator]
                                    │
                                    ├── config: GeneratorConfig
                                    ├── generate(): GeneratorOutput
                                    └── getSettingsUI?(): ReactNode

[ColumnGenerator] N ──── 1 [ModelProviderFactory]
                              │
                              ├── createModel(id): ModelProvider
                              └── listModels(): ModelProvider[]

[WorkspaceContext] 1 ──── 1 [DraftData]
                   1 ──── N [ResearchItem]
                   1 ──── 1 [FactSheet]
                   1 ──── 1 [SelectedGenerator]
                   1 ──── N [StepLog]  (Road 진행 상태)
```

### 3.3 Storage (localStorage)

```typescript
// localStorage key: 'column-editorial-hub-workspace'
type PersistedState = {
  draft: DraftData;
  savedResearch: ResearchItem[];
  factSheet: FactSheet;
  selectedGeneratorId: GeneratorId;
  generatorSettings: Record<GeneratorId, GeneratorSettings>;
  // Road: settings는 config.ts 고정이므로 저장 불필요
  // Generic: persona, structure, style, taboos 저장
}
```

---

## 4. Server Actions Specification

### 4.1 Action List

| Action | Parameters | Returns | Auth |
|--------|-----------|---------|------|
| `generateColumnAction` | generatorId, input | `{data: GeneratorOutput} \| {error: string}` | N/A |
| `searchNewsAction` | query, useRefiner? | `{data: SearchResultCategory[]} \| {error: string}` | N/A |
| `verifyFactAction` | statement | `{data: FactCheckResult} \| {error: string}` | N/A |
| `tutorChatAction` | messages, generatorId?, draftContext? | `{data: string} \| {error: string}` | N/A |
| `exportColumnAction` | draft, format | `{data: string}` (HTML/MD content) | N/A |

### 4.2 Detailed Specification

#### `generateColumnAction` (핵심)

```typescript
// src/app/actions.ts
'use server'

async function generateColumnAction(
  generatorId: GeneratorId,
  input: GeneratorInput
): Promise<{ data: GeneratorOutput } | { error: string }> {
  try {
    const generator = getGenerator(generatorId);
    if (!generator) {
      return { error: `Unknown generator: ${generatorId}` };
    }
    const output = await generator.generate(input);
    return { data: output };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { error: `칼럼 생성 실패: ${message}` };
  }
}
```

#### `tutorChatAction` (확장: draft context + generator-aware)

```typescript
async function tutorChatAction(
  messages: Message[],
  generatorId?: GeneratorId,
  draftContext?: DraftData
): Promise<{ data: string } | { error: string }> {
  // generatorId에 따라 시스템 프롬프트 분기
  // Road: Road 문체 규칙 기반 피드백
  // Generic: 범용 편집 피드백
  // draftContext가 있으면 현재 초안 기반 구체적 조언
}
```

#### `searchNewsAction` (기존 Hub 이관)

```typescript
async function searchNewsAction(
  query: string,
  useRefiner: boolean = true
): Promise<{ data: SearchResultCategory[], queryMetadata: RefinedQuery | null } | { error: string }>
// 기존 actions.ts 로직 그대로 이관
// QueryRefiner → cluster/counter 분류 검색
```

#### `verifyFactAction` (기존 Hub 이관)

```typescript
async function verifyFactAction(
  statement: string
): Promise<{ data: FactCheckResult } | { error: string }>
// 기존 FactCheckEngine 로직 이관
```

### 4.3 Error Response Format

```typescript
// 모든 Server Action 공통 패턴
type ActionResult<T> = { data: T } | { error: string };
```

---

## 5. UI/UX Design

### 5.1 Screen Layout (3-Panel Workspace)

```
┌────────────────────────────────────────────────────────────────────┐
│  Column Editorial Hub          [Generator: ▼ Road(길진홍)]  [Export]│
├───────────────┬──────────────────────────┬─────────────────────────┤
│               │                          │                         │
│  TUTOR        │  EDITOR                  │  RESEARCH               │
│  ─────────    │  ──────                  │  ────────               │
│               │                          │                         │
│  [Setup│Chat] │  Title: [____________]   │  [Search│Saved│Fact]    │
│               │                          │                         │
│  Setup:       │  Body:                   │  Search:                │
│  Generator별  │  ┌──────────────────┐    │  [검색어 입력____] [Go] │
│  설정 표시    │  │                  │    │  ┌──────────────────┐   │
│  (Road: 읽기  │  │  칼럼 본문       │    │  │ 뉴스 결과 목록   │   │
│   전용 규칙)  │  │                  │    │  │ - 클러스터 분류  │   │
│  (Generic:    │  │                  │    │  │ - 반론 검색      │   │
│   편집 가능)  │  │                  │    │  └──────────────────┘   │
│               │  │                  │    │                         │
│  Chat:        │  └──────────────────┘    │  Saved:                 │
│  AI Tutor     │                          │  저장된 기사 목록       │
│  대화 영역    │  ──────────────────────   │                         │
│               │  1,234자 │ 자동저장 ✓    │  FactSheet:             │
│  [입력____]   │                          │  핵심 팩트/타임라인     │
│  [Send]       │  [Generate Draft]        │                         │
│               │                          │                         │
├───────────────┤                          │                         │
│  Progress:    │                          │                         │
│  ■■■□□□ 3/6  │                          │                         │
│  editJudgment │                          │                         │
└───────────────┴──────────────────────────┴─────────────────────────┘
```

### 5.2 Generator Selector

```
┌───────────────────────────────────┐
│  Generator: [▼]                   │
│  ┌───────────────────────────────┐│
│  │ ★ Road(길진홍)                ││
│  │   6단계 파이프라인, 압축 문체 ││
│  ├───────────────────────────────┤│
│  │   범용 칼럼                   ││
│  │   persona/구조 커스텀 생성    ││
│  └───────────────────────────────┘│
└───────────────────────────────────┘
```

### 5.3 Generator별 TutorPanel 분기

**Road Generator 선택 시:**
- Setup 탭: Road 문체 규칙 표시 (읽기 전용)
  - 분량: 1200-2000자
  - 문체: 평어체(~다, ~했다)
  - 압축 기법: 동격/함의/시간/인과
  - 어휘 목록: 자못, 적잖은, 곱씹어 볼 필요가 있다...
- Chat 탭: Road 특화 튜터 (문체 준수 피드백)
- Progress: 6단계 파이프라인 진행 표시

**Generic Generator 선택 시:**
- Setup 탭: 편집 가능 설정 폼
  - Persona (textarea)
  - Audience (textarea)
  - Structure (PREP/NARRATIVE/HEGELIAN 드롭다운)
  - Style (textarea)
  - Taboos (태그 입력)
- Chat 탭: 범용 편집 튜터
- Progress: 단일 단계 (생성 중...)

### 5.4 User Flow

```
1. Generator 선택 (드롭다운)
    │
    ├──→ Road 선택 시: Setup 탭에 규칙 표시 (읽기 전용)
    │    └──→ Research에서 기사 검색/저장
    │         └──→ "Generate Draft" 클릭
    │              └──→ 6단계 진행 표시 (TutorPanel 하단)
    │                   └──→ Editor에 결과 표시 + 자기교정 로그
    │
    └──→ Generic 선택 시: Setup 탭에서 설정 편집
         └──→ Research에서 기사 검색/저장
              └──→ "Generate Draft" 클릭
                   └──→ 생성 중 스피너
                        └──→ Editor에 결과 표시
```

### 5.5 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `WorkspaceLayout` | `src/app/editor/page.tsx` | 3패널 레이아웃 컨테이너 |
| `WorkspaceProvider` | `src/app/editor/WorkspaceContext.tsx` | 전역 상태 (draft, research, generator) |
| `GeneratorSelector` | `src/app/editor/GeneratorSelector.tsx` | Generator 드롭다운 선택 |
| `TutorPanel` | `src/app/editor/TutorPanel.tsx` | Setup + Chat 탭 |
| `TutorSetup` | `src/app/editor/TutorSetup.tsx` | Generator별 설정 표시/편집 |
| `TutorChat` | `src/app/editor/TutorChat.tsx` | AI Tutor 대화 |
| `PipelineProgress` | `src/app/editor/PipelineProgress.tsx` | Road 6단계 진행 표시 |
| `EditorArea` | `src/app/editor/EditorArea.tsx` | Title/Body 편집기 |
| `CharCounter` | `src/app/editor/CharCounter.tsx` | 실시간 글자수 |
| `ResearchDashboard` | `src/app/editor/ResearchDashboard.tsx` | Search/Saved/Fact 탭 |
| `ExportButton` | `src/app/editor/ExportButton.tsx` | HTML/MD 내보내기 |

---

## 6. Generator Interface Design (핵심)

### 6.1 ColumnGenerator Interface

```typescript
// src/generators/types.ts

type ColumnGenerator = {
  config: GeneratorConfig;
  generate: (input: GeneratorInput) => Promise<GeneratorOutput>;
  getSettingsUI?: () => React.ReactNode;
  getTutorSystemPrompt?: () => string;
}
```

### 6.2 Generator Registry

```typescript
// src/generators/registry.ts

const generators = new Map<GeneratorId, ColumnGenerator>();

function registerGenerator(generator: ColumnGenerator): void {
  generators.set(generator.config.id, generator);
}

function getGenerator(id: GeneratorId): ColumnGenerator | undefined {
  return generators.get(id);
}

function listGenerators(): GeneratorConfig[] {
  return Array.from(generators.values()).map(g => g.config);
}

// 초기 등록
registerGenerator(roadGenerator);
registerGenerator(genericGenerator);
```

### 6.3 Road Generator 구현

```typescript
// src/generators/road/index.ts

const roadGenerator: ColumnGenerator = {
  config: {
    id: 'road',
    name: 'Road(길진홍)',
    description: '6단계 파이프라인, 압축 문체, 1200-2000자',
    defaultModel: 'gemini-2.0-flash',
    supportedModels: ['gemini-2.0-flash', 'gemini-2.5-flash', 'claude-sonnet-4-5-20250929', 'gpt-4o'],
    settings: {},  // Road는 고정 설정
  },

  async generate(input: GeneratorInput): Promise<GeneratorOutput> {
    const model = createModel(input.model || this.config.defaultModel);

    // Step 1: 사실 추출
    const facts = await extractFacts(input, model);

    // Step 2: 맥락 구축
    const context = await buildContext(facts, model);

    // Step 3: 편집 판단
    const editorial = await editorialJudgment(facts, context, model);

    // Step 4: 집필
    const draft = await writeColumn(facts, context, editorial, model);

    // Step 5: 자기교정 (max 2 rounds)
    const { finalDraft, evaluation } = await reviseColumn(draft, model);

    return {
      title: input.title,
      body: finalDraft,
      metadata: {
        generatorId: 'road',
        charCount: finalDraft.length,
        model: model.displayName,
        steps: [...stepLogs],
        evaluation,
      }
    };
  },

  // Road Setup은 읽기 전용
  getSettingsUI: () => <RoadSettingsDisplay />,

  // Road 특화 튜터 프롬프트
  getTutorSystemPrompt: () => ROAD_TUTOR_PROMPT,
};
```

### 6.4 Generic Generator 구현

```typescript
// src/generators/generic/index.ts

const genericGenerator: ColumnGenerator = {
  config: {
    id: 'generic',
    name: '범용 칼럼',
    description: 'persona/구조/스타일 커스텀 칼럼 생성',
    defaultModel: 'gemini-2.5-flash',
    supportedModels: ['gemini-2.5-flash', 'claude-sonnet-4-5-20250929', 'gpt-4o'],
    settings: {
      persona: '비판적 현실주의자',
      audience: '기업 임직원, 기관 투자가',
      structure: 'PREP',
      style: '문장은 짧고 간결하게',
      taboos: ['교훈적 말투', '경어체', '쉼표 남발'],
    },
  },

  async generate(input: GeneratorInput): Promise<GeneratorOutput> {
    const model = createModel(input.model || this.config.defaultModel);
    const settings = { ...this.config.settings, ...input.settings };

    // 기존 Hub generateInitialDraftAction 로직 이관
    // 단일 AI 호출 (Research context 주입)
    const result = await generateWithPersona(input, settings, model);

    return {
      title: result.title,
      body: result.body,
      metadata: {
        generatorId: 'generic',
        charCount: result.body.length,
        model: model.displayName,
      }
    };
  },

  getSettingsUI: () => <GenericSettingsForm />,
  getTutorSystemPrompt: () => GENERIC_TUTOR_PROMPT,
};
```

---

## 7. Model Provider Design

### 7.1 Interface (Python base.py → TS)

```typescript
// src/models/types.ts

type ModelCallOptions = {
  system?: string;
  responseFormat?: 'text' | 'json';
  jsonSchema?: Record<string, unknown>;
}

type ModelProviderInterface = {
  modelName: string;
  displayName: string;
  generate: (prompt: string, options?: ModelCallOptions) => Promise<string>;
}
```

### 7.2 Factory (Python factory.py → TS)

```typescript
// src/models/factory.ts

function createModel(modelId: ModelId): ModelProviderInterface {
  if (modelId.startsWith('gemini')) {
    return new GeminiProvider(modelId);
  }
  if (modelId.startsWith('claude')) {
    return new AnthropicProvider(modelId);
  }
  if (modelId.startsWith('gpt')) {
    return new OpenAIProvider(modelId);
  }
  throw new Error(`Unknown model: ${modelId}`);
}
```

### 7.3 Provider 구현 (서버 전용)

```typescript
// src/models/gemini.ts
class GeminiProvider implements ModelProviderInterface {
  // @google/genai SDK 사용
  // process.env.GEMINI_API_KEY
}

// src/models/anthropic.ts
class AnthropicProvider implements ModelProviderInterface {
  // @anthropic-ai/sdk 사용
  // process.env.ANTHROPIC_API_KEY
}

// src/models/openai.ts
class OpenAIProvider implements ModelProviderInterface {
  // openai SDK 사용
  // process.env.OPENAI_API_KEY
}
```

---

## 8. Research Agents Design

### 8.1 이관 대상 (기존 Hub → 신규 Hub)

| Agent | 원본 | 변경사항 |
|-------|------|----------|
| `KoreanSearcher` | 기존 Hub 그대로 | Naver API 호출, 타입만 정리 |
| `QueryRefiner` | 기존 Hub 그대로 | Gemini 호출 → Model Provider로 교체 |
| `FactCheckEngine` | 기존 Hub 그대로 | KoreanSearcher 의존, 타입 정리 |

### 8.2 변경 포인트

```typescript
// 기존: Gemini 직접 호출
const genAI = new GoogleGenAI({ apiKey: geminiApiKey });

// 신규: Model Provider 통해 호출
const model = createModel('gemini-2.0-flash');
const result = await model.generate(prompt, { system: systemPrompt });
```

---

## 9. Error Handling

### 9.1 Server Action 에러 패턴

```typescript
// 모든 Server Action 공통
type ActionResult<T> = { data: T } | { error: string };

// 사용 예시
const result = await generateColumnAction('road', input);
if ('error' in result) {
  // 에러 표시
  toast.error(result.error);
  return;
}
// 성공 처리
setDraft({ title: result.data.title, body: result.data.body });
```

### 9.2 에러 분류

| Category | 원인 | 처리 |
|----------|------|------|
| API Key Missing | env 미설정 | 설정 안내 메시지 |
| Model Error | AI 응답 실패 | 재시도 안내 |
| Network Error | Naver API 실패 | 캐시된 결과 사용 또는 재시도 |
| Parse Error | JSON 파싱 실패 | 원본 텍스트 반환 |
| Generator Error | 파이프라인 중간 실패 | 마지막 성공 단계까지 결과 반환 |

---

## 10. Security Considerations

- [x] API 키는 Server Actions에서만 접근 (process.env, 'use server')
- [x] 클라이언트에 API 키 노출 없음 (NEXT_PUBLIC_ 접두사 미사용)
- [ ] User input sanitization (XSS 방지 - HTML 출력 시)
- [ ] Naver API rate limiting 대응 (캐시)
- [x] 인증 시스템 없음 (단일 사용자, Out of Scope)

---

## 11. Clean Architecture

### 11.1 Layer Structure

| Layer | Responsibility | Location |
|-------|---------------|----------|
| **Presentation** | UI 컴포넌트, 페이지 | `src/app/editor/*.tsx` |
| **Application** | Generator 로직, Server Actions | `src/generators/`, `src/app/actions.ts` |
| **Domain** | 공통 타입, 인터페이스 | `src/types/`, `src/generators/types.ts` |
| **Infrastructure** | AI 모델 호출, 외부 API | `src/models/`, `src/agents/research/` |

### 11.2 Dependency Rules

```
Presentation (app/editor/)
    │
    ▼  uses Server Actions
Application (generators/, actions.ts)
    │
    ▼  uses Model Provider, implements Generator interface
Infrastructure (models/, agents/)
    │
    ▼  depends on
Domain (types/)  ← 모든 레이어가 참조, 외부 의존성 없음
```

### 11.3 File Import Rules

| From | Can Import | Cannot Import |
|------|-----------|---------------|
| `app/editor/` (Presentation) | `types/`, Server Actions 호출 | `generators/`, `models/` 직접 |
| `generators/` (Application) | `types/`, `models/` | `app/editor/` |
| `models/` (Infrastructure) | `types/` only | `generators/`, `app/` |
| `agents/research/` (Infrastructure) | `types/`, `models/` | `generators/`, `app/` |
| `types/` (Domain) | 없음 (순수 타입) | 모든 외부 |

### 11.4 This Feature's Layer Assignment

| Component | Layer | Location |
|-----------|-------|----------|
| TutorPanel, EditorArea, ResearchDashboard | Presentation | `src/app/editor/` |
| WorkspaceContext | Presentation | `src/app/editor/WorkspaceContext.tsx` |
| GeneratorRegistry, RoadGenerator, GenericGenerator | Application | `src/generators/` |
| Server Actions | Application | `src/app/actions.ts` |
| GeminiProvider, AnthropicProvider, OpenAIProvider | Infrastructure | `src/models/` |
| KoreanSearcher, QueryRefiner, FactCheckEngine | Infrastructure | `src/agents/research/` |
| GeneratorConfig, GeneratorInput, GeneratorOutput | Domain | `src/types/index.ts` |
| Facts, RoadContext, Editorial | Domain | `src/types/index.ts` |

---

## 12. Coding Convention Reference

### 12.1 Naming Conventions

| Target | Rule | Example |
|--------|------|---------|
| Components | PascalCase | `TutorPanel`, `EditorArea` |
| Functions | camelCase | `generateColumnAction`, `extractFacts` |
| Constants | UPPER_SNAKE_CASE | `ROAD_TUTOR_PROMPT`, `MAX_REVISION_ROUNDS` |
| Types | PascalCase (type만, interface 금지) | `GeneratorConfig`, `DraftData` |
| Files (component) | PascalCase.tsx | `TutorPanel.tsx` |
| Files (utility) | camelCase.ts | `factory.ts`, `registry.ts` |
| Folders | kebab-case (generators 내부는 id 이름) | `road/`, `generic/` |

### 12.2 Import Order

```typescript
// 1. React / Next.js
import { useState, useEffect } from 'react';

// 2. 외부 라이브러리
import { GoogleGenAI } from '@google/genai';

// 3. 내부 절대 경로
import { createModel } from '@/models/factory';
import { getGenerator } from '@/generators/registry';

// 4. 상대 경로
import { useWorkspace } from './WorkspaceContext';

// 5. 타입 (type-only import)
import type { GeneratorInput, GeneratorOutput } from '@/types';

// 6. 스타일
import styles from './EditorArea.module.css';
```

### 12.3 Environment Variables

| Variable | Purpose | Scope |
|----------|---------|-------|
| `GEMINI_API_KEY` | Gemini AI 호출 | Server only |
| `ANTHROPIC_API_KEY` | Claude AI 호출 | Server only |
| `OPENAI_API_KEY` | GPT AI 호출 | Server only |
| `NAVER_CLIENT_ID` | Naver 뉴스 검색 | Server only |
| `NAVER_CLIENT_SECRET` | Naver 뉴스 검색 | Server only |

### 12.4 This Feature's Conventions

| Item | Convention |
|------|-----------|
| Type 선언 | `type` only (no `interface`) |
| 상태 관리 | React Context + localStorage 자동저장 (1초 debounce) |
| Server Action 반환 | `{ data: T } \| { error: string }` 패턴 |
| CSS | CSS Modules (`*.module.css`) |
| 에러 처리 | try-catch + ActionResult 래핑 |

---

## 13. Implementation Guide

### 13.1 File Structure (최종)

```
src/
├── app/
│   ├── layout.tsx                    # RootLayout
│   ├── page.tsx                      # → /editor 리다이렉트
│   ├── actions.ts                    # Server Actions (5개)
│   ├── globals.css                   # 전역 스타일
│   └── editor/
│       ├── page.tsx                  # WorkspaceLayout (3패널)
│       ├── WorkspaceContext.tsx       # 전역 상태 Provider
│       ├── GeneratorSelector.tsx      # Generator 드롭다운
│       ├── TutorPanel.tsx            # 좌측 패널
│       ├── TutorSetup.tsx            # Setup 탭 (Generator별 분기)
│       ├── TutorChat.tsx             # Chat 탭
│       ├── PipelineProgress.tsx      # Road 진행 표시
│       ├── EditorArea.tsx            # 중앙 패널
│       ├── CharCounter.tsx           # 글자수 카운터
│       ├── ResearchDashboard.tsx     # 우측 패널
│       ├── ExportButton.tsx          # HTML/MD 내보내기
│       └── editor.module.css         # 워크스페이스 스타일
│
├── generators/
│   ├── types.ts                      # ColumnGenerator 인터페이스
│   ├── registry.ts                   # Generator 등록/조회
│   ├── road/
│   │   ├── index.ts                  # Road Generator 구현
│   │   ├── config.ts                 # 문체 규칙, 어휘, 압축 기법
│   │   ├── steps/
│   │   │   ├── extractFacts.ts       # Step 1: 사실 추출
│   │   │   ├── buildContext.ts       # Step 2: 맥락 구축
│   │   │   ├── editorialJudgment.ts  # Step 3: 편집 판단
│   │   │   ├── writeColumn.ts        # Step 4: 집필
│   │   │   └── reviseColumn.ts       # Step 5: 자기교정
│   │   └── prompts/
│   │       ├── factExtraction.ts     # Step 1 프롬프트
│   │       ├── contextBuilding.ts    # Step 2 프롬프트
│   │       ├── editorial.ts          # Step 3 프롬프트
│   │       ├── writing.ts            # Step 4 프롬프트 (예시 칼럼 포함)
│   │       └── revision.ts           # Step 5 프롬프트 (8항목 체크리스트)
│   └── generic/
│       ├── index.ts                  # Generic Generator 구현
│       ├── config.ts                 # 기본 설정값
│       └── GenericSettingsForm.tsx    # 설정 편집 UI
│
├── models/
│   ├── types.ts                      # ModelProviderInterface
│   ├── factory.ts                    # createModel()
│   ├── gemini.ts                     # GeminiProvider
│   ├── anthropic.ts                  # AnthropicProvider
│   └── openai.ts                     # OpenAIProvider
│
├── agents/
│   └── research/
│       ├── KoreanSearcher.ts         # Naver API 검색
│       ├── QueryRefiner.ts           # 쿼리 정제 (클러스터/반론)
│       └── FactCheckEngine.ts        # 팩트체크
│
├── lib/
│   └── sanitize.ts                   # HTML 새니타이즈
│
└── types/
    └── index.ts                      # 모든 공유 타입
```

### 13.2 Implementation Order

#### Phase 1: Foundation (기반) — 파일 7개

1. [ ] **프로젝트 초기화**
   - `npx create-next-app@latest` (App Router, TypeScript, CSS Modules)
   - CLAUDE.md 작성 (코딩 컨벤션)
   - `.env.local` 설정

2. [ ] **공유 타입 정의**
   - `src/types/index.ts` — 모든 타입 한 파일에 작성

3. [ ] **Model Provider 구현**
   - `src/models/types.ts` — ModelProviderInterface
   - `src/models/factory.ts` — createModel()
   - `src/models/gemini.ts` — GeminiProvider
   - `src/models/anthropic.ts` — AnthropicProvider
   - `src/models/openai.ts` — OpenAIProvider

4. [ ] **Generator Registry**
   - `src/generators/types.ts` — ColumnGenerator 타입
   - `src/generators/registry.ts` — Map 기반 등록/조회

#### Phase 2: Generators (칼럼 생성기) — 파일 12개

5. [ ] **Generic Generator**
   - `src/generators/generic/config.ts` — 기본 설정값
   - `src/generators/generic/index.ts` — generate() 구현
   - 기존 Hub의 generateInitialDraftAction 로직 이관

6. [ ] **Road Generator**
   - `src/generators/road/config.ts` — 문체 규칙, 어휘
   - `src/generators/road/prompts/*.ts` — 5개 프롬프트 (Python 원본 그대로)
   - `src/generators/road/steps/*.ts` — 5개 스텝 구현
   - `src/generators/road/index.ts` — 파이프라인 오케스트레이션

#### Phase 3: UI (워크스페이스) — 파일 12개

7. [ ] **WorkspaceContext + 레이아웃**
   - `src/app/editor/WorkspaceContext.tsx` — 상태 + localStorage
   - `src/app/editor/page.tsx` — 3패널 레이아웃

8. [ ] **TutorPanel**
   - `src/app/editor/GeneratorSelector.tsx`
   - `src/app/editor/TutorPanel.tsx`
   - `src/app/editor/TutorSetup.tsx`
   - `src/app/editor/TutorChat.tsx`
   - `src/app/editor/PipelineProgress.tsx`

9. [ ] **EditorArea**
   - `src/app/editor/EditorArea.tsx`
   - `src/app/editor/CharCounter.tsx`

10. [ ] **ResearchDashboard**
    - `src/app/editor/ResearchDashboard.tsx`
    - `src/agents/research/KoreanSearcher.ts` (이관)
    - `src/agents/research/QueryRefiner.ts` (이관)
    - `src/agents/research/FactCheckEngine.ts` (이관)

#### Phase 4: Integration (통합) — 파일 3개

11. [ ] **Server Actions 통합**
    - `src/app/actions.ts` — 5개 Action 통합
    - tutorChatAction에 draftContext + generatorId 전달

12. [ ] **Export 기능**
    - `src/app/editor/ExportButton.tsx`
    - `src/lib/sanitize.ts`
    - exportColumnAction (HTML/MD)

13. [ ] **전체 통합 테스트**
    - Road Generator 출력 vs Python 원본 비교
    - Generic Generator 출력 vs 기존 Hub 비교
    - Generator 전환 동작 확인

---

## 14. Road Generator 프롬프트 포팅 가이드

### 14.1 프롬프트 원본 위치 (Python)

| Step | Python 파일 | 핵심 프롬프트 |
|------|-------------|---------------|
| Step 1 | `step2_facts.py` | 6하원칙 + 핵심숫자 추출 |
| Step 2 | `step3_context.py` | 역사적 맥락 + 유사사례 + 구조적 배경 |
| Step 3 | `step4_editorial.py` | core_tension + so_what + 버릴 것/함의할 것 |
| Step 4 | `step5_write.py` | Road 문체 규칙 + 예시 칼럼 2편 + 어휘 목록 |
| Step 5 | `step5_5_revise.py` | 8항목 체크리스트 + 자기교정 루프 |

### 14.2 포팅 원칙

- **프롬프트 텍스트는 한 글자도 바꾸지 않는다** (품질 보존)
- Python f-string → TypeScript template literal로만 변환
- 변수명은 camelCase로 변환 (예: `who_what_when` → `whoWhatWhen`)
- Pydantic BaseModel → TypeScript type으로 변환

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-14 | Initial draft | user |
