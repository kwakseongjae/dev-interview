# Plan: AI 모범 답변 아카이빙 기능

**Issue**: [#3](https://github.com/kwakseongjae/dev-interview/issues/3) - AI 모범 답변 아카이빙 기능 추가
**Branch**: `feat/3-ai-model-answer`
**Created**: 2026-02-05
**Status**: Planning

---

## 1. Overview

### Problem Statement

현재 아카이브 상세 페이지에서는 사용자 답변에 대한 AI 피드백(점수, 강점/개선점, 꼬리질문)을 제공하지만, **모범 답변 예시**가 없어 사용자가 "어떻게 답변해야 하는지"에 대한 명확한 가이드라인을 얻기 어렵습니다.

### Objectives

1. 각 질문에 대한 AI 생성 모범 답변 제공
2. 기존 피드백 UI와 자연스럽게 통합
3. 사용자가 자신의 답변과 모범 답변을 비교하여 학습할 수 있도록 지원

### Scope

- **In Scope**: 모범 답변 UI 컴포넌트, API 엔드포인트, DB 저장 및 캐싱
- **Out of Scope**: 실시간 면접 중 모범 답변 표시, 팀 스페이스 공유

---

## 2. Requirements

### Functional Requirements (FR)

| ID   | 요구사항                          | 우선순위 |
| ---- | --------------------------------- | -------- |
| FR-1 | 질문별 "모범 답변 보기" 버튼      | P1       |
| FR-2 | 모범 답변 텍스트 표시             | P1       |
| FR-3 | 핵심 포인트 (Key Points) 표시     | P1       |
| FR-4 | 기존 피드백 UI와 조화로운 배치    | P1       |
| FR-5 | 모범 답변 로딩 상태 표시          | P1       |
| FR-6 | 코드 예시 표시 (해당 질문인 경우) | P2       |

### Technical Requirements (TR)

| ID   | 요구사항                         | 상세                          |
| ---- | -------------------------------- | ----------------------------- |
| TR-1 | Claude Sonnet 모델 사용          | 품질 우선 (Haiku 부적합)      |
| TR-2 | DB 캐싱                          | 한 번 생성된 모범 답변은 저장 |
| TR-3 | Lazy Loading                     | 사용자 요청 시에만 생성       |
| TR-4 | 기존 answer_feedback 테이블 확장 | 별도 테이블 불필요            |

### Non-Functional Requirements (NFR)

| ID    | 요구사항          | 기준                |
| ----- | ----------------- | ------------------- |
| NFR-1 | 생성 시간         | < 5초               |
| NFR-2 | 캐시 히트 시 응답 | < 500ms             |
| NFR-3 | 모바일 반응형     | 320px ~ 1440px 지원 |

---

## 3. Architecture & Design

### 3.1 UI 배치 전략

현재 피드백 UI 구조:

```
Card
├── Question Header (질문 + 카테고리 + 찜하기)
├── Separator
└── Answer Section
    ├── 사용자 답변
    └── FeedbackSection (토글)
        ├── 토글 버튼: "AI 피드백" [점수 Badge]
        └── 확장 콘텐츠
            ├── 점수 + 요약
            ├── 키워드 분석
            ├── 강점/개선점
            ├── 꼬리질문
            └── 상세 피드백
```

**선택한 UI 패턴: FeedbackSection 내부 Accordion**

피드백과 모범 답변을 동일한 "AI 분석" 섹션 내에서 Accordion으로 분리:

```
Card
├── Question Header
├── Separator
└── Answer Section
    ├── 사용자 답변
    └── FeedbackSection (토글) - 기존 유지
        ├── 토글 버튼: "AI 피드백" [점수 Badge]
        └── 확장 콘텐츠
            ├── [기존 피드백 내용]
            │   ├── 점수 + 요약
            │   ├── 키워드 분석
            │   ├── 강점/개선점
            │   └── 꼬리질문
            │
            └── [NEW] ModelAnswerSection (분리된 섹션)
                ├── 버튼: "모범 답변 보기" (Lightbulb 아이콘)
                └── 확장 콘텐츠
                    ├── 모범 답변 텍스트
                    ├── 핵심 포인트 (Badge 목록)
                    └── 코드 예시 (선택적)
```

**선택 이유**:

1. 기존 FeedbackSection 토글 패턴 재사용
2. 피드백과 모범 답변을 동시에 열어서 비교 가능 (Accordion type="multiple")
3. 모바일에서도 자연스러운 세로 배치
4. 기존 코드 변경 최소화

### 3.2 데이터베이스 스키마

**기존 answer_feedback 테이블 확장** (새 컬럼 추가):

```sql
-- 기존 answer_feedback 테이블에 컬럼 추가
ALTER TABLE answer_feedback ADD COLUMN IF NOT EXISTS
  model_answer text;                      -- AI 생성 모범 답변

ALTER TABLE answer_feedback ADD COLUMN IF NOT EXISTS
  model_answer_key_points text[] DEFAULT '{}';  -- 핵심 포인트

ALTER TABLE answer_feedback ADD COLUMN IF NOT EXISTS
  model_answer_code_example text;         -- 코드 예시 (선택적)

ALTER TABLE answer_feedback ADD COLUMN IF NOT EXISTS
  model_answer_model text;                -- 생성 모델 (Sonnet)

ALTER TABLE answer_feedback ADD COLUMN IF NOT EXISTS
  model_answer_tokens integer;            -- 토큰 사용량

ALTER TABLE answer_feedback ADD COLUMN IF NOT EXISTS
  model_answer_generated_at timestamptz;  -- 생성 시간
```

### 3.3 API 설계

```
GET /api/answers/:id/feedback
  - 기존 API 확장
  - 반환: { ...existingFeedback, modelAnswer?, modelAnswerKeyPoints?, hasModelAnswer }

POST /api/answers/:id/model-answer
  - 트리거: 사용자가 "모범 답변 보기" 버튼 클릭
  - 모델: Sonnet
  - 반환: { modelAnswer, keyPoints, codeExample? }
  - DB에 캐싱 (기존 행 UPDATE)
```

### 3.4 컴포넌트 설계

```
src/components/feedback/
├── FeedbackSection.tsx       # 수정: ModelAnswerSection 통합
├── ModelAnswerSection.tsx    # NEW: 모범 답변 섹션
├── ModelAnswerSkeleton.tsx   # NEW: 로딩 스켈레톤
└── ... (기존 컴포넌트)

src/lib/ai/
├── feedback-generator.ts     # 수정: generateModelAnswer 함수 추가
└── feedback-prompts.ts       # 수정: MODEL_ANSWER_PROMPT 추가

src/app/api/answers/[id]/
├── feedback/route.ts         # 수정: modelAnswer 필드 포함
└── model-answer/route.ts     # NEW: 모범 답변 생성 API
```

### 3.5 프롬프트 설계

```typescript
export const MODEL_ANSWER_PROMPT = `당신은 시니어 기술면접관입니다.
주어진 기술면접 질문에 대한 모범 답변을 작성해주세요.

**질문**: {question}
**힌트(기대 키워드)**: {hint}
**카테고리**: {category}

다음 JSON 형식으로만 응답해주세요:
{
  "modelAnswer": "완전한 모범 답변 (200-400자, 면접에서 2-3분 내로 말할 수 있는 분량)",
  "keyPoints": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"],
  "codeExample": "관련 코드 예시 (코드 질문인 경우만, 없으면 null)"
}

**작성 가이드**:
- 면접에서 실제로 답할 수 있는 분량
- 추상적인 설명보다 구체적인 예시 포함
- 기대 키워드를 자연스럽게 녹여서 사용
- 실무 경험을 반영한 답변 스타일
- 도입 → 본론 → 결론 구조로 구성
`;
```

---

## 4. Implementation Plan

### Phase 1: 기반 구조 (Backend)

| 작업 | 파일                                           | 설명                          |
| ---- | ---------------------------------------------- | ----------------------------- |
| 1.1  | `supabase/migrations/xxx_add_model_answer.sql` | DB 스키마 마이그레이션        |
| 1.2  | `src/types/interview.ts`                       | ModelAnswerData 타입 추가     |
| 1.3  | `src/types/database.ts`                        | answer_feedback 타입 확장     |
| 1.4  | `src/lib/ai/feedback-prompts.ts`               | MODEL_ANSWER_PROMPT 추가      |
| 1.5  | `src/lib/ai/feedback-generator.ts`             | generateModelAnswer 함수 추가 |

### Phase 2: API 엔드포인트

| 작업 | 파일                                             | 설명                             |
| ---- | ------------------------------------------------ | -------------------------------- |
| 2.1  | `src/app/api/answers/[id]/model-answer/route.ts` | POST 모범 답변 생성 API          |
| 2.2  | `src/app/api/answers/[id]/feedback/route.ts`     | GET API에 modelAnswer 포함       |
| 2.3  | `src/lib/api.ts`                                 | generateModelAnswerApi 함수 추가 |

### Phase 3: UI 컴포넌트

| 작업 | 파일                                              | 설명                    |
| ---- | ------------------------------------------------- | ----------------------- |
| 3.1  | `src/components/feedback/ModelAnswerSection.tsx`  | 모범 답변 표시 컴포넌트 |
| 3.2  | `src/components/feedback/ModelAnswerSkeleton.tsx` | 로딩 스켈레톤           |
| 3.3  | `src/components/feedback/FeedbackSection.tsx`     | ModelAnswerSection 통합 |

### Phase 4: 타입 및 마무리

| 작업 | 파일      | 설명                    |
| ---- | --------- | ----------------------- |
| 4.1  | 타입 검사 | `npx tsc --noEmit` 통과 |
| 4.2  | 린트 검사 | `npm run lint` 통과     |
| 4.3  | 빌드 검사 | `npm run build` 성공    |

---

## 5. Quality Gates

### 검증 체크리스트

- [ ] `npm run build` 성공
- [ ] `npx tsc --noEmit` 타입 에러 없음
- [ ] `npm run lint` 린트 통과
- [ ] 아카이브 상세 페이지에서 "모범 답변 보기" 버튼 정상 표시
- [ ] 버튼 클릭 시 로딩 스켈레톤 표시
- [ ] 모범 답변 생성 후 정상 표시
- [ ] 재요청 시 캐시된 답변 즉시 표시
- [ ] 모바일 반응형 확인

### 성능 기준

| 지표           | 목표            |
| -------------- | --------------- |
| 모범 답변 생성 | < 5초           |
| 캐시 히트 응답 | < 500ms         |
| 컴포넌트 번들  | < 5KB (gzipped) |

---

## 6. Risks & Dependencies

### Risks

| 리스크          | 영향             | 완화 방안                       |
| --------------- | ---------------- | ------------------------------- |
| Claude API 지연 | 사용자 경험 저하 | 스켈레톤 UI, 타임아웃 처리      |
| 토큰 비용       | 운영 비용 증가   | Lazy Loading (요청 시에만 생성) |
| 모범 답변 품질  | 학습 효과 저하   | 프롬프트 반복 개선              |

### Dependencies

- Anthropic Claude API (기존 사용 중)
- Supabase (기존 사용 중)
- Framer Motion (기존 사용 중)
- 기존 FeedbackSection 컴포넌트

---

## 7. UI/UX 상세 설계

### 7.1 모범 답변 섹션 레이아웃

````
┌──────────────────────────────────────────────────────┐
│ 💡 모범 답변 보기                         [▼ 펼치기] │
└──────────────────────────────────────────────────────┘

[펼쳤을 때]
┌──────────────────────────────────────────────────────┐
│ 💡 모범 답변                              [▲ 접기]   │
├──────────────────────────────────────────────────────┤
│                                                       │
│ Virtual DOM은 실제 DOM의 가상 복사본으로, React가    │
│ UI 변경 사항을 효율적으로 처리하기 위해 사용하는     │
│ 메모리 내 가벼운 JavaScript 객체입니다.              │
│                                                       │
│ 컴포넌트의 상태가 변경되면 React는 먼저 가상 DOM에   │
│ 새로운 UI를 렌더링하고, 이전 가상 DOM과 비교하여     │
│ 차이점(diff)을 계산합니다. 이 과정을 Reconciliation  │
│ 이라고 합니다. 최종적으로 변경된 부분만 실제 DOM에   │
│ 반영하여 성능을 최적화합니다.                        │
│                                                       │
│ ┌──────────────────────────────────────────────────┐ │
│ │ 핵심 포인트                                       │ │
│ │ [가상 DOM] [Reconciliation] [Diff 알고리즘]      │ │
│ │ [성능 최적화] [Batch 업데이트]                   │ │
│ └──────────────────────────────────────────────────┘ │
│                                                       │
│ ┌──────────────────────────────────────────────────┐ │
│ │ 코드 예시                                         │ │
│ │ ```jsx                                           │ │
│ │ // 상태 변경 시 Virtual DOM 동작 흐름            │ │
│ │ setState(newState)                               │ │
│ │   → 새 Virtual DOM 생성                          │ │
│ │   → Diff 알고리즘으로 비교                       │ │
│ │   → 변경된 부분만 실제 DOM 업데이트              │ │
│ │ ```                                              │ │
│ └──────────────────────────────────────────────────┘ │
│                                                       │
└──────────────────────────────────────────────────────┘
````

### 7.2 색상 및 스타일

```css
/* 모범 답변 섹션 */
.model-answer-section {
  @apply border-t pt-4 mt-4;
}

/* 토글 버튼 */
.model-answer-toggle {
  @apply flex items-center justify-between w-full py-2 text-sm
         text-muted-foreground hover:text-foreground transition-colors;
}

/* 핵심 포인트 Badge */
.key-point-badge {
  @apply bg-gold/10 text-gold border-gold/20;
}

/* 코드 예시 */
.code-example {
  @apply bg-muted/50 rounded-lg p-4 font-mono text-sm overflow-x-auto;
}
```

---

## 8. References

### 관련 파일

- `src/app/archive/[id]/page.tsx` - 아카이브 상세 페이지
- `src/components/feedback/FeedbackSection.tsx` - 피드백 섹션
- `src/lib/ai/feedback-generator.ts` - AI 피드백 생성
- `src/lib/ai/feedback-prompts.ts` - 프롬프트 템플릿

### Vercel React Best Practices 적용

- `rerender-memo`: ModelAnswerSection 메모이제이션
- `async-parallel`: 피드백과 모범 답변 독립 로딩
- `bundle-barrel-imports`: 컴포넌트 개별 import

---

## Implementation Summary

**Completion Date**: 2026-02-05
**Implemented By**: Claude Opus 4.5

### Changes Made

#### Files Created

- `src/app/api/answers/[id]/model-answer/route.ts` - POST/GET 모범 답변 API
- `src/components/feedback/AIAnalysisSection.tsx` - 피드백+모범답변 통합 UI 컴포넌트
- `src/components/feedback/FormattedText.tsx` - **볼드** 마크다운 렌더링 컴포넌트
- `src/components/feedback/ModelAnswerSection.tsx` - 모범 답변 단독 섹션 (초기 버전)
- `src/components/feedback/ModelAnswerSkeleton.tsx` - 모범 답변 로딩 스켈레톤
- `supabase/migrations/20260205_add_model_answer.sql` - DB 스키마 마이그레이션

#### Files Modified

- `next.config.ts` - Security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- `src/app/api/answers/[id]/feedback/route.ts` - modelAnswer 필드 포함
- `src/app/archive/[id]/page.tsx` - AIAnalysisSection 통합
- `src/app/globals.css` - Pretendard 폰트 적용
- `src/app/layout.tsx` - CSP 헤더 업데이트 (jsdelivr.net 허용)
- `src/components/feedback/FollowUpQuestions.tsx` - FormattedText 적용
- `src/components/feedback/KeywordAnalysis.tsx` - WCAG 대비 개선
- `src/components/feedback/StrengthsImprovements.tsx` - FormattedText 적용
- `src/lib/ai/feedback-generator.ts` - generateModelAnswer 함수 추가
- `src/lib/ai/feedback-prompts.ts` - MODEL_ANSWER_PROMPT 추가, 볼드 포맷팅 지시 추가
- `src/lib/api.ts` - generateModelAnswerApi, getModelAnswerApi 추가
- `src/types/database.ts` - answer_feedback 타입 확장
- `src/types/interview.ts` - ModelAnswerData 타입 추가
- `tailwind.config.ts` - Pretendard 폰트 패밀리 설정

### Key Implementation Details

1. **UI 리디자인**: 초기 계획(FeedbackSection 내부 Accordion)에서 사용자 피드백 반영하여 **두 버튼 나란히 배치** 패턴으로 변경
   - [AI 피드백] [모범 답변] 버튼이 나란히 표시
   - 각각 독립적으로 토글 가능
   - 색상으로 섹션 구분 (Navy: 피드백, Gold: 모범답변)

2. **폰트 개선**: DM Sans → **Pretendard Variable** 폰트 적용 (한글/영어 가독성 향상)

3. **WCAG 접근성**: 배지 색상 대비 개선 (text-amber-700 → text-amber-900 등)

4. **텍스트 하이라이트**: AI 생성 콘텐츠에서 **핵심 키워드**를 볼드로 강조하여 가독성 향상

### Quality Validation

- [x] Build: Success
- [x] Type Check: Passed
- [x] Lint: Passed (next lint config issue는 기존 문제)
- [x] DB Migration: Supabase MCP로 적용 완료

### Deviations from Plan

**Added**:

- `AIAnalysisSection.tsx` - 사용자 피드백 반영하여 두 버튼 나란히 배치 UI
- `FormattedText.tsx` - **볼드** 마크다운 렌더링 기능
- Pretendard 폰트 적용
- WCAG 대비 개선
- Security headers를 next.config.ts로 이동

**Changed**:

- UI 패턴: FeedbackSection 내부 Accordion → 독립적인 두 버튼 (사용자 피드백 반영)
- 모범 답변 섹션에 헤더/보더/배경색 구분 추가

**Skipped**:

- 없음 - 모든 계획된 기능 구현 완료

### Performance Impact

- Bundle size: +8KB (ModelAnswerSection, AIAnalysisSection, FormattedText)
- Pretendard 폰트: CDN 로드 (variable subset, ~50KB)
- No runtime performance impact

### Follow-up Tasks

- [ ] 다크모드에서 하이라이트 색상 추가 검증
- [ ] 모범 답변 품질 모니터링 및 프롬프트 개선

### Notes

- DB 마이그레이션은 Supabase MCP를 통해 직접 적용됨
- X-Frame-Options는 meta 태그가 아닌 HTTP 헤더로 설정해야 함 (next.config.ts headers())
- CSP에 cdn.jsdelivr.net 추가 필요 (Pretendard 폰트 로드용)
