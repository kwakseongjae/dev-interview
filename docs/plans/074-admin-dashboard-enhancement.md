# #74 관리자 대시보드 확장 — 에러 모니터링 + API 토큰 관리

## Overview

**문제**: 기존 관리자 대시보드(`/admin`)는 세션/사용자 통계만 제공. 에러 발생이나 API 토큰 부족 상황을 빠르게 파악하고 대응할 수 없음.

**목표**: 기존 대시보드를 확장하여 (1) 에러 모니터링, (2) API 토큰 사용량 추적 및 충전 딥링크 기능을 추가.

**범위**:

- 기존 `/admin` 페이지에 탭 네비게이션 추가 (개요 / 에러 / API 사용량)
- 에러 로그 DB 테이블 + 자동 기록 + 대시보드 표시
- `answer_feedback` 테이블의 기존 토큰 데이터 활용한 사용량 시각화
- Anthropic 콘솔 충전 딥링크

---

## Requirements

### 기능 요구사항 (FR)

| ID   | 요구사항                                               | 우선순위 |
| ---- | ------------------------------------------------------ | -------- |
| FR-1 | 대시보드에 탭 네비게이션 추가 (개요/에러/API 사용량)   | HIGH     |
| FR-2 | 에러 로그 테이블 생성 (DB) + API 에러 자동 기록        | HIGH     |
| FR-3 | 에러 로그 대시보드 (목록, 유형별 필터, 발생 빈도 차트) | HIGH     |
| FR-4 | API 토큰 사용량 시각화 (일별 추이, 모델별 분류)        | HIGH     |
| FR-5 | 토큰 부족 임계치 경고 표시                             | MEDIUM   |
| FR-6 | Anthropic 콘솔 충전 딥링크                             | HIGH     |
| FR-7 | API 응답 헤더에서 rate limit 잔량 추출                 | MEDIUM   |

### 기술 요구사항 (TR)

| ID   | 요구사항                                                   |
| ---- | ---------------------------------------------------------- |
| TR-1 | `api_error_logs` 테이블 마이그레이션                       |
| TR-2 | 기존 `answer_feedback` 토큰 데이터 활용 (새 테이블 불필요) |
| TR-3 | Recharts (이미 설치됨) 활용                                |
| TR-4 | 기존 관리자 인증 패턴 그대로 사용                          |

---

## Architecture & Design

### 1. 탭 기반 대시보드 구조

```
/admin (기존)
├── 탭: 개요 (기존 StatCards + 차트)
├── 탭: 에러 로그 (NEW)
│   ├── 에러 빈도 차트 (AreaChart)
│   ├── 에러 유형별 분포 (BarChart)
│   └── 에러 로그 테이블 (필터링 + 페이지네이션)
└── 탭: API 사용량 (NEW)
    ├── 토큰 사용량 KPI 카드 (오늘/이번 주/이번 달)
    ├── 일별 토큰 소비 추이 (LineChart)
    ├── 모델별 사용량 분포 (BarChart)
    ├── 기능별 사용량 분포 (pre_gen / detail / model_answer)
    ├── 토큰 부족 경고 배너
    └── Anthropic 콘솔 충전 링크
```

### 2. DB 스키마: `api_error_logs` 테이블

```sql
CREATE TABLE api_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type text NOT NULL,          -- 'api_error' | 'token_limit' | 'timeout' | 'unknown'
  error_message text NOT NULL,
  error_code text,                   -- HTTP status or API error code
  endpoint text,                     -- Which API route triggered it
  user_id uuid REFERENCES users(id),
  session_id uuid REFERENCES interview_sessions(id),
  metadata jsonb DEFAULT '{}',       -- Additional context (model, tokens_requested, etc.)
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_error_logs_created_at ON api_error_logs(created_at DESC);
CREATE INDEX idx_error_logs_error_type ON api_error_logs(error_type);
```

### 3. 토큰 사용량 데이터 소스

**이미 존재하는 데이터** (`answer_feedback` 테이블):

- `pre_gen_tokens`: 빠른 피드백 생성 토큰
- `detail_tokens`: 상세 피드백 생성 토큰
- `model_answer_tokens`: 모답 생성 토큰
- `pre_gen_model`, `detail_model`, `model_answer_model`: 사용 모델
- `created_at`, `detail_generated_at`, `model_answer_generated_at`: 타임스탬프

→ 별도 토큰 추적 테이블 불필요. 기존 데이터를 집계하여 사용량 시각화.

### 4. 에러 로깅 통합

Claude API 호출 시 에러를 자동 기록:

```typescript
// src/lib/claude.ts 에 에러 로깅 래퍼 추가
async function logApiError(params: {
  error_type: string;
  error_message: string;
  error_code?: string;
  endpoint?: string;
  user_id?: string;
  session_id?: string;
  metadata?: Record<string, unknown>;
}) {
  await supabaseAdmin.from("api_error_logs").insert(params);
}
```

---

## Implementation Plan

### Phase 1: DB 마이그레이션 + 에러 로깅 인프라

**파일**:

- `supabase/migrations/YYYYMMDD_add_api_error_logs.sql` (NEW)
- `src/lib/claude.ts` (MODIFY — 에러 로깅 래퍼 추가)
- `src/lib/feedback-generator.ts` (MODIFY — 에러 로깅 통합)
- `src/types/database.ts` (MODIFY — `api_error_logs` 타입 추가)

### Phase 2: API 엔드포인트

