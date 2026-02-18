# hub-rebuild Gap Analysis Report

> **Analysis Type**: Gap Analysis (Design vs Implementation)
>
> **Project**: column-editorial-hub
> **Version**: 0.1.0
> **Analyst**: Claude (gap-detector)
> **Date**: 2026-02-14
> **Design Doc**: [hub-rebuild.design.md](../02-design/features/hub-rebuild.design.md)

---

## 1. Overall Match Rate: 96% (PASS)

> Iteration 1 applied: 90% → 96%

| Category | Score (v0.1) | Score (v0.2) | Status |
|----------|:-----:|:-----:|:------:|
| File Structure Match | 90% | **98%** | PASS |
| Core Types Match | 98% | 98% | PASS |
| Server Actions Match | 80% | **93%** | PASS |
| Generator Interface Match | 90% | **95%** | PASS |
| Generator Implementation Match | 93% | 93% | PASS |
| Model Provider Match | 100% | 100% | PASS |
| UI Components Match | 82% | **98%** | PASS |
| Research Agents Match | 85% | 85% | WARNING |
| Architecture Compliance | 92% | **98%** | PASS |
| Convention Compliance | 95% | 95% | PASS |
| **Overall** | **90%** | **96%** | **PASS** |

---

## 2. Match Summary

```
+---------------------------------------------+
|  Overall Match Rate: 96%                    |
+---------------------------------------------+
|  MATCHED items:           62                |
|  MISSING items:            1                |
|  ADDED items:              5                |
|  CHANGED items:            3                |
+---------------------------------------------+
```

---

## 3. Iteration 1 Fixes Applied

| # | Gap | Fix Applied | Status |
|---|-----|------------|--------|
| 1 | `CharCounter.tsx` missing | Created `src/app/editor/CharCounter.tsx`, EditorArea uses it | FIXED |
| 2 | `GenericSettingsForm.tsx` missing | Created `src/generators/generic/GenericSettingsForm.tsx`, TutorSetup uses it | FIXED |
| 3 | Architecture: TutorSetup imports `@/generators/road/config` | Created `getRoadDisplayDataAction` server action | FIXED |
| 4 | Architecture: GeneratorSelector imports `@/generators/registry` | Created `listGeneratorsAction` server action | FIXED |
| 5 | `.env.example` missing | Created `.env.example` with all 5 env vars | FIXED |

---

## 4. Remaining Gaps

| # | Item | Design Section | Description | Impact |
|---|------|---------------|-------------|--------|
| 1 | `exportColumnAction` | 4.1 | Server Action not implemented; export handled client-side (valid design choice — no server secrets needed) | Low |

### Conscious Deviations (accepted)

| # | Item | Design | Implementation | Rationale |
|---|------|--------|----------------|-----------|
| 1 | Export mechanism | Server Action | Client-side Blob download | No server secrets needed, faster UX |
| 2 | `getSettingsUI()` on generators | Generators return React components | TutorSetup imports GenericSettingsForm directly | Generators run server-side; returning JSX would break SSR |
| 3 | `ModelProvider` type name | `ModelProvider` | `ModelProviderInfo` | Avoids confusion with `ModelProviderInterface` |

---

## 5. Architecture Status (Post-Iteration)

### Resolved Violations

| File | Previous Violation | Fix |
|------|-------------------|-----|
| `TutorSetup.tsx` | Direct import of `ROAD_STYLE_RULES`, `ROAD_VOCABULARY` from `@/generators/road/config` | Now uses `getRoadDisplayDataAction()` server action |
| `GeneratorSelector.tsx` | Dynamic import of `@/generators/registry` | Now uses `listGeneratorsAction()` server action |

### Current Import Status

| From (Presentation) | To | Status |
|---------------------|-----|--------|
| `TutorSetup.tsx` | `../actions` (Server Actions) | PASS |
| `TutorSetup.tsx` | `@/generators/generic/GenericSettingsForm` (UI component) | PASS (design-intended) |
| `GeneratorSelector.tsx` | `../actions` (Server Actions) | PASS |
| `EditorArea.tsx` | `../actions` (Server Actions) | PASS |
| `TutorChat.tsx` | `../actions` (Server Actions) | PASS |
| `ResearchDashboard.tsx` | `../actions`, `@/lib/sanitize` | PASS |

---

## 6. Server Actions (Post-Iteration)

| Action | Status | Notes |
|--------|--------|-------|
| `generateColumnAction` | MATCH | Design spec |
| `searchNewsAction` | MATCH | Design spec |
| `verifyFactAction` | MATCH | Design spec |
| `tutorChatAction` | MATCH | Design spec |
| `exportColumnAction` | DEVIATION | Client-side (accepted) |
| `listGeneratorsAction` | ADDED | Architecture fix |
| `getRoadDisplayDataAction` | ADDED | Architecture fix |

---

## 7. Build Status

```
Build: PASS (Next.js 16.1.6, Turbopack)
TypeScript: PASS (zero errors)
Routes: /, /_not-found, /editor
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-14 | Initial gap analysis (90%) | Claude (gap-detector) |
| 0.2 | 2026-02-14 | Iteration 1: 5 fixes applied (96%) | Claude (pdca-iterator) |
