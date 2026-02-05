# Tasks: 아카이브 AI 피드백

**Feature**: [spec.md](./spec.md)
**Plan**: [docs/plans/001-archive-keyword-followup-display.md](../../docs/plans/001-archive-keyword-followup-display.md)
**GitHub Issue**: [#1](https://github.com/kwakseongjae/dev-interview/issues/1)
**Created**: 2026-02-05

---

## Overview

| Metric                 | Value |
| ---------------------- | ----- |
| Total Tasks            | 24    |
| P1 Tasks               | 18    |
| P2 Tasks               | 6     |
| Phases                 | 6     |
| Parallel Opportunities | 8     |

---

## Phase 1: Setup (기반 구조)

**Goal**: 데이터베이스 스키마와 타입 정의 설정

### Tasks

- [ ] T001 Create answer_feedback table migration in `supabase/migrations/20260205_answer_feedback.sql`
- [ ] T002 [P] Add AnswerFeedback type definitions in `src/types/database.ts`
- [ ] T003 [P] Add FeedbackData interface in `src/types/interview.ts`

**Completion Criteria**:

- [ ] Migration file created with correct schema
- [ ] TypeScript types match database schema
- [ ] `npx tsc --noEmit` passes

---

## Phase 2: Foundational (AI 피드백 생성 로직)

**Goal**: AI 피드백 생성 핵심 로직 구현 (모든 User Story의 기반)

### Tasks

- [ ] T004 Create feedback prompt templates in `src/lib/ai/feedback-prompts.ts`
- [ ] T005 [P] Create quick feedback generator (Haiku) in `src/lib/ai/feedback-generator.ts`
- [ ] T006 [P] Create detailed feedback generator (Sonnet) in `src/lib/ai/feedback-generator.ts`
- [ ] T007 Add feedback API client functions in `src/lib/api.ts`

**Completion Criteria**:

- [ ] Prompt templates for quick and detailed feedback defined
- [ ] Feedback generator functions return correct JSON structure
- [ ] API client functions typed correctly
- [ ] `npm run build` passes

---

## Phase 3: User Story 1 & 2 - 키워드 및 점수 표시 (P1)

**Story Goal**:

- US-1: 사용자가 답변의 핵심 키워드를 Badge 형태로 확인할 수 있다
- US-2: 사용자가 답변의 점수(1-5)와 요약을 확인할 수 있다

### Tasks

- [ ] T008 [US1,2] Create GET feedback API route in `src/app/api/answers/[id]/feedback/route.ts`
- [ ] T009 [P] [US1,2] Create POST quick feedback API route in `src/app/api/answers/[id]/feedback/quick/route.ts`
- [ ] T010 [P] [US1,2] Create QuickFeedback component in `src/components/feedback/QuickFeedback.tsx`
- [ ] T011 [US1,2] Create FeedbackSkeleton loading component in `src/components/feedback/FeedbackSkeleton.tsx`

**Acceptance Criteria** (from spec):

- [ ] 각 답변 아래에 3-5개의 키워드가 Badge 형태로 표시된다
- [ ] 1-5점 척도의 점수가 시각적으로 표시된다
- [ ] 점수에 따라 색상이 다르게 표시된다 (4-5: 초록, 3: 노랑, 1-2: 빨강)
- [ ] 점수 옆에 한 줄 요약 코멘트가 함께 표시된다
- [ ] 답변이 없는 질문에는 키워드/점수가 표시되지 않는다

**Independent Test**: Quick feedback API 직접 호출하여 키워드/점수 반환 확인

---

## Phase 4: User Story 3 & 4 - 꼬리질문 및 강점/개선점 (P1/P2)

**Story Goal**:

- US-3: 사용자가 답변에서 파생될 수 있는 꼬리질문을 확인할 수 있다
- US-4: 사용자가 답변의 잘한 점과 개선점을 확인할 수 있다

### Tasks

- [ ] T012 [US3,4] Create POST detailed feedback API route in `src/app/api/answers/[id]/feedback/detail/route.ts`
- [ ] T013 [P] [US3] Create FollowUpQuestions component in `src/components/feedback/FollowUpQuestions.tsx`
- [ ] T014 [P] [US4] Create StrengthsImprovements component in `src/components/feedback/StrengthsImprovements.tsx`
- [ ] T015 [US3,4] Create DetailedFeedback container in `src/components/feedback/DetailedFeedback.tsx`

**Acceptance Criteria** (from spec):

- [ ] 2-3개의 꼬리질문이 목록 형태로 표시된다
- [ ] 꼬리질문은 원 질문 및 사용자 답변과 관련성이 있다
- [ ] 잘한 점 2-3개가 목록으로 표시된다
- [ ] 개선점 2-3개가 목록으로 표시된다
- [ ] 각 항목은 구체적이고 실행 가능한 내용이다

**Independent Test**: Detail feedback API 직접 호출하여 꼬리질문/강점/개선점 반환 확인

---

## Phase 5: User Story 5 & 6 - 피드백 토글 및 상세 요청 (P1/P2)

**Story Goal**:

- US-5: 사용자가 AI 피드백을 접거나 펼칠 수 있다
- US-6: 사용자가 상세한 AI 분석을 온디맨드로 요청할 수 있다

### Tasks

- [ ] T016 [US5,6] Create FeedbackSection main component in `src/components/feedback/FeedbackSection.tsx`
- [ ] T017 [US5] Add expand/collapse animation with Framer Motion in `src/components/feedback/FeedbackSection.tsx`
- [ ] T018 [US6] Add "상세 분석 요청" button with loading state in `src/components/feedback/DetailedFeedback.tsx`
- [ ] T019 [US5,6] Integrate FeedbackSection into archive detail page in `src/app/archive/[id]/page.tsx`

**Acceptance Criteria** (from spec):

- [ ] 기본 상태에서는 키워드, 점수, 요약만 표시된다 (Quick Feedback)
- [ ] "펼치기" 버튼을 클릭하면 상세 피드백이 표시된다
- [ ] 펼치기/접기 시 부드러운 애니메이션이 적용된다
- [ ] 상세 피드백이 아직 생성되지 않은 경우 "상세 분석 요청" 버튼이 표시된다
- [ ] 버튼 클릭 시 로딩 상태가 표시된다
- [ ] 한 번 생성된 상세 피드백은 캐싱되어 다음 방문 시 즉시 표시된다

**Independent Test**: 아카이브 상세 페이지에서 피드백 토글 동작 확인

---

## Phase 6: Polish & Integration

**Goal**: 최종 통합, 모바일 반응형, 에러 처리

### Tasks

- [ ] T020 Add mobile responsive styles to all feedback components
- [ ] T021 Add error handling and graceful degradation for AI service failures
- [ ] T022 Add feedback data to session detail API response in `src/app/api/sessions/[id]/route.ts`
- [ ] T023 [P] Add auto-trigger quick feedback on answer submission in `src/app/api/answers/route.ts` (선택적)
- [ ] T024 Run quality gates: `npm run build && npx tsc --noEmit && npm run lint`

**Completion Criteria**:

- [ ] 모바일 화면(320px)에서 피드백 UI 정상 표시
- [ ] AI 서비스 장애 시 기존 Q&A만 표시 (graceful degradation)
- [ ] 모든 품질 게이트 통과

---

## Dependencies

```
Phase 1 (Setup)
    │
    ▼
Phase 2 (Foundational) ─── 모든 User Story의 기반
    │
    ├──────────────────────────┐
    ▼                          ▼
Phase 3 (US1,2)          Phase 4 (US3,4)
Quick Feedback           Detailed Feedback
    │                          │
    └──────────┬───────────────┘
               ▼
         Phase 5 (US5,6)
         Toggle & Request
               │
               ▼
         Phase 6 (Polish)
```

---

## Parallel Execution Examples

### Phase 2 병렬 실행

```
T005 (Quick Generator) ─┬─ 병렬 실행 가능
T006 (Detail Generator) ┘
```

### Phase 3 병렬 실행

```
T009 (Quick API) ─┬─ 병렬 실행 가능
T010 (QuickFeedback Component) ┘
```

### Phase 4 병렬 실행

```
T013 (FollowUpQuestions) ─┬─ 병렬 실행 가능
T014 (StrengthsImprovements) ┘
```

---

## Implementation Strategy

### MVP Scope (권장)

- **Phase 1-3 완료**: Quick Feedback만으로 MVP 배포 가능
- 사용자에게 즉시 키워드와 점수 제공
- 상세 피드백은 Phase 4-5에서 추가

### Incremental Delivery

1. **v0.1**: Quick Feedback (키워드, 점수, 요약) - Phase 1-3
2. **v0.2**: Detailed Feedback (꼬리질문, 강점/개선점) - Phase 4
3. **v0.3**: Full Integration (토글, 온디맨드 요청) - Phase 5-6

---

## File Summary

| Phase | New Files                                                                                                                                                                                                 | Modified Files                                                       |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1     | `supabase/migrations/20260205_answer_feedback.sql`                                                                                                                                                        | `src/types/database.ts`, `src/types/interview.ts`                    |
| 2     | `src/lib/ai/feedback-prompts.ts`, `src/lib/ai/feedback-generator.ts`                                                                                                                                      | `src/lib/api.ts`                                                     |
| 3     | `src/app/api/answers/[id]/feedback/route.ts`, `src/app/api/answers/[id]/feedback/quick/route.ts`, `src/components/feedback/QuickFeedback.tsx`, `src/components/feedback/FeedbackSkeleton.tsx`             | -                                                                    |
| 4     | `src/app/api/answers/[id]/feedback/detail/route.ts`, `src/components/feedback/FollowUpQuestions.tsx`, `src/components/feedback/StrengthsImprovements.tsx`, `src/components/feedback/DetailedFeedback.tsx` | -                                                                    |
| 5     | `src/components/feedback/FeedbackSection.tsx`                                                                                                                                                             | `src/app/archive/[id]/page.tsx`                                      |
| 6     | -                                                                                                                                                                                                         | `src/app/api/sessions/[id]/route.ts`, `src/app/api/answers/route.ts` |

---

## Notes

- 테스트 코드는 명시적 요청이 없어 제외됨
- Phase 5의 T023 (자동 퀵 피드백)은 선택적 구현
- 모든 피드백 컴포넌트는 Framer Motion 애니메이션 적용
- Vercel React Best Practices 적용: `rerender-memo`, `async-parallel`, `bundle-barrel-imports`
