# Column Editorial Hub 재구축 Planning Document

> **Summary**: Replit 기반 Column Editorial Hub를 Claude Code로 재구축하고, 복수 칼럼니스트 Generator를 지원하는 Hub 아키텍처로 확장
>
> **Project**: column-editorial-hub
> **Version**: 0.1.0
> **Author**: user
> **Date**: 2026-02-14
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

기존 Replit 기반 Column Editorial Hub(3패널 워크스페이스)를 Claude Code 환경에서 재구축하고, Road-Column을 포함한 복수 칼럼니스트 Generator를 플러그인 방식으로 지원하는 통합 편집 플랫폼을 구축한다.

### 1.2 Background

- **기존 Editor-Hub** (Replit): Next.js 16 + Gemini 단일 모델. 3패널 UI(Tutor/Editor/Research), 범용 칼럼 생성, Naver 뉴스 검색, AI 튜터, 팩트체크. Phase 0 완료 상태.
- **기존 Road-Column** (Python CLI): 6단계 파이프라인, Road(길진홍) 문체 특화, 멀티모델(GPT+Claude+Gemini), EPUB 지식 인제스트, Sage MCP 연동.
- **통합 필요성**: Hub의 UI/리서치 인프라 위에 Road를 포함한 복수 Generator를 꽂는 구조가 최적. 각 Generator가 고유한 문체·파이프라인을 가지면서 공통 리서치/편집 기능을 공유.

### 1.3 Related Documents

