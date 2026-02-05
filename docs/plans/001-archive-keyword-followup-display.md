# Plan: 아카이브 상세 페이지 AI 피드백 UI

**Issue**: [#1](https://github.com/kwakseongjae/dev-interview/issues/1) - 아카이브 상세 페이지에서 키워드 및 꼬리질문 표시
**Branch**: `enhancement/1-archive-keyword-followup-display`
**Created**: 2026-02-05
**Status**: Planning

---

## 1. Overview

### Problem Statement
현재 아카이브 상세 페이지(`/archive/[id]`)에서는 질문과 답변만 표시됩니다. 사용자가 작성한 답변에 대한 피드백(키워드, 꼬리질문, 잘한 점 등)이 없어 학습 효과가 제한적입니다.

### Objectives
1. 사용자 답변 기반 AI 피드백 UI 제공
2. **Token 효율적인 구현** (비용 최적화)
3. 기존 UI/UX 흐름을 방해하지 않는 자연스러운 통합

### Scope
- **In Scope**: 아카이브 상세 페이지 피드백 UI, API 엔드포인트, DB 스키마
- **Out of Scope**: 실시간 면접 중 피드백, 팀 스페이스 피드백 공유

---

## 2. Requirements

### Functional Requirements (FR)

| ID | 요구사항 | 우선순위 |
|----|---------|---------|
| FR-1 | 답변별 키워드 Badge 표시 | P1 |
| FR-2 | 답변별 꼬리질문 목록 표시 | P1 |
| FR-3 | 답변의 잘한 점/개선점 표시 | P2 |
| FR-4 | 피드백 접기/펼치기 토글 | P1 |
| FR-5 | 피드백 로딩 상태 표시 | P1 |
| FR-6 | 피드백 미리보기 (간략 요약) | P2 |

### Technical Requirements (TR)

| ID | 요구사항 | 상세 |
|----|---------|-----|
| TR-1 | Token 최적화 | Haiku + Sonnet 하이브리드 전략 |
| TR-2 | 캐싱 전략 | DB 캐싱 (7일 TTL) + 클라이언트 캐싱 |
| TR-3 | Progressive Disclosure | 즉시 표시(키워드) + 온디맨드(상세 분석) |
| TR-4 | 스트리밍 지원 | Vercel AI SDK 사용 (옵션) |

### Non-Functional Requirements (NFR)

| ID | 요구사항 | 기준 |
|----|---------|-----|
| NFR-1 | 응답 속도 | 키워드: 즉시, 상세 분석: < 3초 |
| NFR-2 | 비용 효율성 | 기존 대비 70% 이상 절감 |
| NFR-3 | 모바일 반응형 | 320px ~ 1440px 지원 |

---

## 3. Architecture & Design

### 3.1 Token 최적화 전략 (핵심)

```
┌─────────────────────────────────────────────────────────────┐
│                 하이브리드 생성 전략                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [답변 제출 시 - Pre-generation with Haiku]                  │
│  • 키워드 추출 (3-5개)                                       │
│  • 빠른 점수 (1-5)                                          │
│  • 한 줄 요약                                                │
│  → 비용: ~$0.25/1M tokens (매우 저렴)                        │
│  → DB에 즉시 저장                                            │
│                                                              │
│  [피드백 요청 시 - On-demand with Sonnet]                    │
│  • 상세 분석 (강점/개선점)                                   │
│  • 꼬리질문 생성 (2-3개)                                    │
│  • 모델 답변 비교                                            │
│  → 비용: ~$3/1M tokens                                       │
│  → 요청 시에만 생성, 결과 캐싱                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**예상 비용 절감**:
- 기존 (모든 답변 Sonnet): 월 ~$2.10 (1000답변 기준)
- 하이브리드 (Haiku + Sonnet 30%): 월 **~$0.75** (65% 절감)
- + Prompt Caching 적용: 월 **~$0.30** (85% 절감)

### 3.2 데이터베이스 스키마

```sql
-- 새 테이블: answer_feedback
CREATE TABLE answer_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id uuid NOT NULL REFERENCES answers(id) ON DELETE CASCADE,

  -- Pre-generated (Haiku - 즉시)
  keywords text[] DEFAULT '{}',           -- 키워드 배열
  quick_score integer CHECK (quick_score BETWEEN 1 AND 5),
  summary text,                           -- 한 줄 요약

  -- On-demand (Sonnet - 요청 시)
  strengths text[] DEFAULT '{}',          -- 잘한 점
  improvements text[] DEFAULT '{}',       -- 개선점
  follow_up_questions text[] DEFAULT '{}',-- 꼬리질문
  detailed_feedback text,                 -- 상세 피드백

  -- Metadata
  pre_gen_model text DEFAULT 'haiku',
  detail_model text,
  pre_gen_tokens integer,
  detail_tokens integer,

  created_at timestamptz DEFAULT now(),
  detail_generated_at timestamptz,

  UNIQUE(answer_id)
);