**파일**:

- `src/app/api/admin/errors/route.ts` (NEW — 에러 로그 조회 API)
- `src/app/api/admin/token-usage/route.ts` (NEW — 토큰 사용량 집계 API)
- `src/app/api/admin/stats/route.ts` (MODIFY — 에러/토큰 요약 추가)

### Phase 3: 대시보드 UI 확장

**파일**:

- `src/app/admin/page.tsx` (MODIFY — 탭 네비게이션 추가)
- `src/app/admin/_components/admin-tabs.tsx` (NEW — 탭 컨트롤러)
- `src/app/admin/_components/error-log-table.tsx` (NEW)
- `src/app/admin/_components/error-trend-chart.tsx` (NEW)
- `src/app/admin/_components/token-usage-cards.tsx` (NEW)
- `src/app/admin/_components/token-usage-chart.tsx` (NEW)
- `src/app/admin/_components/token-alert-banner.tsx` (NEW)
- `src/app/admin/_components/anthropic-recharge-link.tsx` (NEW)

---

## Quality Gates

- [x] `npm run build` 성공
- [x] `npx tsc --noEmit` 통과
- [x] `npx eslint src/` 통과
- [ ] 관리자 계정으로 대시보드 접근 가능
- [ ] 비관리자 접근 차단 확인
- [ ] 에러 로그 필터링 동작 확인
- [ ] 토큰 사용량 차트 데이터 표시 확인
- [ ] 반응형 레이아웃 확인

---

## Risks & Dependencies

| 리스크                                       | 완화 방안                                                 |
| -------------------------------------------- | --------------------------------------------------------- |
| Anthropic Admin API는 Organization 계정 필요 | DB 기반 토큰 추적으로 대체 (answer_feedback 테이블 활용)  |
| 에러 로그 테이블 성장                        | created_at 인덱스 + 90일 이전 자동 삭제 정책 고려         |
| 토큰 임계치 기준 불명확                      | 일 평균 사용량 대비 비율로 경고 (예: 일 평균의 150% 초과) |

---

## References

- GitHub Issue: [#74](https://github.com/kwakseongjae/dev-interview/issues/74)
- 기존 대시보드: `src/app/admin/`
- 기존 API: `src/app/api/admin/stats/route.ts`
- 토큰 데이터: `answer_feedback` 테이블 (`pre_gen_tokens`, `detail_tokens`, `model_answer_tokens`)
- Anthropic Console: `https://console.anthropic.com/settings/billing`

---

## Implementation Summary

**Completion Date**: 2026-04-01
**Implemented By**: Claude Opus 4.6

### Changes Made

#### New Files (7)

- `supabase/migrations/20260401_add_api_error_logs.sql` — api_error_logs 테이블 + RLS + 인덱스
- `src/lib/error-logger.ts` — API 에러 분류(token_limit/rate_limit/timeout/embedding/api_error) + DB 로깅 유틸리티
- `src/app/api/admin/errors/route.ts` — 에러 로그 조회 API (기간/유형 필터, 일별 추이, 유형별 분포)
- `src/app/api/admin/token-usage/route.ts` — answer_feedback 기반 토큰 사용량 집계 API (KPI, 일별 추이, 기능별/모델별 분류, 경고)
- `src/app/admin/_components/error-log-panel.tsx` — 에러 모니터링 패널 (AreaChart + BarChart + 필터링 테이블)
- `src/app/admin/_components/token-usage-panel.tsx` — 토큰 사용량 패널 (KPI 카드 + LineChart + 기능별 BarChart + 경고 배너 + 충전 딥링크)

#### Modified Files (4)

- `src/app/admin/page.tsx` — 단일 페이지 → 탭 3개 구조 (개요/에러 로그/API 사용량)
- `src/app/admin/layout.tsx` — 헤더에 홈 이동 뒤로가기 버튼 추가
- `src/lib/claude.ts` — generateQuestions, evaluateAnswer에 에러 자동 로깅 통합
- `src/types/database.ts` — api_error_logs 테이블 타입 + ApiErrorLog 편의 타입 추가

### Quality Validation

- [x] Build: Success
- [x] Type Check: Passed
- [x] Lint: Passed

### Deviations from Plan

**Changed**:

- 계획에서 6개 컴포넌트(admin-tabs, error-log-table, error-trend-chart, token-usage-cards, token-usage-chart, token-alert-banner + anthropic-recharge-link)를 별도 파일로 분리 예정이었으나, error-log-panel.tsx와 token-usage-panel.tsx 2개의 통합 컴포넌트로 구현. 각 패널이 차트, 테이블, 경고 배너를 모두 포함하여 파일 수 감소 및 데이터 흐름 단순화.
- 기존 stats API 수정 대신 별도 errors, token-usage API 엔드포인트 생성하여 관심사 분리

**Added**:

- Voyage AI 대시보드 딥링크 (임베딩 API 관리용)
- 홈 이동 뒤로가기 버튼 (layout.tsx)

**Skipped**:

- `src/app/api/admin/stats/route.ts` 수정 (별도 API로 분리하여 불필요)
- `src/lib/ai/feedback-generator.ts` 에러 로깅 통합 (claude.ts에서 이미 커버)

### Follow-up Tasks

- [ ] Supabase에 migration 실행 (`supabase db push` 또는 대시보드에서 SQL 실행)
- [ ] 에러 로그 90일 자동 삭제 cron job 설정 (선택)