- 참조(기존 Replit): `C:\Users\user\Desktop\colomn-editorial-hub-master\`
- 참조(Road Python): `C:\Users\user\Desktop\road-column\road-column-main\`
- 참조(Replit 설계): `colomn-editorial-hub-master\docs\02-design\features\column generator design.md`

---

## 2. Scope

### 2.1 In Scope

- [x] Next.js 앱 클린 초기화 (Replit 종속성 제거)
- [ ] 3패널 워크스페이스 UI 재구현 (Tutor / Editor / Research)
- [ ] Generator Registry 아키텍처 설계 및 구현
- [ ] Road Generator (Python 6단계 파이프라인 → TS 포팅)
- [ ] Generic Generator (기존 Hub의 persona 기반 생성 이관)
- [ ] Research 모듈 이관 (Naver 검색 + QueryRefiner + FactCheck)
- [ ] Sage MCP 연동 (Research Dashboard에 Sage 탭 추가)
- [ ] 멀티모델 지원 (Gemini + Claude + OpenAI)
- [ ] AI Tutor 개선 (draft context 전달 - 기존 P1 미완성 항목)

### 2.2 Out of Scope

- 사용자 인증/로그인 시스템
- 데이터베이스 (localStorage 유지)
- EPUB 인제스트 기능 (Sage MCP에 위임, 별도 CLI 유지)
- 모바일 반응형 레이아웃 (데스크톱 우선)
- 배포/CI/CD 설정

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Generator Registry: 복수 Generator 등록/선택/실행 인터페이스 | High | Pending |
| FR-02 | Road Generator: 6단계 파이프라인(사실추출→맥락→편집판단→집필→자기교정) TS 포팅 | High | Pending |
| FR-03 | Generic Generator: persona/structure/style/taboos 설정 기반 범용 생성 | High | Pending |
| FR-04 | 3패널 UI: Tutor(좌) + Editor(중) + Research(우) 워크스페이스 | High | Pending |
| FR-05 | Research: Naver API 검색 + QueryRefiner + FactCheck 이관 | High | Pending |
| FR-06 | 멀티모델: Generator별 모델 선택 (Gemini/Claude/GPT) | Medium | Pending |
| FR-07 | AI Tutor: Generator별 특화 피드백 + draft context 전달 | Medium | Pending |
| FR-08 | Road 자기교정: 8항목 체크리스트 자동 평가 및 리비전 루프 | Medium | Pending |
| FR-09 | Editor: 실시간 글자수 카운터 + 자동저장 | Medium | Pending |
| FR-10 | HTML/Markdown 출력: 완성 칼럼 내보내기 | Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 초안 생성 30초 이내 (단일 모델 기준) | 타이머 측정 |
| Extensibility | 새 Generator 추가 시 파일 1개 + registry 등록 1줄 | 코드 리뷰 |
| Security | API 키 서버사이드 전용 (Server Actions) | 코드 리뷰 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] Road Generator가 기존 Python CLI와 동일 품질의 칼럼 생성
- [ ] Generic Generator가 기존 Replit Hub와 동일 기능 제공
- [ ] Generator 전환이 드롭다운 선택 1회로 완료
- [ ] Research 탭에서 Naver 검색 + Sage MCP 지식 조회 가능
- [ ] 빌드 에러 0건

### 4.2 Quality Criteria

- [ ] TypeScript strict mode, no `any`
- [ ] Zero lint errors
- [ ] 모든 Server Action에 에러 핸들링

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Road 파이프라인 TS 포팅 시 품질 저하 | High | Medium | Python 원본과 출력 비교 테스트, 프롬프트 텍스트 그대로 이관 |
| Gemini/Claude/OpenAI SDK 버전 충돌 | Medium | Low | 각 SDK 최신 안정 버전 고정, Provider 패턴 추상화 |
| Naver API 호출 제한 | Medium | Medium | 캐시 레이어 추가, 검색 결과 재사용 |
| Generator 인터페이스 설계 과잉 | Medium | Medium | 최소 인터페이스(generate + config)로 시작, 필요 시 확장 |
| Sage MCP 연동이 세션 의존적 | Low | High | Hub UI에서는 결과 표시만, 실제 호출은 Claude Code 세션에서 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites | ☐ |
| **Dynamic** | Feature-based modules, services layer | Web apps with backend, SaaS MVPs | ☑ |
| **Enterprise** | Strict layer separation, DI, microservices | High-traffic systems | ☐ |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Framework | Next.js / React / Vue | **Next.js 15 (App Router)** | 기존 Hub 기반, Server Actions로 API 키 보호 |
| State Management | Context / Zustand / Jotai | **React Context** | 기존 Hub 패턴 유지, 추가 의존성 최소화 |
| AI SDK | 직접 호출 / Vercel AI SDK | **직접 호출** | Generator별 세밀한 제어 필요 |
| Styling | Tailwind / CSS Modules | **CSS Modules** | 기존 Hub 패턴 유지 |
| 모델 추상화 | 단일 함수 / Provider 패턴 | **Provider 패턴** | Road-Column의 factory.py 패턴 차용 |

### 6.3 Clean Architecture Approach

```
Selected Level: Dynamic

src/
├── app/                          # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx                  # 랜딩 또는 리다이렉트
│   ├── actions.ts                # Server Actions (공통)
│   └── editor/                   # 3패널 워크스페이스
│       ├── page.tsx
│       ├── WorkspaceContext.tsx
│       ├── TutorPanel.tsx
│       ├── EditorArea.tsx
│       └── ResearchDashboard.tsx
│
├── generators/                   # Generator Registry
│   ├── registry.ts               # Generator 등록/조회
│   ├── types.ts                  # Generator 공통 인터페이스
│   ├── road/                     # Road Generator
│   │   ├── index.ts              # Road Generator 구현
│   │   ├── config.ts             # Road 고유 설정 (문체 규칙, 어휘)
│   │   ├── steps/                # 6단계 파이프라인
│   │   │   ├── extractFacts.ts
│   │   │   ├── buildContext.ts
│   │   │   ├── editorialJudgment.ts
│   │   │   ├── writeColumn.ts
│   │   │   └── reviseColumn.ts
│   │   └── prompts/              # Road 프롬프트 텍스트
│   └── generic/                  # Generic Generator
│       ├── index.ts
│       └── config.ts
│
├── agents/                       # Research Agents
│   └── research/
│       ├── KoreanSearcher.ts
│       ├── QueryRefiner.ts
│       └── FactCheckEngine.ts
│
├── models/                       # AI Model Provider
│   ├── types.ts
│   ├── factory.ts
│   ├── gemini.ts
│   ├── anthropic.ts
│   └── openai.ts
│
├── lib/                          # Utilities
│   └── sanitize.tsx
│
└── types/                        # Shared Types
    └── index.ts
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [ ] `CLAUDE.md` has coding conventions section → 신규 작성 필요
- [ ] ESLint configuration → Next.js 기본 + strict
- [ ] TypeScript configuration → strict mode, no any
- [x] 참조 가능: 기존 Hub의 타입 규칙 (no `interface`, only `type`)

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | missing | camelCase(변수/함수), PascalCase(컴포넌트/타입) | High |
| **Folder structure** | missing | Dynamic 레벨 구조 (위 6.3) | High |
| **Import order** | missing | react → next → 외부 → 내부 → types | Medium |
| **Error handling** | missing | Server Action: try-catch + `{data, error}` 패턴 | Medium |

