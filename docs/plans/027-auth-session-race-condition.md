# 027 - Google 로그인 후 세션 상태 레이스 컨디션 수정

**Issue**: [#27](https://github.com/kwakseongjae/dev-interview/issues/27)
**Branch**: `fix/27-auth-session-race-condition`
**Created**: 2026-02-09

---

## 1. Overview

### 문제 정의

Google OAuth 로그인 성공 후 홈으로 리다이렉트되지만, 로그인 상태가 즉시 반영되지 않아 사용자가 로그인 버튼을 한 번 더 눌러야 로그인 처리되는 현상.

### 원인

`src/lib/api.ts`의 `isLoggedIn()` 함수에 레이스 컨디션 존재:

1. `ensureAuthListener()`에서 `getSession()`을 `.then()`으로 비동기 호출
2. `isLoggedIn()`은 동기 함수로 `_isLoggedIn` 캐시값을 즉시 반환 → `false`
3. `getSession()` resolve 시 `_isLoggedIn = true`가 되지만 `authStateChanged` 이벤트가 미발생
4. `onAuthStateChange` 리스너가 이벤트를 디스패치하지만, 컴포넌트는 이미 `false`로 렌더링 완료
5. `auth/page.tsx`와 `LoginPromptModal`은 `useEffect`에서 `isLoggedIn()`을 한 번만 호출하고 이벤트를 리스닝하지 않음

### 목표

- OAuth 리다이렉트 후 세션 상태가 즉시 반영되도록 수정
- 리액티브 auth 상태 관리 훅 제공

### 범위

- **IN**: `getSession()` 이벤트 디스패치, `useAuth()` 훅 생성, auth page/modal 수정
- **OUT**: 다른 페이지의 `isLoggedIn()` 호출 마이그레이션 (필요 시 후속 작업)

---

## 2. Requirements

### 기능 요구사항 (FR)

- **FR-1**: Google OAuth 로그인 후 자동으로 로그인 상태 인식
- **FR-2**: auth page에서 로그인 완료 시 자동 리다이렉트
- **FR-3**: LoginPromptModal이 로그인 완료 시 자동 닫힘

### 기술 요구사항 (TR)

- **TR-1**: `getSession()` 초기 resolve 시에도 `authStateChanged` 이벤트 디스패치
- **TR-2**: `useSyncExternalStore` 기반 리액티브 `useAuth()` 훅
- **TR-3**: 기존 `isLoggedIn()` API 하위 호환성 유지

---

## 3. Architecture & Design

### 해결 전략

**2가지 수정**:

1. **이벤트 소스 수정** (`api.ts`): `getSession().then()` resolve 시에도 `authStateChanged` 커스텀 이벤트 디스패치
2. **이벤트 구독 훅** (`useAuth.ts`): `useSyncExternalStore`로 `authStateChanged` 이벤트를 구독하여 React 상태로 관리

### 흐름 (수정 후)

```
OAuth 콜백 → 쿠키 설정 → 홈 리다이렉트
→ ensureAuthListener() → getSession() Promise 시작
→ 컴포넌트 마운트, useAuth() → useSyncExternalStore 구독 시작
→ getSession() resolve → _isLoggedIn = true → authStateChanged 이벤트 ★ NEW
→ useSyncExternalStore → isLoggedIn() 재호출 → true 반환 → 리렌더링
```

---

## 4. Implementation Plan

### 변경 파일

| 파일                                  | 변경 | 설명                                              |
| ------------------------------------- | ---- | ------------------------------------------------- |
| `src/lib/api.ts`                      | 수정 | `getSession().then()` 콜백에 이벤트 디스패치 추가 |
| `src/hooks/useAuth.ts`                | 신규 | `useSyncExternalStore` 기반 리액티브 auth 훅      |
| `src/app/auth/page.tsx`               | 수정 | `isLoggedIn()` → `useAuth()` 훅으로 교체          |
| `src/components/LoginPromptModal.tsx` | 수정 | `isLoggedIn()` → `useAuth()` 훅으로 교체          |

---

## 5. Quality Gates

- [x] Build 성공
- [x] TypeScript 에러 없음
- [x] Lint 통과
- [x] 기존 `isLoggedIn()` 하위 호환성 유지

---

## 6. Risks & Dependencies

- **Low Risk**: 다른 페이지의 `isLoggedIn()` 직접 호출은 이번 수정 범위 외 (이벤트 디스패치 추가로 인해 archive/favorites 등의 기존 `authStateChanged` 리스너도 혜택을 받음)

---

## 7. References

- [#23](https://github.com/kwakseongjae/dev-interview/issues/23) - Google OAuth 로그인 전환 (원인 커밋)
- [React useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)

---

## Implementation Summary

**Completion Date**: 2026-02-09
**Implemented By**: Claude Opus 4.6

### Changes Made

#### Files Modified

- [src/lib/api.ts](src/lib/api.ts#L27-32) - `getSession().then()` 콜백에 `authStateChanged` 이벤트 디스패치 추가 (+5줄)
- [src/app/auth/page.tsx](src/app/auth/page.tsx#L11-52) - `isLoggedIn()` → `useAuth()` 훅으로 교체, `loggedIn` 의존성 추가
- [src/components/LoginPromptModal.tsx](src/components/LoginPromptModal.tsx#L13-35) - `isLoggedIn()` → `useAuth()` 훅으로 교체, `loggedIn` 의존성 추가

#### Files Created

- [src/hooks/useAuth.ts](src/hooks/useAuth.ts) - `useSyncExternalStore` 기반 리액티브 auth 상태 훅 (18줄)

#### Key Implementation Details

- `useSyncExternalStore`를 사용하여 `authStateChanged` 이벤트를 React의 외부 스토어 동기화 매커니즘으로 구독
- SSR 환경에서는 `getServerSnapshot`으로 `false` 반환 (서버에서는 항상 미로그인 상태)
- 기존 `isLoggedIn()` 동기 API는 그대로 유지하여 하위 호환성 보장
- 기존에 `authStateChanged` 이벤트를 리스닝하던 archive/favorites 페이지도 `getSession()` 초기 resolve 이벤트 추가로 혜택

### Quality Validation

- [x] Build: Success
- [x] Type Check: Passed (0 errors)
- [x] Lint: Passed (변경 파일 4개 모두 통과, 기존 코드의 warning/error는 이번 변경과 무관)

### Deviations from Plan

**없음** - 계획대로 구현 완료

### Performance Impact

- Bundle size: +18줄 (useAuth.ts 훅, 무시할 수준)
- 런타임 영향 없음 (이벤트 리스너 1개 추가)

### Follow-up Tasks

- [ ] 다른 페이지의 `isLoggedIn()` 직접 호출을 `useAuth()` 훅으로 점진적 마이그레이션 (선택적)

### Notes

- `useSyncExternalStore`는 React 18+ 공식 API로 외부 스토어 구독에 권장되는 패턴
- `setState`를 effect 내부에서 직접 호출하는 대신 사용하여 lint 규칙(`react-hooks/set-state-in-effect`) 준수
