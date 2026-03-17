# #60 수동 질문 시드 기능 추가 (Bulk Question Seeding)

**Issue**: [#60](https://github.com/kwakseongjae/dev-interview/issues/60)
**Branch**: `feat/60-bulk-question-seeding`
**Created**: 2026-03-17
**Type**: Feature
**Priority**: Medium

---

## 1. Overview

### 문제 정의

현재 질문은 사용자가 검색할 때만 생성되어 DB에 저장된다. Opus Max 플랜 사용 시 토큰이 남는 경우가 많은데, 이를 활용해 질문 DB를 사전에 채울 수단이 없다. 카테고리별 질문 분포 불균형도 파악할 수 없다.

### 목표

1. **`/seed-questions` Claude Code 커맨드**: 분석 → 추천 → 생성을 하나의 통합 흐름으로 제공
2. **`POST /api/admin/questions/seed` API**: 프로그래밍 방식의 대량 질문 생성 엔드포인트
3. **통합 흐름**: 카테고리 분포 분석 → 트렌드 갭 분석 → 부족 카테고리 추천 → 질문 생성 → 저장

### 범위

- **In Scope**: 커맨드, API 엔드포인트, 카테고리 분석, 트렌드 갭 분석, 질문 생성/저장
- **Out of Scope**: Admin UI 페이지, 질문 수동 편집 UI, 스케줄러 기반 자동 시딩

---

## 2. Requirements

### Functional Requirements

| ID   | 요구사항                                                     | 우선순위 |
| ---- | ------------------------------------------------------------ | -------- |
| FR-1 | `/seed-questions` 커맨드로 통합 흐름 실행                    | P1       |
| FR-2 | Supabase MCP로 카테고리별 질문 수 분석 및 분포 시각화        | P1       |
| FR-3 | 트렌드 토픽별 질문 커버리지 분석                             | P1       |
| FR-4 | 부족한 카테고리/트렌드 자동 추천                             | P1       |
| FR-5 | Claude Code가 직접 면접 질문 생성 (Plan 토큰 활용)           | P1       |
| FR-6 | Supabase MCP `execute_sql`로 DB 직접 적재 (텍스트 중복 체크) | P1       |
| FR-7 | `data/seeds/` JSON 파일로 생성 이력 저장 (감사 추적)         | P2       |
| FR-8 | 생성 결과 리포트 (생성 수, 중복 스킵 수, 카테고리별 내역)    | P1       |

### Technical Requirements

| ID   | 요구사항                                                       |
| ---- | -------------------------------------------------------------- |
| TR-1 | Claude Code가 직접 질문 생성 (Plan 토큰 활용, API 서버 불필요) |
| TR-2 | Supabase MCP `execute_sql`로 분석 + DB INSERT                  |
| TR-3 | `content_normalized` 텍스트 기반 중복 체크                     |
| TR-4 | `data/seeds/` JSON 파일로 생성 이력 추적                       |
| TR-5 | 커맨드 파일: `.claude/commands/seed-questions.md`              |

### Non-Functional Requirements

| ID    | 요구사항                                          |
| ----- | ------------------------------------------------- |
| NFR-1 | 한 번에 최대 50개 질문 생성 (API rate limit 고려) |
| NFR-2 | 카테고리 분석 쿼리 < 1초                          |
| NFR-3 | 기존 질문 생성 플로우에 영향 없음                 |

---

## 3. Architecture & Design

### 통합 흐름 (Single Flow)

```
/seed-questions [category] [count]
       │
       ▼
┌──────────────────────────────────────┐
│  Phase 1: ANALYZE (Supabase MCP)     │
│  ─────────────────────────────────── │
│  1. 카테고리별 질문 수 조회          │
│  2. 전체 대비 비율 계산              │
│  3. 트렌드 토픽별 질문 수 조회       │
│  4. 분포 테이블 출력                 │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  Phase 2: RECOMMEND                  │
│  ─────────────────────────────────── │
│  1. 질문 수 하위 카테고리 식별       │
│  2. 트렌드 토픽 중 질문 0~5개 식별   │
│  3. 최근 면접 트렌드 반영 추천       │
│  4. 추천 목록 + 이유 출력            │
│  5. 사용자 확인/수정 대기            │
└──────────┬───────────────────────────┘
           │ (사용자 승인)
           ▼
┌──────────────────────────────────────┐
│  Phase 3: GENERATE                   │
│  ─────────────────────────────────── │
│  1. 카테고리/토픽별 generateQuestions │
│  2. 배치당 10개씩 생성              │
│  3. storeQuestionsWithEmbeddings     │
│  4. 중복제거 (0.92 cosine)          │
│  5. 결과 리포트 출력                │
└──────────────────────────────────────┘
```

### 커맨드 사용 예시

```bash
# 자동 분석 → 추천 → 생성 (전체 흐름)
/seed-questions

# 특정 카테고리 지정
/seed-questions frontend 20

# 트렌드 토픽 지정
/seed-questions --trend llm-app-dev 15

# 전체 카테고리 균등 채우기
/seed-questions --balance 100
```

### API 엔드포인트 설계

```
POST /api/admin/questions/seed
Authorization: Bearer {ADMIN_API_KEY}

Body:
{
  "category"?: string,        // "FRONTEND", "BACKEND" 등
  "trend_topic"?: string,     // "llm-app-dev", "rag-pipeline" 등
  "count": number,            // 1-50 (기본 10)
  "difficulty"?: "EASY" | "MEDIUM" | "HARD",
  "interview_type"?: "CS" | "PROJECT" | "SYSTEM_DESIGN" | "CASE_STUDY"
}

Response:
{
  "success": true,
  "generated": 10,
  "stored": 8,
  "duplicates_skipped": 2,
  "category": "FRONTEND",
  "details": [
    { "content": "React의 Concurrent Mode...", "status": "stored" },
    { "content": "Virtual DOM의 동작 원리...", "status": "duplicate" }
  ]
}
```

### 설계 결정

| 결정              | 선택             | 이유                              |
| ----------------- | ---------------- | --------------------------------- |
| Admin UI vs CLI   | CLI (커맨드)     | 기존 워크플로우 통합, 빌드 불필요 |
| 별도 스킬 vs 통합 | 통합 흐름        | 분석→추천→생성이 자연스럽게 연결  |
| 인증 방식         | env 기반 API key | 별도 admin role 불필요, 간단      |
| 생성 배치 크기    | 10개/호출        | Claude rate limit + 품질 균형     |

---

## 4. Implementation Plan

### Phase 1: Claude Code 커맨드 (Core)

**파일 생성:**

- `.claude/commands/seed-questions.md` — 통합 커맨드 정의

**커맨드 흐름 (API 서버 불필요):**

1. **Analyze**: Supabase MCP `execute_sql`로 카테고리/트렌드 분포 분석
2. **Recommend**: 부족한 카테고리 + 트렌드 갭 자동 추천, 사용자 확인
3. **Generate**: Claude Code가 직접 질문 JSON 생성 (Plan 토큰 활용)
4. **Save**: `data/seeds/seed-{날짜}-{카테고리}.json`으로 파일 저장
5. **Insert**: Supabase MCP `execute_sql`로 DB 직접 INSERT
6. **Report**: 결과 리포트 출력

### Phase 2: `storeQuestionsWithEmbeddings` 반환 타입 개선

**파일 수정:**

- `src/lib/question-cache.ts` — 반환 타입 `void` → `StoreQuestionsResult`

**내용:**

- `{ stored: number, duplicates: number }` 반환하여 결과 추적 가능
- 기존 호출자 호환성 유지 (`.catch()` 패턴)

---

## 5. Quality Gates

### 필수 통과 조건

- [ ] `npm run build` 성공
- [ ] `npx tsc --noEmit` 타입 에러 없음
- [ ] `npx eslint src/` 린트 통과
- [ ] API 엔드포인트 인증 없이 접근 시 401 반환
- [ ] 기존 `/api/questions/generate` 플로우에 영향 없음

### 검증 방법

1. API 테스트: `curl -X POST /api/admin/questions/seed -H "Authorization: Bearer {key}"`
2. 커맨드 테스트: `/seed-questions frontend 5` 실행 후 DB 확인
3. 중복제거 테스트: 같은 카테고리로 2번 실행 → 중복 스킵 확인

---

## 6. Risks & Dependencies

| 리스크                 | 영향                          | 완화 방안                        |
| ---------------------- | ----------------------------- | -------------------------------- |
| Claude API rate limit  | 대량 생성 시 429 에러         | 배치당 10개, 배치 간 간격        |
| Voyage API rate limit  | 임베딩 생성 실패              | 배치 임베딩 (기존 인프라)        |
| 중복제거로 저장률 낮음 | 기대보다 적은 질문 저장       | 다양한 프롬프트/난이도 조합      |
| 카테고리 DB 불일치     | CATEGORY_KEYWORDS와 DB 미매칭 | 커맨드에서 DB 카테고리 직접 조회 |

---

## 7. Rollout & Monitoring

### 배포 전략

1. API 엔드포인트 + 커맨드 동시 배포
2. `ADMIN_API_KEY` 환경변수 설정 필요 (Vercel + 로컬)
3. 초기에는 소규모 테스트 (카테고리당 5개)

### 성공 지표

- 카테고리별 최소 20개 질문 확보
- 트렌드 토픽별 최소 10개 질문 확보
- 캐시 히트율 향상 추적 (before/after)

---

## 8. Timeline & Milestones

| 단계 | 내용                       | 예상 |
| ---- | -------------------------- | ---- |
| M1   | API 엔드포인트 구현        | 핵심 |
| M2   | Claude Code 커맨드 작성    | 핵심 |
| M3   | 통합 테스트 + 첫 시딩 실행 | 검증 |

---

## 9. References

- [#58 시맨틱 캐싱 계획](./058-token-optimization-semantic-caching.md) — 임베딩/캐싱 인프라
- `src/lib/claude.ts` — 질문 생성 모듈
- `src/lib/question-cache.ts` — 시맨틱 캐시 + 저장
- `src/lib/embedding.ts` — Voyage AI 임베딩
- `src/data/trend-topics.ts` — 트렌드 토픽 정의
- `src/app/api/questions/generate/route.ts` — 기존 생성 API

---

## 10. Implementation Summary

**Completion Date**: 2026-03-17
**Implemented By**: Claude Opus 4.6

### Changes Made

#### Files Created

- [`.claude/commands/seed-questions.md`](.claude/commands/seed-questions.md) — `/seed-questions` 통합 커맨드 정의 (분석→추천→생성→적재 워크플로우)
- [`data/seeds/seed-2026-03-17-frontend.json`](data/seeds/seed-2026-03-17-frontend.json) — 테스트 시드 실행 결과 (FRONTEND 3개)
- [`docs/plans/060-bulk-question-seeding.md`](docs/plans/060-bulk-question-seeding.md) — 본 계획 문서

#### Files Modified

- [`src/lib/question-cache.ts`](src/lib/question-cache.ts#L298-301) — `StoreQuestionsResult` 인터페이스 추가, `storeQuestionsWithEmbeddings` 반환 타입 `void` → `StoreQuestionsResult`

#### Key Implementation Details

- **접근 방식 변경**: API 엔드포인트 + ADMIN_API_KEY 방식 → Claude Code가 직접 생성 + Supabase MCP로 DB 적재 방식으로 전환 (사용자 피드백 반영)
- API 엔드포인트(`src/app/api/admin/questions/seed/route.ts`)는 생성 후 삭제
- 커맨드가 Supabase MCP를 직접 호출하여 분석/적재, Voyage/Claude API 호출 없이 Plan 토큰만 사용
- `content_normalized` 텍스트 기반 중복 체크로 임베딩 없이도 중복 방지

### Quality Validation

- [x] Build: Success
- [x] Type Check: Passed
- [x] Lint: Passed

### Deviations from Plan

**Changed**:

- API 엔드포인트 방식 → Claude Code 직접 생성 방식으로 전환 (Plan 토큰 활용 취지에 부합)
- 임베딩 기반 중복제거 → 텍스트 기반 중복 체크 (Voyage API 호출 절약)

**Added**:

- Red Team 분석으로 기존 질문 DB의 중복 취약점 발견 → 별도 이슈 [#61](https://github.com/kwakseongjae/dev-interview/issues/61) 생성

**Skipped**:

- `--balance` 모드 (균등 배분) — 커맨드에 정의는 했으나 테스트는 미실행

### Test Results

- `/seed-questions frontend 3` 실행 → FRONTEND 질문 3개 생성, DB 적재, 중복 0건 확인
- 기존 DB 질문과 교차 중복 없음 검증 완료

### Follow-up Tasks

- [ ] #61 - 질문 DB 중복 적재 취약점 수정 (UNIQUE 인덱스, INSERT 경로별 중복 체크)
- [ ] 대규모 시딩 테스트 (카테고리당 20개+)
- [ ] 시딩된 질문에 배치 임베딩 추가 파이프라인
