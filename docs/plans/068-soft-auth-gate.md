# #68 비회원 면접 시작 시 로그인 유도 플로우 (Soft Auth Gate)

## Overview

**문제**: 현재 비회원도 질문 생성 → 면접 → 완료까지 전부 가능하고, 완료 페이지에서만 `LoginPromptModal`로 로그인 유도. 비회원 사용률이 높은 상황에서 면접 시작 시점에 로그인을 유도하되 강제하지 않는 플로우가 필요.

**목표**: 면접 "시작하기" 클릭 시 로그인 유도 모달을 표시하고, OAuth 로그인 완료 후 질문/검색어를 유지한 채 끊김 없이 면접을 시작하는 UX 구현. "비회원으로 계속하기" 옵션도 제공.

**범위**: `search/page.tsx`, `page.tsx` (홈), `LoginPromptModal.tsx` 수정. `sessionStorage` 기반 상태 보존. 새 API/DB 변경 없음.

---

## Requirements

### FR-1: Soft Auth Gate 모달 (면접 시작 시)

- `/search` 페이지의 "시작하기" 버튼 클릭 시, 비회원이면 로그인 유도 모달 표시
- 홈 페이지에서 트렌드 질문 기반 면접 시작 시에도 동일하게 적용
- 로그인 유저는 기존과 동일하게 바로 면접 시작

### FR-2: 모달 옵션

- **"Google로 시작하기"**: OAuth 로그인 → 복귀 후 자동 면접 시작
- **"비회원으로 계속하기"**: 기존 플로우 유지 (세션 생성 → 면접)
- 모달 메시지: 로그인 시 혜택 안내 (기록 저장, AI 피드백, 모범답안)

### FR-3: 상태 보존 및 복귀 플로우

- OAuth 리다이렉트 전 `sessionStorage`에 질문 리스트/검색어/면접 타입 저장
- 로그인 완료 후 `/search` 페이지로 복귀 → 저장된 상태 감지 → 자동 세션 생성 → 면접 시작
- 10분 이상 경과한 저장 데이터는 stale 처리하여 무시

### NFR-1: UX

- 로그인 과정에서 "내가 뭘 하고 있었지?" 느낌 없이 자연스러운 전환
- 모달은 비침습적이고 거부해도 계속 진행 가능
- 기존 `LoginPromptModal` 컴포넌트 재활용으로 일관된 UI

---

## Architecture & Design

### 설계 결정: sessionStorage + URL hint

**선택**: sessionStorage에 상태 저장 + `?restore=true` URL hint
**대안 검토**:

- URL 파라미터만: 질문 객체 배열이 URL 길이 제한 초과 → 탈락
- 서버 임시 저장: 새 API + DB 테이블 필요, 과도한 복잡성 → 탈락
- sessionStorage만: 동작하지만 복귀 의도를 알 수 없음 → URL hint 추가

**장점**:

- 프론트엔드만으로 구현 가능 (새 API/DB 불필요)
- sessionStorage는 탭 스코프로 탭 간 충돌 없음
- URL hint로 복귀 의도를 명시적으로 전달
- OAuth 리다이렉트 후에도 sessionStorage 유지 (같은 탭)

### 전체 플로우

```
[비회원 - 로그인 선택]
1. /search에서 "시작하기" 클릭
2. loggedIn === false → LoginPromptModal(type="start-interview") 표시
3. "Google로 시작하기" 클릭:
   a. sessionStorage에 저장:
      pendingInterview: {
        questions: [...],
        query: "검색어",
        interviewTypeCode: "CS",
        timestamp: Date.now()
      }
   b. signInWithGoogle("/search?restore=true")
   c. Google OAuth → /auth/callback?next=/search?restore=true
   d. 로그인 성공 → /search?restore=true로 리다이렉트
4. /search 페이지 마운트:
   a. searchParams에서 restore=true 감지
   b. sessionStorage에서 pendingInterview 읽기
   c. 타임스탬프 검증 (10분 이내)
   d. 자동으로 createSessionApi() 호출
   e. /interview?session={id}로 이동
   f. sessionStorage 정리

[비회원 - 비회원 계속]
1. /search에서 "시작하기" 클릭
2. loggedIn === false → LoginPromptModal 표시
3. "비회원으로 계속하기" 클릭:
   a. 모달 닫기
   b. 기존 handleStartInterview() 실행 (세션 생성 → 면접)

[로그인 유저]
1. /search에서 "시작하기" 클릭
2. loggedIn === true → 바로 handleStartInterview() 실행
```

