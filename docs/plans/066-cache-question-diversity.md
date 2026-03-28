# #66 캐시 질문 다양성 개선

## Overview

**문제**: `searchCachedQuestions()`가 `favorite_count DESC, created_at DESC` 정렬로 항상 동일한 상위 질문을 반환. 유저 히스토리 미활용으로 같은 질문이 반복 제공됨.

**목표**: 캐시 히트 경로에서 (1) 유저가 본 질문 필터링, (2) 가중 랜덤 샘플링으로 매번 다른 조합 제공. Claude API 호출 없이 DB 쿼리만으로 해결.

**범위**: `question-cache.ts` + `route.ts` 2개 파일 수정. DB 스키마/프론트엔드 변경 없음.

---

## Requirements

### FR-1: 유저 히스토리 필터링

- 로그인 유저의 최근 30일 내 받은 질문을 캐시 결과에서 제외
- `question_generation_history` 테이블에서 `question_content` 조회 후 ID 매칭

### FR-2: 가중 랜덤 셔플

- `favorite_count` 기반 가중치로 랜덤 샘플링 (인기 질문이 더 자주 뽑히지만 항상 같지 않음)
- 가중치 함수: `1 + log(1 + favorite_count)` (log-dampened)

### FR-3: 풀 고갈 폴백

- 필터링 후 남은 질문 < 요청 수 → 부분 히트로 전환 (부족분 Claude 생성)
- 모든 질문을 본 경우에도 graceful degradation

### NFR-1: 성능

- 추가 DB 쿼리 최대 1회 (히스토리 조회)
- 셔플 알고리즘 O(n\*k) 이내

---

## Architecture & Design

### 변경 전 플로우

```
searchCachedQuestions(query, count)
  → extractCategories → DB 인기순 top 10 → 상위 5개 반환 (결정적)
```

### 변경 후 플로우

```
searchCachedQuestions(query, count, userId?)
  → extractCategories
  → DB에서 count*4 (20개) 조회 (풀 확보)
  → userId 있으면: 히스토리 조회 → 본 질문 ID 제외
  → 가중 랜덤 샘플링(favorite_count 기반) → count개 반환 (비결정적)
```

### 핵심 함수

#### `weightedSampleWithoutReplacement<T>(items, getWeight, count): T[]`

- 누적 가중치 + swap-remove 방식
- `Math.max(getWeight(item), 0.1)` — 모든 질문에 최소 확률 보장
- 요청 수 ≥ 풀 크기면 Fisher-Yates 셔플 반환

#### `favoriteCountToWeight(favoriteCount): number`

- `1.0 + Math.log1p(favoriteCount)`
- favorite=0 → 1.0, favorite=10 → 3.4, favorite=100 → 5.6

---

## Implementation Plan

### Phase 1: 가중 랜덤 샘플링 유틸리티 추가

**파일**: `src/lib/question-cache.ts`

1. `shuffle<T>(items: T[]): T[]` — Fisher-Yates 셔플
2. `favoriteCountToWeight(count: number): number` — 가중치 함수
3. `weightedSampleWithoutReplacement<T>(items, getWeight, count): T[]` — 가중 샘플링

### Phase 2: searchCachedQuestions 수정

**파일**: `src/lib/question-cache.ts`

1. 시그니처 변경: `searchCachedQuestions(query, count, userId?)`
2. `limit`을 `count * 4`로 확대 (필터링 여유분)
3. userId 있으면 `getQuestionHistory(userId)` 호출 → 본 질문 content Set 구성
4. 풀에서 히스토리 매칭 질문 제외
5. 남은 풀에서 `weightedSampleWithoutReplacement` 적용
6. 필터 후 부족하면 부족분 수 반환 (route.ts에서 부분 히트 처리)

### Phase 3: API 라우트 통합

**파일**: `src/app/api/questions/generate/route.ts`

1. `searchCachedQuestions(query, questionCount, userId)` 호출 시 userId 전달
2. 기존 부분 히트/미스 로직은 변경 없음 (자연스럽게 연동)

---

## Quality Gates

- [x] `npm run build` 성공
- [x] `npx tsc --noEmit` 통과
- [x] `npx eslint src/` 통과
- [ ] 동일 쿼리 반복 시 다른 결과 반환 확인
- [ ] 비로그인 유저: 셔플만 적용 확인
- [ ] 로그인 유저: 히스토리 필터 + 셔플 확인

---

## Risks & Dependencies

| 리스크                         | 완화                                              |
| ------------------------------ | ------------------------------------------------- |
| 히스토리 조회 추가 DB 쿼리     | 기존 30일 TTL + limit 100으로 경량                |
| 풀 크기 부족 시 같은 질문 반복 | count\*4로 풀 확대 + 부분 히트 폴백               |
| Math.random 품질               | crypto.getRandomValues 불필요 (보안 아닌 UX 목적) |

---

## References

- [#66](https://github.com/kwakseongjae/dev-interview/issues/66)
- [#58](https://github.com/kwakseongjae/dev-interview/issues/58) — 시맨틱 캐싱 도입
- `question_generation_history` 테이블 (30일 TTL)

---

## Implementation Summary

**Completion Date**: 2026-03-28
**Implemented By**: Claude Opus 4.6

### Changes Made

#### Files Modified

- [src/lib/question-cache.ts](src/lib/question-cache.ts) — 가중 샘플링 유틸 3개 추가 + `searchCachedQuestions` 시그니처/로직 수정
- [src/app/api/questions/generate/route.ts](src/app/api/questions/generate/route.ts) — `searchCachedQuestions` 호출 시 userId 전달 (1줄)

#### Key Implementation Details

- **`shuffle<T>()`**: Fisher-Yates 셔플, O(n)
- **`favoriteCountToWeight()`**: `1 + log1p(favorite_count)` — log-dampened 가중치
- **`weightedSampleWithoutReplacement<T>()`**: 누적 가중치 + swap-remove, O(n\*k)
- **`searchCachedQuestions(query, count, userId?)`**:
  - `limit`을 `count * 4`로 확대 (필터링 여유분)
  - userId 있으면 `getQuestionHistory` 동적 import → content Set 매칭 → 히스토리 필터링
  - 필터 후 풀에서 가중 랜덤 샘플링
- **`.not("embedding", "is", null)` 필터 제거**: 시딩 질문(임베딩 없음)도 캐시 조회 가능

### Quality Validation

- [x] Build: Success
- [x] Type Check: Passed
- [x] Lint: Passed

### Deviations from Plan

**Added**:

- `.not("embedding", "is", null)` 필터 제거 (이전 세션에서 발견한 캐시 미스 원인 수정 포함)

**Changed**: 없음

**Skipped**:

- 난이도 분포 보장 (Phase 4) — 현재 풀 크기에서 자연스러운 분포 형성, 필요 시 후속 이슈

### Performance Impact

- 추가 DB 쿼리: 로그인 유저만 1회 (question_generation_history, limit 100)
- 셔플 연산: O(n\*k), n=20, k=5 → ~100 iterations (무시 가능)
- 캐시 히트 시 Claude API 호출 없음 유지

### Commits

_커밋 전 — `/commit` 실행 대기_