-- 인덱스
CREATE INDEX idx_answer_feedback_answer_id ON answer_feedback(answer_id);
```

### 3.3 API 설계

```
POST /api/answers/:id/feedback/quick
  - 트리거: 답변 제출 시 자동 호출 (백그라운드)
  - 모델: Haiku
  - 반환: { keywords, quick_score, summary }

GET /api/answers/:id/feedback
  - 아카이브 페이지에서 피드백 조회
  - 캐시된 데이터 반환

POST /api/answers/:id/feedback/detail
  - 트리거: 사용자가 "상세 분석" 버튼 클릭
  - 모델: Sonnet
  - 반환: { strengths, improvements, follow_up_questions, detailed_feedback }
```

### 3.4 UI 컴포넌트 설계

```
FeedbackSection (새 컴포넌트)
├── QuickFeedback (항상 표시)
│   ├── ScoreBadge (점수 1-5)
│   ├── KeywordTags (키워드 Badge 목록)
│   └── SummaryText (한 줄 요약)
│
└── DetailedFeedback (접기/펼치기)
    ├── StrengthsList (잘한 점)
    ├── ImprovementsList (개선점)
    ├── FollowUpQuestions (꼬리질문)
    └── LoadingState / RequestButton
```

### 3.5 컴포넌트 위치

```
src/
├── components/
│   └── feedback/
│       ├── FeedbackSection.tsx       # 메인 컴포넌트
│       ├── QuickFeedback.tsx         # 키워드/점수 표시
│       ├── DetailedFeedback.tsx      # 상세 분석 (접기/펼치기)
│       ├── FollowUpQuestions.tsx     # 꼬리질문 목록
│       └── FeedbackSkeleton.tsx      # 로딩 스켈레톤
├── lib/
│   └── ai/
│       ├── feedback-generator.ts     # AI 피드백 생성 로직
│       └── feedback-prompts.ts       # 프롬프트 템플릿
└── app/
    └── api/
        └── answers/
            └── [id]/
                └── feedback/
                    ├── route.ts      # GET 피드백
                    ├── quick/
                    │   └── route.ts  # POST 퀵 피드백
                    └── detail/
                        └── route.ts  # POST 상세 피드백