### 컴포넌트 변경

**LoginPromptModal** — type 확장:

```typescript
type: "complete" | "archive" | "interview" | "start-interview";
```

- `"start-interview"` 타입 추가
- 제목: "로그인하고 면접을 시작하세요"
- 혜택 안내: 기록 저장, AI 피드백, 모범답안, 아카이브
- 버튼: "Google로 시작하기" + "비회원으로 계속하기"
- `onLater` 콜백 → "비회원으로 계속하기" 동작

---

## Implementation Plan

### Phase 1: sessionStorage 유틸리티

**파일**: `src/lib/pending-interview.ts` (새 파일)

```typescript
interface PendingInterview {
  questions: Array<{
    content: string;
    hint: string;
    category: string;
    subcategory?: string;
  }>;
  query: string;
  interviewTypeCode?: string;
  timestamp: number;
}

// 저장, 읽기(타임스탬프 검증), 삭제 함수
```

- `savePendingInterview(data)`: sessionStorage에 저장
- `loadPendingInterview()`: 읽기 + 10분 stale 체크 + 자동 삭제
- `clearPendingInterview()`: 명시적 삭제

### Phase 2: LoginPromptModal 확장

**파일**: `src/components/LoginPromptModal.tsx`

- `"start-interview"` 타입 추가
- 해당 타입의 제목/설명/기능 목록/경고 메시지 정의
- `onLater` 콜백은 "비회원으로 계속하기"로 매핑
- `onLogin` 시 `signInWithGoogle(redirectPath)` 호출 (기존 패턴 유지)

### Phase 3: /search 페이지 수정

**파일**: `src/app/search/page.tsx`

A. **"시작하기" 버튼 auth gate 추가**:

- `handleStartInterview()` 수정
- `!isLoggedIn()` 체크 → `LoginPromptModal` 열기
- 모달에서 "Google로 시작하기" → `savePendingInterview()` → `signInWithGoogle("/search?restore=true")`
- 모달에서 "비회원으로 계속하기" → 기존 세션 생성 로직 실행

B. **복귀 플로우 처리**:

- `useEffect`에서 `searchParams.get("restore")` 체크
- `restore=true`이면 `loadPendingInterview()` 호출
- 유효한 데이터 있으면 자동 `createSessionApi()` → `/interview` 이동
- URL에서 `restore` 파라미터 제거 (history.replaceState)

### Phase 4: 홈 페이지 트렌드 플로우

**파일**: `src/app/page.tsx`

- 트렌드에서 면접 시작 시 동일한 auth gate 적용
- 현재 홈 → `/search`로 이동하는 플로우이므로, `/search`의 auth gate가 자동으로 커버
- 홈에서 직접 면접을 시작하는 경로가 있다면 동일 로직 추가

---

## Quality Gates

### 테스트 시나리오

1. **비회원 + 로그인 선택**: 시작하기 → 모달 → Google 로그인 → 복귀 → 자동 면접 시작
2. **비회원 + 비회원 계속**: 시작하기 → 모달 → 비회원 계속 → 기존과 동일하게 면접
3. **로그인 유저**: 시작하기 → 바로 면접 시작 (모달 안 뜸)
4. **Stale 데이터**: 10분 경과 후 복귀 → sessionStorage 무시 → 홈으로
5. **트렌드 경로**: 트렌드 질문 선택 → 시작하기 → 동일 auth gate 동작
6. **뒤로가기**: OAuth 화면에서 뒤로가기 → 원래 상태 유지

### 품질 검증

```bash
npm run build      # 빌드 성공
npx tsc --noEmit   # 타입 오류 없음
npx eslint src/    # 린트 통과
```

### Vercel React Best Practices