### 7.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `GEMINI_API_KEY` | Gemini AI 호출 | Server | ☑ |
| `ANTHROPIC_API_KEY` | Claude AI 호출 | Server | ☑ |
| `OPENAI_API_KEY` | GPT AI 호출 | Server | ☑ |
| `NAVER_CLIENT_ID` | Naver 뉴스 검색 | Server | ☑ |
| `NAVER_CLIENT_SECRET` | Naver 뉴스 검색 | Server | ☑ |

---

## 8. Implementation Phases

### Phase 1: Foundation (기반)
1. Next.js 프로젝트 초기화 + CLAUDE.md 작성
2. Model Provider 추상화 (Gemini/Claude/OpenAI)
3. Generator Registry + 공통 인터페이스 정의

### Phase 2: Generators (칼럼 생성기)
4. Generic Generator 이관 (기존 Hub의 generateInitialDraftAction)
5. Road Generator TS 포팅 (6단계 파이프라인 + 자기교정)

### Phase 3: UI (워크스페이스)
6. 3패널 레이아웃 재구현
7. Generator 선택 UI + TutorPanel (Generator별 설정 분기)
8. EditorArea (글자수 카운터 + 자동저장)
9. ResearchDashboard (검색 + 팩트체크 + 저장)

### Phase 4: Integration (통합)
10. AI Tutor에 draft context 전달
11. Research 결과 → Generator context로 자동 주입
12. HTML/Markdown 출력 내보내기

---

## 9. Generator Interface (핵심 설계)

```typescript
// generators/types.ts
type GeneratorConfig = {
  id: string;                    // 'road' | 'generic' | ...
  name: string;                  // 'Road(길진홍)' | '범용 칼럼' | ...
  description: string;
  defaultModel: string;          // 'gemini-2.0-flash'
  supportedModels: string[];
  settings: GeneratorSettings;   // Generator별 고유 설정 스키마
}

type GeneratorInput = {
  title: string;
  idea: string;
  sources?: string[];            // URL, 텍스트 등
  researchContext?: string;      // Research Dashboard에서 주입
  model?: string;
}

type GeneratorOutput = {
  title: string;
  body: string;
  metadata?: {
    charCount: number;
    model: string;
    steps?: string[];            // Road: 각 단계 로그
    evaluation?: string;         // Road: 자기교정 결과
  }
}

type ColumnGenerator = {
  config: GeneratorConfig;
  generate: (input: GeneratorInput) => Promise<GeneratorOutput>;
  getSettingsUI?: () => React.ReactNode;  // Generator별 설정 패널
}
```

---

## 10. Next Steps

1. [ ] Design 문서 작성 (`hub-rebuild.design.md`)
2. [ ] 리뷰 및 승인
3. [ ] Phase 1 구현 시작

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-14 | Initial draft | user |
