# #77 로그인 후 헤더 UI 3단계 플리커링 — 인증 상태 타이밍 이슈

## Overview

**문제**: 로그인 후 헤더가 3단계에 걸쳐 순차적으로 변경 (로그인 버튼 → 유저 UI → 팀 스페이스 반영). 3개의 독립 비동기 작업이 캐스케이딩 useEffect로 조율 없이 실행되며 5회 리렌더 + 5-6회 API 호출 발생.

**목표**: 로그인 후 헤더가 한 번에 최종 상태로 전환. 전역적으로 `isLoggedIn()` 레이스 컨디션 해소.

**범위**: 인증 상태 관리 전반 리팩터링 (13개 페이지/컴포넌트)

---

## Requirements

| ID   | 요구사항                                 | 우선순위 |
| ---- | ---------------------------------------- | -------- |
| FR-1 | 로그인 후 헤더 UI가 1단계로 안정적 전환  | HIGH     |
| FR-2 | 인증 해소 중 스켈레톤/로딩 표시          | HIGH     |
| FR-3 | 팀 스페이스 정보 통합 로딩               | HIGH     |
| FR-4 | 전역 auth 타이밍 이슈 해소 (10개 페이지) | HIGH     |
| FR-5 | 기존 기능 회귀 없음                      | HIGH     |

---

## Architecture & Design

### 핵심 변경: 3-Layer Auth Fix

**1. 통합 API 엔드포인트** (`/api/auth/init`):

- user + teamSpaces + lastSelectedTeamSpaceId를 단일 응답으로 반환
- 3개 DB 쿼리를 `Promise.all`로 병렬 실행
- 3 RTT → 1 RTT

**2. useAuth 훅 확장** (`authReady` 추가):

- `loggedIn`: 세션 존재 여부
- `authReady`: INITIAL_SESSION 이벤트 발생 여부 (auth 상태 확정)
- 500ms 타임아웃 해킹 → 확정적 `authReady` 가드로 교체

**3. 전역 isLoggedIn() → useAuth().loggedIn 전환**:

- `isLoggedIn()`은 동기 스냅샷으로 INITIAL_SESSION 전에 항상 `false`
- `useAuth().loggedIn`은 반응형으로 상태 변경 시 자동 리렌더
- 10개 페이지에서 레이스 컨디션 제거

---

## Implementation Plan

### Phase 1: 핵심 인프라

| 작업                      | 파일                             |
| ------------------------- | -------------------------------- |
| 통합 auth init API        | `src/app/api/auth/init/route.ts` |
| useAuth 훅 authReady 추가 | `src/hooks/useAuth.ts`           |
| api.ts authReady 플래그   | `src/lib/api.ts`                 |
| SIGNED_IN 중복 API 제거   | `src/lib/api.ts`                 |

### Phase 2: 메인 페이지

| 작업                                | 파일                                   |
| ----------------------------------- | -------------------------------------- |
| 3 useEffect → 1 통합 + 스켈레톤     | `src/app/page.tsx`                     |
| TeamSpaceSelector initialTeamSpaces | `src/components/TeamSpaceSelector.tsx` |

### Phase 3: 전역 auth 타이밍 수정

| 파일                                     | 수정                                |
| ---------------------------------------- | ----------------------------------- |
| `archive/[id]/page.tsx`                  | isLoggedIn → authReady 가드         |
| `archive/page.tsx`                       | 캐스케이딩 useEffect 통합           |
| `favorites/page.tsx`                     | isLoggedIn → loggedIn 전환          |
| `team-spaces/[id]/page.tsx`              | authReady 가드                      |
| `team-spaces/[id]/manage/page.tsx`       | authReady 가드                      |
| `team-spaces/join/[code]/page.tsx`       | 로그인 모달 깜빡임 방지             |
| `case-studies/[slug]/interview/page.tsx` | 게스트→로그인 전환 + 답변 유실 방지 |
| `complete/page.tsx`                      | 렌더 시 loggedIn 반응형             |
| `TeamSpaceIntro.tsx`                     | loggedIn 의존성 추가                |

---

## Implementation Summary

**Completion Date**: 2026-04-02
**Implemented By**: Claude Opus 4.6

### Changes Made

- [src/app/api/auth/init/route.ts](src/app/api/auth/init/route.ts) — 신규: 통합 인증 데이터 엔드포인트
- [src/hooks/useAuth.ts](src/hooks/useAuth.ts) — authReady 상태 추가
- [src/lib/api.ts](src/lib/api.ts) — \_authReady 플래그 + isAuthReady() export + SIGNED_IN 중복 제거
- [src/app/page.tsx](src/app/page.tsx) — 3 useEffect → 1 통합 + 헤더 스켈레톤
- [src/components/TeamSpaceSelector.tsx](src/components/TeamSpaceSelector.tsx) — initialTeamSpaces prop
- [src/components/TeamSpaceIntro.tsx](src/components/TeamSpaceIntro.tsx) — loggedIn 의존성
- [src/app/archive/[id]/page.tsx](src/app/archive/[id]/page.tsx) — authReady 가드
- [src/app/archive/page.tsx](src/app/archive/page.tsx) — useEffect 통합 + 수동 리스너 제거
- [src/app/favorites/page.tsx](src/app/favorites/page.tsx) — loggedIn 전환
- [src/app/team-spaces/[id]/page.tsx](src/app/team-spaces/[id]/page.tsx) — authReady 가드
- [src/app/team-spaces/[id]/manage/page.tsx](src/app/team-spaces/[id]/manage/page.tsx) — authReady 가드
- [src/app/team-spaces/join/[code]/page.tsx](src/app/team-spaces/join/[code]/page.tsx) — 모달 깜빡임 방지
- [src/app/case-studies/[slug]/interview/page.tsx](src/app/case-studies/[slug]/interview/page.tsx) — 게스트→로그인 전환 + saveToLocal 선행
- [src/app/complete/page.tsx](src/app/complete/page.tsx) — 렌더 시 loggedIn 반응형

### Quality Validation

- [x] Build: Success
- [x] Type Check: Passed
- [x] Lint: Passed

### Performance Impact

| 지표                     | 이전        | 이후     |
| ------------------------ | ----------- | -------- |
| 메인 페이지 API 호출     | 3-4회       | 1회      |
| 메인 페이지 리렌더       | 5회         | 2회      |
| 헤더 빈 상태             | ~400ms      | 스켈레톤 |
| isLoggedIn 레이스 컨디션 | 10개 페이지 | 0개      |

### Commits

```
b07cfce fix(auth): 로그인 후 헤더 UI 3단계 플리커링 해소 + 전역 auth 타이밍 수정
```

---

## References

- [React useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)
- [Supabase SSR Auth Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- [#77 GitHub Issue](https://github.com/kwakseongjae/dev-interview/issues/77)