- `server-serialization`: sessionStorage 접근은 클라이언트 컴포넌트에서만
- `rerender-memo`: 모달 상태 변경이 불필요한 리렌더링 유발하지 않도록 주의
- `bundle-barrel-imports`: 새 유틸 파일은 직접 임포트

---

## Risks & Dependencies

| 리스크                                  | 영향                | 완화 방안                                |
| --------------------------------------- | ------------------- | ---------------------------------------- |
| sessionStorage가 OAuth 후 비어있는 경우 | 복귀 실패           | 타임스탬프 + 폴백으로 홈으로 안내        |
| Supabase Redirect URL 매칭 실패         | OAuth 콜백 에러     | `localhost:3000/**` 와일드카드 등록 확인 |
| 다른 탭에서 OAuth 완료                  | sessionStorage 없음 | URL hint 없으면 일반 /search 동작        |

### 의존성

- 기존 `LoginPromptModal` 컴포넌트
- 기존 `signInWithGoogle(redirectTo)` API
- 기존 `/auth/callback` 라우트의 `next` 파라미터 처리

---

## Rollout & Monitoring

### 배포 전략

- 기능 플래그 불필요 (기존 비회원 플로우 유지 + 모달 추가)
- 단계적: LoginPromptModal 확장 → /search auth gate → 복귀 플로우 → 트렌드 적용

### 성공 지표

- 비회원 → 회원 전환율 추적 (로그인 후 면접 완료 비율)
- "비회원으로 계속하기" vs "Google로 시작하기" 선택 비율
- 복귀 플로우 성공률 (sessionStorage 복원 성공)

---

## Timeline & Milestones

1. **Phase 1**: sessionStorage 유틸리티 (`pending-interview.ts`)
2. **Phase 2**: LoginPromptModal `"start-interview"` 타입 추가
3. **Phase 3**: /search 페이지 auth gate + 복귀 플로우
4. **Phase 4**: 홈 트렌드 플로우 확인 및 적용

---

## References

- GitHub Issue: [#68](https://github.com/kwakseongjae/dev-interview/issues/68)
- 관련 컴포넌트: `src/components/LoginPromptModal.tsx`
- 관련 API: `src/lib/api.ts` — `signInWithGoogle()`, `createSessionApi()`
- OAuth 콜백: `src/app/auth/callback/route.ts`
- 기존 실수 기록: `.claude/rules/mistakes.md` — Supabase Redirect URL, OAuth 쿠키 바인딩

---

## Implementation Summary

**Completion Date**: 2026-03-29
**Implemented By**: Claude Opus 4.6

### Changes Made

#### Files Created

- [`src/lib/pending-interview.ts`](src/lib/pending-interview.ts) — sessionStorage 유틸리티 (save/load/clear, 10분 stale 체크)

#### Files Modified

- [`src/components/LoginPromptModal.tsx`](src/components/LoginPromptModal.tsx) — `"start-interview"` 타입 추가, `onLogin` prop 추가
- [`src/app/search/page.tsx`](src/app/search/page.tsx) — auth gate 로직 + OAuth 복귀 자동 시작 플로우

#### Key Implementation Details

- `sessionStorage` + `?restore=true` URL hint 방식으로 OAuth 리다이렉트 간 상태 보존
- `LoginPromptModal`에 `onLogin` prop 추가하여 커스텀 로그인 핸들러 지원
- `/search` 페이지에 restore useEffect 추가: 복귀 시 자동 세션 생성 → 면접 시작
- 홈 트렌드 플로우는 `/search`로 이동하므로 별도 수정 불필요 (자동 커버)

### Quality Validation

- [x] Build: Success
- [x] Type Check: Passed
- [x] Lint: Passed

### Deviations from Plan

**없음** — 계획대로 구현 완료

### Performance Impact

- Bundle size: 미미한 증가 (~1KB, pending-interview.ts 유틸리티)
- 런타임 영향 없음

### Follow-up Tasks

- [ ] 복귀 플로우 성공률 모니터링 (sessionStorage 복원 실패 케이스)
- [ ] #69 — 회원탈퇴 기능 추가