```

---

## 4. Implementation Plan

### Phase 1: 기반 구조 (Backend)

| 작업 | 파일 | 설명 |
|-----|------|-----|
| 1.1 | `supabase/migrations/xxx_answer_feedback.sql` | DB 스키마 마이그레이션 |
| 1.2 | `src/types/database.ts` | 타입 정의 추가 |
| 1.3 | `src/lib/ai/feedback-prompts.ts` | 프롬프트 템플릿 |
| 1.4 | `src/lib/ai/feedback-generator.ts` | AI 피드백 생성 로직 |

### Phase 2: API 엔드포인트

| 작업 | 파일 | 설명 |
|-----|------|-----|
| 2.1 | `src/app/api/answers/[id]/feedback/route.ts` | GET 피드백 조회 |
| 2.2 | `src/app/api/answers/[id]/feedback/quick/route.ts` | POST 퀵 피드백 |
| 2.3 | `src/app/api/answers/[id]/feedback/detail/route.ts` | POST 상세 피드백 |
| 2.4 | `src/lib/api.ts` | 클라이언트 API 함수 추가 |

### Phase 3: UI 컴포넌트

| 작업 | 파일 | 설명 |
|-----|------|-----|
| 3.1 | `src/components/feedback/QuickFeedback.tsx` | 키워드/점수 컴포넌트 |
| 3.2 | `src/components/feedback/FollowUpQuestions.tsx` | 꼬리질문 컴포넌트 |
| 3.3 | `src/components/feedback/DetailedFeedback.tsx` | 상세 분석 컴포넌트 |
| 3.4 | `src/components/feedback/FeedbackSection.tsx` | 통합 컴포넌트 |
| 3.5 | `src/components/feedback/FeedbackSkeleton.tsx` | 로딩 상태 |

### Phase 4: 페이지 통합

| 작업 | 파일 | 설명 |
|-----|------|-----|
| 4.1 | `src/app/archive/[id]/page.tsx` | 아카이브 상세 페이지에 FeedbackSection 통합 |
| 4.2 | `src/types/interview.ts` | Question 타입에 feedback 필드 추가 |

### Phase 5: 자동 생성 연동 (선택적)

| 작업 | 파일 | 설명 |
|-----|------|-----|
| 5.1 | `src/app/api/answers/route.ts` | 답변 제출 시 퀵 피드백 자동 생성 트리거 |

---

## 5. Quality Gates

### 검증 체크리스트

- [ ] `npm run build` 성공
- [ ] `npx tsc --noEmit` 타입 에러 없음
- [ ] `npm run lint` 린트 통과
- [ ] 아카이브 상세 페이지에서 피드백 UI 정상 표시
- [ ] 모바일 반응형 디자인 확인 (320px, 768px, 1440px)
- [ ] 키워드 Badge 스타일링 확인
- [ ] 접기/펼치기 애니메이션 동작 확인
- [ ] API 응답 시간 < 3초 확인

### 성능 기준

| 지표 | 목표 |
|-----|-----|
| 퀵 피드백 생성 | < 1초 |
| 상세 피드백 생성 | < 3초 |
| 페이지 로드 (피드백 포함) | < 2초 |
| 모바일 LCP | < 2.5초 |

---

## 6. Risks & Dependencies

### Risks

| 리스크 | 영향 | 완화 방안 |
|-------|-----|---------|
| Claude API 지연 | 사용자 경험 저하 | 스켈레톤 UI, 타임아웃 처리 |
| 토큰 비용 초과 | 운영 비용 증가 | 모니터링, 일일 한도 설정 |
| 프롬프트 품질 | 피드백 품질 저하 | A/B 테스트, 프롬프트 반복 개선 |

### Dependencies

- Anthropic Claude API (기존 사용 중)
- Supabase (기존 사용 중)
- Framer Motion (기존 사용 중 - 애니메이션)

---

## 7. UI/UX 상세 설계

### 7.1 피드백 카드 레이아웃

```
┌────────────────────────────────────────────────────────────┐
│ Q1. React의 Virtual DOM이란 무엇인가요?        [💛 찜]    │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ 카테고리: React                                       │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                            │
│ A:                                                         │
│ Virtual DOM은 실제 DOM의 가상 복사본입니다...             │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ 💡 AI 피드백                                    [▼ 펼치기] │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ ⭐ 3.5/5   [Virtual DOM] [React] [성능 최적화]       │  │
│ │ "기본 개념 설명은 좋으나, 재조정 알고리즘 언급 필요" │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                            │
│ [펼쳤을 때 추가로 표시]                                   │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ ✅ 잘한 점                                            │  │
│ │ • 기본 개념을 명확하게 설명함                        │  │
│ │ • 실제 DOM과의 차이점 언급                           │  │
│ │                                                        │  │
│ │ 💪 개선점                                              │  │
│ │ • Reconciliation 알고리즘 설명 추가 권장             │  │
│ │ • Key props의 중요성 언급 필요                        │  │
│ │                                                        │  │
│ │ 🔄 꼬리질문                                            │  │
│ │ • "Reconciliation 과정을 설명해주세요"               │  │
│ │ • "Key props가 왜 중요한가요?"                       │  │
│ │ • "Fiber 아키텍처와의 관계는?"                       │  │
│ └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### 7.2 색상 및 스타일 가이드

