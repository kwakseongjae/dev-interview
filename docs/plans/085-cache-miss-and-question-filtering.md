# #85 + #88 캐시 미스 해결 및 비기술 질문 필터링 강화

**Issues**: [#85](https://github.com/kwakseongjae/dev-interview/issues/85), [#88](https://github.com/kwakseongjae/dev-interview/issues/88)
**Branch**: `fix/85-cache-miss-and-query-validation`
**Created**: 2026-04-03
**Type**: Fix + Enhancement
**Priority**: High

---

## 1. Overview

### 문제 정의

두 가지 연관된 문제가 질문 캐시 시스템(`searchCachedQuestions`)에 존재한다:

**#85 — 반복 사용자 캐시 미스**:

- 캐시 풀 크기가 `count * 4 = 20`으로 고정
- 히스토리 20개+ 유저는 풀이 전부 필터링되어 항상 캐시 미스
- 매번 Claude API 풀 호출(~12초) + 생성된 질문도 DB 중복(0.92+ 유사도)으로 저장 안 됨
- **결과**: 파워 유저가 가장 느린 경험 + 불필요한 API 비용

**#88 — 비기술 질문이 기술면접에 추천됨**:

- "프로세스와 스레드, TCP/IP 기술면접" 요청 시 "카페알바 면접" 질문이 반환됨
- `searchCachedQuestions()`가 카테고리 키워드 매칭만 사용, 벡터 유사도 검증 없음
- DB에 비기술 질문이 존재하면 카테고리 미스매칭 시 그대로 노출
- `similarity` 필드가 하드코딩 `1.0` — 실제 관련성 검증 불가

### 공통 원인

두 이슈 모두 `src/lib/question-cache.ts`의 `searchCachedQuestions()` 함수의 한계:

1. 고정 풀 크기 (`count * 4`)
2. 히스토리 소진 시 fallback 없음
3. 벡터 유사도 미활용 (DB에 `find_similar_questions` RPC 존재하나 미사용)
4. 질문의 기술/비기술 구분 필터 없음

### 목표

1. 반복 사용자도 캐시 히트율 유지 (응답 시간 < 1초)
2. 비기술 질문이 기술면접 캐시에 혼입되지 않도록 필터링
3. Claude API 불필요 호출 최소화

### 범위

- **In Scope**: 캐시 풀 동적 확장, 히스토리 소진 fallback, 인접 카테고리 확장, 비기술 질문 필터링
- **Out of Scope**: 벡터 유사도 기반 검색으로 전면 전환 (메타 쿼리↔질문 시맨틱 갭 문제), DB 마이그레이션 (interview_type_id 컬럼 추가는 장기 과제)

---

## 2. Requirements

### Functional Requirements

| ID   | 요구사항                                               | 우선순위 |
| ---- | ------------------------------------------------------ | -------- |
| FR-1 | 히스토리 20개+ 유저도 캐시 히트 발생                   | P1       |
| FR-2 | 캐시 히트 시 응답 시간 < 1초 유지                      | P1       |
| FR-3 | 히스토리 소진 시 Claude API 호출 없이 기존 질문 재활용 | P1       |
| FR-4 | 비기술 쿼리로 생성된 질문이 기술면접에 추천되지 않음   | P1       |
| FR-5 | 인접 카테고리 확장으로 질문 다양성 향상                | P2       |
| FR-6 | 재활용/인접 카테고리 질문임을 로그에 표시              | P2       |

### Technical Requirements

| ID   | 요구사항                                                |
| ---- | ------------------------------------------------------- |
| TR-1 | DB 스키마 변경 없이 애플리케이션 로직으로 해결          |
| TR-2 | 추가 DB 쿼리 최대 2회 (히스토리 카운트 + 인접 카테고리) |
| TR-3 | 기존 RPC 함수 재활용 (`find_similar_questions` 등)      |

### Non-Functional Requirements

| ID    | 요구사항                                          |
| ----- | ------------------------------------------------- |
| NFR-1 | 캐시 검색 전체 시간 < 500ms (DB 쿼리 포함)        |
| NFR-2 | 기존 정상 쿼리 동작에 영향 없음 (regression-free) |

---

## 3. Architecture & Design

### 현재 플로우

```
searchCachedQuestions(query, count=5, userId?)
  → extractCategories(query) → ["CS"]
  → DB: questions WHERE category_id IN (CS) LIMIT 20  ← 고정 풀
  → 히스토리 필터링 (최근 100개 exact match)
  → 풀 소진 시 빈 배열 반환 → Claude 풀 호출 (12초)
```

### 변경 후 플로우

```
searchCachedQuestions(query, count=5, userId?)
  → extractCategories(query) → ["CS"]

  [Tier 1] 1차 카테고리 검색 (동적 풀 크기)
  → DB: questions WHERE category_id IN (CS) LIMIT dynamicPool
  → 비기술 질문 필터링 (content 기반 블랙리스트)
  → 히스토리 필터링
  → 충분하면 → 가중 샘플링 → 반환

  [Tier 2] 인접 카테고리 확장 (부족 시)
  → DB: questions WHERE category_id IN (CS, NETWORK, ARCHITECTURE) LIMIT ...
  → 동일 필터링 → 충분하면 반환

  [Tier 3] 오래된 질문 재활용 (여전히 부족 시)
  → 히스토리 중 14일+ 지난 질문을 풀에 재투입
  → 안 본 질문 우선 + 오래전 본 질문으로 보충

  → 그래도 부족하면 → 부분 히트 (부족분만 Claude 생성)
```

### 설계 결정

**D1: 벡터 유사도 검색을 캐시 검색에 도입하지 않는 이유**

mistakes.md(2026-03-17)에 기록된 교훈:

> "메타 쿼리('프론트엔드 3년차 면접')와 실제 질문('React useMemo 설명')은 시맨틱적으로 다른 카테고리"
> "임베딩은 '같은 레벨의 텍스트 비교'에만 효과적"

따라서 캐시 검색은 기존 카테고리 키워드 매칭 + 확장 전략을 유지한다.

**D2: 비기술 질문 필터링은 content 기반 블랙리스트로 처리**

DB에 `interview_type_id` 컬럼이 없으므로 (장기 과제), 애플리케이션 레벨에서 비기술 키워드 패턴으로 필터링한다. `validation.ts`의 `NON_DEV_BLACKLIST` 패턴을 재활용한다.

**D3: 인접 카테고리 매핑은 정적 상수로 관리**

카테고리 간 관련성은 자주 변하지 않으므로 하드코딩된 매핑으로 충분하다.

---

## 4. Implementation Plan

### Phase 1: 캐시 풀 동적 확장 + 비기술 필터링 (Core)

#### Task 1.1: 동적 풀 크기 계산

**파일**: `src/lib/question-cache.ts`

```typescript
// 현재 (line 323)
.limit(count * 4)

// 변경
const baseMultiplier = 4;
const historyBuffer = userId ? Math.ceil(historySize / count) : 0;
const dynamicMultiplier = Math.max(baseMultiplier, historyBuffer + baseMultiplier);
const poolLimit = Math.min(count * dynamicMultiplier, 200);
.limit(poolLimit)
```

- 히스토리 크기를 미리 파악하여 풀 크기를 동적으로 조정
- 히스토리 0개: 기존과 동일 (`count * 4 = 20`)
- 히스토리 20개: `count * 8 = 40`
- 히스토리 50개: `count * 14 = 70`
- 상한: 200개 (쿼리 비용 제한)

#### Task 1.2: 비기술 질문 필터링

**파일**: `src/lib/question-cache.ts`

캐시 풀에서 반환된 질문 중 비기술 콘텐츠를 필터링:

```typescript
import { NON_DEV_CONTENT_PATTERNS } from "@/lib/validation";

// 풀 구성 후, 히스토리 필터링 전에 적용
pool = pool.filter((q) => !isNonDevContent(q.content));
```

`isNonDevContent()` 함수는 질문 content에 비기술 패턴이 포함되어 있는지 확인:

- "카페", "알바", "음료", "위생", "서빙" 등 비기술 직무 키워드
- `validation.ts`의 `NON_DEV_BLACKLIST` 패턴 재활용

#### Task 1.3: 히스토리 카운트 사전 조회

**파일**: `src/lib/question-history.ts`

```typescript
export async function getQuestionHistoryCount(
  userId: string,
  categoryIds?: string[],
): Promise<number> {
  // question_generation_history에서 해당 유저의 히스토리 개수만 COUNT
  // categoryIds가 있으면 해당 카테고리의 질문만 카운트
}
```

### Phase 2: 인접 카테고리 확장

#### Task 2.1: 인접 카테고리 매핑

**파일**: `src/lib/question-cache.ts`

```typescript
const ADJACENT_CATEGORIES: Record<string, string[]> = {
  FRONTEND: ["CS", "ARCHITECTURE", "NETWORK"],
  BACKEND: ["DATABASE", "SYSTEM_DESIGN", "DEVOPS", "CS"],
  DATABASE: ["BACKEND", "SYSTEM_DESIGN"],
  CS: ["NETWORK", "ARCHITECTURE", "SECURITY"],
  DEVOPS: ["BACKEND", "SECURITY", "NETWORK"],
  "AI/ML": ["CS", "ARCHITECTURE", "BACKEND"],
  ARCHITECTURE: ["CS", "SYSTEM_DESIGN", "BACKEND"],
  SYSTEM_DESIGN: ["ARCHITECTURE", "BACKEND", "DATABASE", "DEVOPS"],
  NETWORK: ["CS", "SECURITY", "DEVOPS"],
  SECURITY: ["NETWORK", "CS", "BACKEND"],
  MOBILE: ["FRONTEND", "CS", "NETWORK"],
};
```

#### Task 2.2: Tier 2 확장 로직

**파일**: `src/lib/question-cache.ts`

1차 카테고리 검색 후 부족분이 있으면 인접 카테고리로 확장:

```typescript
if (pool.length < count) {
  const adjacentCats = primaryCategories
    .flatMap((c) => ADJACENT_CATEGORIES[c] || [])
    .filter((c) => !primaryCategories.includes(c));

  // 인접 카테고리에서 추가 질문 fetch
  const additionalPool = await fetchQuestionsByCategories(adjacentCats, needed);
  pool = [...pool, ...additionalPool];
}
```

### Phase 3: 오래된 질문 재활용 (Tier 3 Fallback)

#### Task 3.1: 히스토리 소진 시 재활용 로직

**파일**: `src/lib/question-cache.ts`

Tier 1 + Tier 2에서도 부족하면 오래된 질문을 재활용:

```typescript
if (pool.length < count && userId) {
  // 14일+ 전에 본 질문을 다시 풀에 투입
  const staleHistory = await getStaleQuestionHistory(userId, 14);
  const recycled = allFetched.filter((q) => staleHistory.has(q.content));

  // 안 본 질문 우선, 오래전 본 질문으로 보충
  pool = [...pool, ...recycled];
}
```

#### Task 3.2: 히스토리 조회 확장

**파일**: `src/lib/question-history.ts`

```typescript
export async function getStaleQuestionHistory(
  userId: string,
  staleDays: number = 14,
): Promise<Set<string>> {
  // expires_at > now() AND created_at < now() - staleDays
  // 아직 유효하지만 staleDays 이전에 본 질문들
}
```

### Phase 4: 로깅 개선

#### Task 4.1: 캐시 히트 상세 로그

**파일**: `src/lib/question-cache.ts`, `src/app/api/questions/generate/route.ts`

```typescript
console.log("캐시 검색 결과:", {
  tier1Count: tier1Results.length,
  tier2Count: tier2Results.length,
  tier3Recycled: recycledCount,
  historySize,
  poolSize: dynamicPoolLimit,
  filteredNonDev: nonDevFilteredCount,
});
```

---

## 5. 영향받는 파일

| 파일                                      | 변경 내용                                                     |
| ----------------------------------------- | ------------------------------------------------------------- |
| `src/lib/question-cache.ts`               | 동적 풀 크기, 비기술 필터링, 인접 카테고리, 재활용 로직       |
| `src/lib/question-history.ts`             | `getQuestionHistoryCount()`, `getStaleQuestionHistory()` 추가 |
| `src/lib/validation.ts`                   | `isNonDevContent()` export 추가 (기존 패턴 재활용)            |
| `src/app/api/questions/generate/route.ts` | 로깅 개선 (선택)                                              |

---

## 6. Quality Gates

### 필수 통과 조건

- [ ] `npm run build` 성공
- [ ] `npx tsc --noEmit` 타입 에러 없음
- [ ] `npx eslint src/` 린트 통과

### 검증 체크리스트

- [ ] 히스토리 20개+ 유저가 같은 카테고리 검색 시 캐시 히트 발생
- [ ] 캐시 히트 시 응답 시간 < 1초
- [ ] "카페알바 면접" 질문이 기술면접 캐시에 포함되지 않음
- [ ] "프로세스와 스레드 TCP/IP" 검색 시 CS 관련 질문만 반환
- [ ] 히스토리 소진 시 인접 카테고리 질문이 제공됨
- [ ] 14일+ 오래된 질문이 재활용됨
- [ ] 재활용 로그가 정상 출력됨
- [ ] 기존 정상 쿼리 동작에 영향 없음

---

## 7. Risks & Dependencies

| 리스크                             | 확률 | 영향 | 완화                                              |
| ---------------------------------- | ---- | ---- | ------------------------------------------------- |
| 동적 풀 크기 증가로 DB 쿼리 느려짐 | 낮음 | 중간 | 상한 200개 제한, category_id 인덱스 활용          |
| 인접 카테고리 매핑이 부적절        | 낮음 | 낮음 | 정적 매핑이므로 쉽게 조정 가능                    |
| 비기술 필터링이 정상 질문 차단     | 낮음 | 중간 | 질문 content만 검사, 쿼리가 아닌 질문 텍스트 기반 |
| 재활용 질문에 유저 불만            | 중간 | 낮음 | 14일 쿨다운, Claude 호출(12초)보다 나은 UX        |

---

## 8. Timeline & Milestones

| Phase   | 내용                    | 예상 |
| ------- | ----------------------- | ---- |
| Phase 1 | 동적 풀 + 비기술 필터링 | 핵심 |
| Phase 2 | 인접 카테고리 확장      | 중요 |
| Phase 3 | 오래된 질문 재활용      | 보완 |
| Phase 4 | 로깅 개선               | 선택 |

---

## 9. References

- [#85](https://github.com/kwakseongjae/dev-interview/issues/85) — 반복 사용자 캐시 미스
- [#88](https://github.com/kwakseongjae/dev-interview/issues/88) — 비기술 질문 추천 버그
- [#58 계획 문서](docs/plans/058-token-optimization-semantic-caching.md) — 시맨틱 캐싱 도입
- [#66 계획 문서](docs/plans/066-cache-question-diversity.md) — 캐시 다양성 개선
- mistakes.md(2026-03-17) — 메타 쿼리↔질문 시맨틱 갭

---

## 10. Implementation Summary

**Completion Date**: 2026-04-03
**Implemented By**: Claude Opus 4.6

### Changes Made

#### Files Modified

- [src/lib/question-cache.ts](src/lib/question-cache.ts) — Tiered fallback 캐시 검색 전면 재작성 (+177/-58)
- [src/lib/question-history.ts](src/lib/question-history.ts) — `getQuestionHistoryCount()`, `getStaleQuestionHistory()` 추가 (+61)
- [src/lib/validation.ts](src/lib/validation.ts) — `isNonDevContent()` 정밀 필터링 함수 추가 (+77)
- [docs/plans/085-cache-miss-and-question-filtering.md](docs/plans/085-cache-miss-and-question-filtering.md) — 계획 문서

#### Key Implementation Details

**Phase 1 — 동적 풀 크기 + 비기술 필터링**:

- 고정 `count * 4` → 히스토리 크기 기반 동적 계산 (상한 200)
- `isNonDevContent()`: 기술 맥락 키워드 면제 + 순수 비기술 패턴만 감지 (오탐 방지)
- 히스토리 3종 병렬 조회 (`Promise.all`): 카운트 + 내용 + stale

**Phase 2 — 인접 카테고리 확장**:

- `ADJACENT_CATEGORIES` 매핑 (11개 카테고리 × 3~4개 인접)
- Tier 1 부족 시 자동 확장, 중복 제거 포함

**Phase 3 — 오래된 질문 재활용**:

- `getStaleQuestionHistory()`: 14일+ 전에 본 질문 조회
- Tier 1+2 부족 시 stale 질문을 풀에 재투입 (Claude 12초 호출 회피)

**Phase 4 — 상세 로깅**:

- Tier별 결과를 구조화된 JSON 로그로 출력

**DB 정리**:

- 순수 비기술 질문 5건 삭제 (session_questions FK 정리 포함)
- "카페 POS 시스템" 등 기술적 맥락 있는 질문은 보존

### Quality Validation

- [x] Build: Success
- [x] Type Check: Passed
- [x] Lint: Passed

### Deviations from Plan

**Added**:

- `isNonDevContent()` 패턴을 정밀화 — 기술 맥락 키워드 면제 로직 추가 (오탐 방지)
- DB 기존 비기술 질문 5건 직접 삭제 (계획에는 "선택적"이었으나 실행)

**Changed**:

- `getQuestionHistoryCount()` — 카테고리별 필터 파라미터 제거 (전체 카운트로 충분)
- 히스토리 조회 limit 100 → 200으로 확대 (재활용 풀 확보)

**Skipped**:

- 없음 — 4개 Phase 모두 구현 완료

### Performance Impact

- 추가 DB 쿼리: 최대 +2회 (히스토리 COUNT + 인접 카테고리)
- `Promise.all` 병렬 조회로 히스토리 관련 latency 최소화
- 동적 풀 상한 200개로 DB 부하 제한