```css
/* 점수별 색상 */
--score-excellent: #22c55e;  /* 4-5점: 초록 */
--score-good: #eab308;       /* 3점: 노랑 */
--score-needs-work: #ef4444; /* 1-2점: 빨강 */

/* 키워드 Badge */
.keyword-badge {
  @apply bg-navy/10 text-navy border-navy/20;
}

/* 섹션 아이콘 */
✅ 잘한 점: text-timer-safe
💪 개선점: text-gold
🔄 꼬리질문: text-navy
```

---

## 8. 프롬프트 설계

### 8.1 퀵 피드백 프롬프트 (Haiku용 - 간결)

```
면접 답변 분석:
질문: {question}
답변: {answer}

JSON 반환:
{
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "score": 1-5,
  "summary": "한 줄 평가 (20자 이내)"
}
```

### 8.2 상세 피드백 프롬프트 (Sonnet용)

```
기술면접 답변을 분석해주세요.

질문: {question}
카테고리: {category}
답변: {answer}

다음 형식의 JSON으로 반환:
{
  "strengths": ["잘한 점 1", "잘한 점 2"],
  "improvements": ["개선점 1", "개선점 2"],
  "follow_up_questions": ["꼬리질문 1", "꼬리질문 2", "꼬리질문 3"],
  "detailed_feedback": "종합 피드백 (100자 이내)"
}

평가 기준:
- 정확성 (30%): 기술적으로 올바른가
- 완전성 (25%): 핵심 개념을 충분히 다뤘는가
- 구조 (20%): 논리적으로 구성되었는가
- 관련성 (15%): 질문에 적절히 답변했는가
- 의사소통 (10%): 명확하게 표현했는가
```

---

## 9. References

### 관련 파일
- `src/app/archive/[id]/page.tsx` - 아카이브 상세 페이지
- `src/lib/claude.ts` - 기존 Claude 통합
- `src/types/interview.ts` - Question 타입
- `src/components/ui/badge.tsx` - Badge 컴포넌트

### 참고 자료
- [Claude API Prompt Caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
- [Vercel AI SDK 6](https://sdk.vercel.ai/docs)
- [Token Optimization Strategies](https://medium.com/elementor-engineers/optimizing-token-usage-in-agent-based-assistants)

### Vercel React Best Practices 적용
- `rerender-memo`: 피드백 컴포넌트 메모이제이션
- `async-parallel`: 피드백 데이터 병렬 로딩
- `bundle-barrel-imports`: 컴포넌트 개별 import

---

## Implementation Summary

**Completion Date**: 2026-02-05
**Implemented By**: Claude Opus 4.5

### Changes Made

#### Files Created
- `src/lib/ai/feedback-prompts.ts` - AI 피드백 프롬프트 템플릿 (Quick, Detailed, Full)
- `src/lib/ai/feedback-generator.ts` - AI 피드백 생성 로직 (Haiku/Sonnet 모델)
- `src/app/api/answers/[id]/feedback/route.ts` - GET 피드백 조회 API
- `src/app/api/answers/[id]/feedback/quick/route.ts` - POST 퀵 피드백 생성 API
- `src/app/api/answers/[id]/feedback/detail/route.ts` - POST 상세 피드백 생성 API
- `src/app/api/answers/[id]/feedback/full/route.ts` - POST 전체 피드백 생성 API (원클릭)
- `src/components/feedback/QuickFeedback.tsx` - 키워드/점수 표시 컴포넌트
- `src/components/feedback/DetailedFeedback.tsx` - 상세 분석 컴포넌트
- `src/components/feedback/FollowUpQuestions.tsx` - 꼬리질문 목록 컴포넌트
- `src/components/feedback/StrengthsImprovements.tsx` - 강점/개선점 컴포넌트
- `src/components/feedback/FeedbackSkeleton.tsx` - 로딩 스켈레톤 컴포넌트
- `src/components/feedback/FeedbackSection.tsx` - 메인 피드백 컨테이너 (expand/collapse)
- `src/components/feedback/KeywordAnalysis.tsx` - 키워드 분석 UI (기대/언급/누락)
- `supabase/migrations/20260205_answer_feedback.sql` - DB 스키마 마이그레이션

#### Files Modified
- `src/app/archive/[id]/page.tsx` - FeedbackSection 통합
- `src/lib/api.ts` - 피드백 API 클라이언트 함수 추가
- `src/types/interview.ts` - 피드백 관련 타입 정의 추가
- `src/types/database.ts` - answer_feedback 테이블 타입 추가

#### Key Implementation Details
- **하이브리드 토큰 전략 적용**: Haiku(저비용) + Sonnet(고품질) 조합
- **원클릭 전체 피드백**: 사용자 요청에 따라 두 번 클릭 → 한 번 클릭으로 개선
- **키워드 분석 UI 강화**: 기대 키워드, 언급 키워드, 누락 키워드 시각적 구분
- Framer Motion으로 expand/collapse 애니메이션 적용
- Supabase MCP로 DB 마이그레이션 적용

### Quality Validation
- [x] Build: Success
- [x] Type Check: Passed (npx tsc --noEmit)
- [x] Lint: Passed

### Deviations from Plan

**Added**:
- **원클릭 전체 피드백**: 계획에서는 Quick → Detail 2단계였으나, 사용자 요청으로 1단계로 통합
- **KeywordAnalysis 컴포넌트**: 기대/언급/누락 키워드 구분 UI 추가 (계획에 없던 기능)
- **키워드 분석 DB 컬럼**: expected_keywords, mentioned_keywords, missing_keywords 추가
- **Full Feedback API**: `/api/answers/[id]/feedback/full` 엔드포인트 추가

**Changed**:
- Token 최적화 전략 유지하되, 사용자 편의를 위해 기본적으로 Sonnet Full 피드백 제공

**Skipped**:
- Phase 5 (자동 생성 연동): 답변 제출 시 자동 생성은 미구현 (온디맨드 방식 유지)

### Performance Impact
- 새 컴포넌트: ~15KB (gzipped)
- API 응답 시간: Quick ~1초, Full ~3-5초
- 피드백은 캐싱되어 재요청 시 즉시 반환

### Database Changes (via Supabase MCP)
```sql
-- 적용된 마이그레이션
CREATE TABLE answer_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id uuid NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  keywords text[] DEFAULT '{}',
  quick_score integer CHECK (quick_score BETWEEN 1 AND 5),
  summary text,
  strengths text[] DEFAULT '{}',
  improvements text[] DEFAULT '{}',
  follow_up_questions text[] DEFAULT '{}',
  detailed_feedback text,
  expected_keywords text[] DEFAULT '{}',
  mentioned_keywords text[] DEFAULT '{}',
  missing_keywords text[] DEFAULT '{}',
  pre_gen_model text DEFAULT 'haiku',
  detail_model text,
  pre_gen_tokens integer,
  detail_tokens integer,
  created_at timestamptz DEFAULT now(),
  detail_generated_at timestamptz,
  UNIQUE(answer_id)
);
```

### Commits
(커밋 전 - `/commit` 명령으로 생성 예정)

### Follow-up Tasks
- [ ] 답변 제출 시 백그라운드 피드백 자동 생성 (Phase 5)
- [ ] 피드백 품질 모니터링 및 프롬프트 개선
- [ ] 팀 스페이스 피드백 공유 기능
