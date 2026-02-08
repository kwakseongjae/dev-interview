# 023 - Google OAuth 로그인으로 전환

**Issue**: [#23](https://github.com/kwakseongjae/dev-interview/issues/23)
**Branch**: `feat/23-google-oauth-login`
**Created**: 2026-02-08

---

## 1. Overview

### 문제 정의

현재 mochabun은 커스텀 JWT 기반 이메일/비밀번호 인증 시스템을 사용하고 있다. 이를 Supabase Auth의 Google OAuth로 완전히 대체하여 로그인 UX를 개선하고 인증 시스템을 단순화한다.

### 목표

- 기존 커스텀 JWT 인증 → Supabase Auth (Google OAuth) 전환
- 로그인 버튼 클릭 → Google OAuth redirect → 콜백 → 자동 로그인/회원가입
- 커스텀 인증 코드 전체 제거 (auth.ts, JWT, bcrypt 등)

### 범위

- **IN**: Google OAuth 구현, 기존 인증 제거, API 라우트 인증 방식 변경, UI 변경
- **OUT**: Google Cloud Console 설정, Supabase Dashboard 설정 (수동 가이드만 제공)

---

## 2. Requirements

### 기능 요구사항 (FR)

- **FR-1**: 로그인 버튼 클릭 시 Google OAuth redirect (별도 페이지 없음)
- **FR-2**: OAuth 콜백 처리 후 자동 로그인 (신규 유저는 자동 회원가입)
- **FR-3**: 로그아웃 기능 정상 동작
- **FR-4**: 비로그인 사용자 접근 제어 유지 (케이스 스터디 게스트 모드 포함)
- **FR-5**: 로그인 후 원래 페이지로 redirect

### 기술 요구사항 (TR)

- **TR-1**: `@supabase/ssr` 패키지 도입 (cookie 기반 세션 관리)
- **TR-2**: Supabase 클라이언트 재구성 (browser client, server client 분리)
- **TR-3**: Next.js middleware로 세션 리프레시 구현
- **TR-4**: 31개 API 라우트의 인증 방식 변경 (`requireAuth` → Supabase `getUser`)
- **TR-5**: 커스텀 JWT/bcrypt 코드 및 관련 패키지 제거

### 비기능 요구사항 (NFR)

- **NFR-1**: 로그인 UX 간소화 (클릭 한 번)
- **NFR-2**: 서버 사이드 세션 검증 보안 (`getUser()` 사용, `getSession()` 사용 금지)

---

## 3. Architecture & Design

### 현재 구조 (AS-IS)

```
클라이언트                          서버
┌──────────────┐                 ┌──────────────────┐
│ localStorage │ ─ Bearer ──→    │ auth.ts          │
│ access_token │   Token         │ verifyAccessToken │
│ refresh_token│                 │ (JWT + bcrypt)   │
└──────────────┘                 └──────────────────┘
                                 ↓ requireAuth()
                                 API Routes (31개)
```

- 커스텀 JWT (access 15m / refresh 7d)
- localStorage 저장
- `refresh_tokens` 테이블로 토큰 관리
- `users` 테이블에 `password_hash` 컬럼

### 변경 후 구조 (TO-BE)

```
클라이언트                          서버
┌──────────────┐                 ┌──────────────────┐
│ Cookie       │ ─ Cookie ──→   │ @supabase/ssr    │
│ (auto)       │   (auto)       │ getUser()        │
└──────────────┘                 └──────────────────┘
       ↑                         ↓ middleware.ts
  Supabase Auth              ┌──────────────────┐
  (Google OAuth)             │ API Routes (31개) │
                             │ Supabase RLS 활용 │
                             └──────────────────┘
```

- Supabase Auth 세션 (cookie 기반, 자동 관리)
- `@supabase/ssr`가 쿠키 read/write 자동 처리
- Middleware가 매 요청마다 세션 리프레시
- `auth.users` 테이블 (Supabase 내장) 사용
- `profiles` 테이블로 추가 유저 정보 관리

### 핵심 설계 결정

| 결정        | 선택                                   | 이유                                |
| ----------- | -------------------------------------- | ----------------------------------- |
| OAuth 방식  | Redirect (PKCE)                        | 팝업보다 안정적, Supabase 기본 지원 |
| 세션 저장   | Cookie (`@supabase/ssr`)               | SSR 호환, 보안, 자동 관리           |
| 유저 테이블 | `auth.users` + `profiles`              | Supabase Auth 표준 패턴             |
| API 인증    | `supabase.auth.getUser()`              | 서버 검증, `getSession()` 보다 안전 |
| 기존 유저   | 마이그레이션 없음 (테스트 유저만 존재) | 프로덕션 데이터 없음                |

### OAuth Flow

```
1. 로그인 버튼 클릭
   └→ supabase.auth.signInWithOAuth({ provider: 'google' })
   └→ Redirect to Google

2. Google 인증 완료
   └→ Redirect to Supabase Auth server
   └→ Redirect to /auth/callback?code=...

3. /auth/callback 라우트 핸들러
   └→ supabase.auth.exchangeCodeForSession(code)
   └→ 세션 쿠키 자동 설정
   └→ Redirect to next (원래 페이지) 또는 /

4. Middleware (매 요청)
   └→ supabase.auth.getUser()
   └→ 토큰 리프레시 (만료 시)
   └→ 보호된 라우트 접근 제어
```

---

## 4. Implementation Plan

### Phase 1: 기반 설정 (Setup)

| #   | 작업                             | 파일                             | 설명                                      |
| --- | -------------------------------- | -------------------------------- | ----------------------------------------- |
| 1-1 | `@supabase/ssr` 패키지 설치      | `package.json`                   | `npm install @supabase/ssr`               |
| 1-2 | Browser Supabase 클라이언트 생성 | `src/lib/supabase/client.ts`     | `createBrowserClient()` (anon key)        |
| 1-3 | Server Supabase 클라이언트 생성  | `src/lib/supabase/server.ts`     | `createServerClient()` (cookie 기반)      |
| 1-4 | Admin Supabase 클라이언트 유지   | `src/lib/supabase/admin.ts`      | 기존 service role 클라이언트 (RLS 우회용) |
| 1-5 | Middleware 구현                  | `src/middleware.ts`              | 세션 리프레시 + 보호된 라우트 리다이렉트  |
| 1-6 | OAuth 콜백 라우트                | `src/app/auth/callback/route.ts` | `exchangeCodeForSession` 처리             |

### Phase 2: 인증 UI 변경 (Core)

| #   | 작업                   | 파일                                  | 설명                                |
| --- | ---------------------- | ------------------------------------- | ----------------------------------- |
| 2-1 | 로그인 페이지 리디자인 | `src/app/auth/page.tsx`               | Google 로그인 버튼만 표시 (폼 제거) |
| 2-2 | LoginPromptModal 수정  | `src/components/LoginPromptModal.tsx` | Google 로그인으로 redirect 변경     |
| 2-3 | 인증 상태 관리 변경    | `src/lib/api.ts`                      | localStorage → Supabase 세션 기반   |

### Phase 3: API 라우트 인증 전환 (Core)

| #   | 작업                     | 파일 (31개)                         | 설명                                         |
| --- | ------------------------ | ----------------------------------- | -------------------------------------------- |
| 3-1 | 인증 헬퍼 함수 작성      | `src/lib/supabase/auth-helpers.ts`  | `getUser()` 래퍼 (API 라우트용)              |
| 3-2 | Auth API 라우트 정리     | `src/app/api/auth/*`                | signin, signup, check-username, refresh 제거 |
| 3-3 | `/api/auth/me` 수정      | `src/app/api/auth/me/route.ts`      | Supabase `getUser()` + profiles 조회         |
| 3-4 | `/api/auth/signout` 수정 | `src/app/api/auth/signout/route.ts` | `supabase.auth.signOut()`                    |
| 3-5 | 나머지 API 라우트 전환   | 27개 라우트                         | `requireAuth()` → Supabase `getUser()`       |

### Phase 4: DB 스키마 & 정리 (Polish)

| #   | 작업                            | 파일                    | 설명                                                 |
| --- | ------------------------------- | ----------------------- | ---------------------------------------------------- |
| 4-1 | `profiles` 테이블 생성          | Supabase Migration      | `auth.users` 연동, nickname/avatar 등                |
| 4-2 | 기존 테이블 정리                | Supabase Migration      | `users`, `refresh_tokens` 테이블 drop (기존 FK 수정) |
| 4-3 | RLS 정책 설정                   | Supabase Migration      | `profiles` 테이블 RLS                                |
| 4-4 | 타입 정의 업데이트              | `src/types/database.ts` | 새 스키마 반영                                       |
| 4-5 | 불필요 코드/패키지 제거         | 여러 파일               | `auth.ts`, `jsonwebtoken`, `bcryptjs`, `uuid` 제거   |
| 4-6 | `isLoggedIn()` 등 유틸 업데이트 | `src/lib/api.ts`        | Supabase 세션 기반으로 변경                          |

---

## 5. 파일 변경 목록

### 새로 생성

- `src/lib/supabase/client.ts` - 브라우저용 Supabase 클라이언트
- `src/lib/supabase/server.ts` - 서버용 Supabase 클라이언트
- `src/lib/supabase/admin.ts` - Admin Supabase 클라이언트
- `src/lib/supabase/middleware.ts` - 세션 리프레시 유틸
- `src/lib/supabase/auth-helpers.ts` - API 라우트 인증 헬퍼
- `src/middleware.ts` - Next.js 미들웨어
- `src/app/auth/callback/route.ts` - OAuth 콜백 핸들러

### 대폭 수정

- `src/app/auth/page.tsx` - 로그인 페이지 (폼 → Google 버튼)
- `src/lib/api.ts` - API 클라이언트 (토큰 → 세션)
- `src/types/database.ts` - 타입 정의 (users → profiles)
- `src/components/LoginPromptModal.tsx` - 로그인 모달

### 수정 (인증 방식 전환)

- `src/app/api/auth/me/route.ts`
- `src/app/api/auth/signout/route.ts`
- 나머지 27개 API 라우트 (`requireAuth` → `getUser`)

### 삭제

- `src/lib/auth.ts` - 커스텀 JWT 인증 로직 전체
- `src/lib/supabase.ts` - 기존 Supabase 클라이언트 (새로 분리)
- `src/app/api/auth/signin/route.ts`
- `src/app/api/auth/signup/route.ts`
- `src/app/api/auth/check-username/route.ts`
- `src/app/api/auth/refresh/route.ts`

### 패키지 변경

- **추가**: `@supabase/ssr`
- **제거**: `jsonwebtoken`, `bcryptjs`, `uuid` + 각 `@types/*`

---

## 6. Quality Gates

### 필수 검증

- [ ] `npm run build` 성공
- [ ] `npx tsc --noEmit` 타입 에러 없음
- [ ] `npx eslint src/` 린트 통과

### 기능 검증

- [ ] Google 로그인 버튼 클릭 → Google OAuth redirect
- [ ] OAuth 콜백 → 세션 생성 → 홈 redirect
- [ ] 신규 유저 자동 회원가입 (profiles 테이블 생성)
- [ ] 로그아웃 → 세션 삭제 → 로그인 페이지
- [ ] 비로그인 보호 라우트 접근 → 로그인 페이지 redirect
- [ ] 케이스 스터디 게스트 모드 정상 동작
- [ ] LoginPromptModal → Google 로그인 redirect
- [ ] 로그인 후 원래 페이지로 복귀 (redirect 파라미터)

### API 검증

- [ ] 인증 필요 API에 비로그인 요청 → 401
- [ ] 인증된 요청 → 정상 응답
- [ ] 세션 만료 → middleware 자동 리프레시

---

## 7. Risks & Dependencies

### 리스크

| 리스크                      | 영향 | 완화 방안                               |
| --------------------------- | ---- | --------------------------------------- |
| 31개 API 라우트 일괄 변환   | 높음 | 인증 헬퍼 함수로 추상화하여 변환 최소화 |
| FK 제약조건 (users.id 참조) | 높음 | `auth.users.id`를 참조하도록 FK 수정    |
| 기존 데이터 정합성          | 낮음 | 테스트 유저만 존재, 정리 가능           |
| Supabase Auth 설정 누락     | 중간 | 작업 완료 후 수동 설정 가이드 제공      |

### 의존성

- Google Cloud Console OAuth 설정 완료
- Supabase Dashboard Google Provider 활성화
- Supabase Dashboard Redirect URL 등록

---

## 8. 수동 설정 가이드 (작업 완료 후 제공)

작업 완료 후 사용자에게 제공할 설정 가이드:

### Google Cloud Console

1. OAuth 2.0 클라이언트 ID 생성 (웹 애플리케이션)
2. Authorized redirect URI 설정:
   - `https://<PROJECT_REF>.supabase.co/auth/v1/callback`

### Supabase Dashboard

1. Authentication → Providers → Google 활성화
2. Client ID, Client Secret 입력
3. Authentication → URL Configuration:
   - Site URL: `https://www.mochabun.co.kr`
   - Redirect URLs 추가:
     - `http://localhost:3000/auth/callback` (개발)
     - `https://www.mochabun.co.kr/auth/callback` (프로덕션)

### 환경변수

```env
# 기존 (유지)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# 제거
JWT_SECRET=...  # 더 이상 불필요
```

---

## 9. References

- [Supabase OAuth with Next.js App Router](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Google OAuth with Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [@supabase/ssr Package](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- GitHub Issue: [#23](https://github.com/kwakseongjae/dev-interview/issues/23)

---

## 10. Implementation Summary

**Completion Date**: 2026-02-08
**Implemented By**: Claude Opus 4.6

### Changes Made

#### 새로 생성된 파일 (10개)

- `src/lib/supabase/client.ts` - 브라우저용 Supabase 클라이언트 (`createBrowserClient`)
- `src/lib/supabase/server.ts` - 서버용 Supabase 클라이언트 (cookie 기반)
- `src/lib/supabase/admin.ts` - Admin 클라이언트 (service role, RLS 우회)
- `src/lib/supabase/index.ts` - 하위 호환성 re-export
- `src/lib/supabase/middleware.ts` - 세션 리프레시 유틸
- `src/lib/supabase/auth-helpers.ts` - `requireUser()`, `getUserOptional()` 헬퍼
- `src/lib/password.ts` - 팀스페이스 비밀번호 유틸 (auth.ts에서 분리)
- `src/middleware.ts` - Next.js 미들웨어 (세션 리프레시)
- `src/app/auth/callback/route.ts` - OAuth PKCE 콜백 핸들러
- `src/app/privacy/page.tsx` - 개인정보 처리방침 페이지

#### 대폭 수정된 파일 (4개)

- `src/app/auth/page.tsx` - 이메일/비밀번호 폼 → Google 로그인 버튼 (카드 UI)
- `src/lib/api.ts` - localStorage 토큰 관리 → Supabase 세션 기반 (fetchApi 간소화)
- `src/components/LoginPromptModal.tsx` - 직접 Google OAuth redirect 호출
- `src/types/database.ts` - `password_hash`, `username` 제거, JWT 타입 제거

#### API 라우트 인증 전환 (31개)

- `requireAuth(authHeader)` → `await requireUser()` (27개 라우트)
- `getAuthFromRequest(authHeader)` → `await getUserOptional()` (4개 라우트)
- `import { supabaseAdmin } from "@/lib/supabase"` → 하위 호환 index.ts로 유지

#### 삭제된 파일 (5개)

- `src/lib/auth.ts` - 커스텀 JWT 인증 로직 전체
- `src/lib/supabase.ts` - 기존 단일 Supabase 클라이언트 (디렉토리 구조로 교체)
- `src/app/api/auth/signin/route.ts` - 이메일/비밀번호 로그인
- `src/app/api/auth/signup/route.ts` - 회원가입
- `src/app/api/auth/check-username/route.ts` - 아이디 중복 확인
- `src/app/api/auth/refresh/route.ts` - JWT 토큰 갱신

#### 기타

- `src/app/page.tsx` - footer 추가 (copyright + 개인정보 처리방침 링크)
- `src/lib/file-utils.ts` - `uploadFileWithTimeout`에서 token 파라미터 제거
- `package.json` - `@supabase/ssr` 추가, `jsonwebtoken` + `@types/jsonwebtoken` 제거

#### DB 마이그레이션

- `users` 테이블: `password_hash`, `username` 컬럼 삭제
- `refresh_tokens` 테이블 삭제
- `auth.users` → `public.users` 자동 생성 트리거 추가
- `users` 테이블 RLS 정책 업데이트
- 기존 테스트 유저 데이터 정리

### Quality Validation

- [x] Build: Success
- [x] Type Check: Passed
- [x] Lint: Passed (기존 에러만 존재, 신규 에러 없음)

### Deviations from Plan

**Added**:

- `src/app/privacy/page.tsx` - 개인정보 처리방침 페이지 (Google OAuth Consent Screen 요구사항)
- 홈 페이지 footer (copyright + 개인정보 처리방침 링크)
- `src/lib/password.ts` - 팀스페이스 비밀번호 유틸 분리 (auth.ts 삭제로 인해 필요)
- `src/lib/supabase/index.ts` - 하위 호환 re-export (기존 import 경로 유지)

**Changed**:

- `users` 테이블을 `profiles`로 rename하지 않고 기존 이름 유지 (FK 10개 변경 회피)
- `uuid` 패키지 유지 (search/page.tsx, dummy-questions.ts에서 사용)
- `bcryptjs` 패키지 유지 (팀스페이스 비밀번호에서 사용)

**Skipped**:

- 없음 - 계획대로 구현 완료

### Follow-up Tasks

- [ ] Google Cloud Console OAuth 설정 (수동)
- [ ] Supabase Dashboard Google Provider 활성화 (수동)
- [ ] Supabase Dashboard Redirect URL 등록 (수동)

---

## QA Checklist

> Generated by qa-generator agent | 2026-02-08

### 기능 테스트 - Google OAuth

| #   | 테스트 시나리오          | 예상 결과                                               | 상태 |
| --- | ------------------------ | ------------------------------------------------------- | ---- |
| 1   | Google 로그인 버튼 클릭  | Google OAuth redirect 시작                              | ☐    |
| 2   | Google 인증 완료 후 콜백 | `/auth/callback`에서 세션 생성, 홈으로 redirect         | ☐    |
| 3   | 신규 유저 Google 로그인  | `auth.users` + `public.users` 자동 생성                 | ☐    |
| 4   | 기존 유저 재로그인       | 기존 세션 유지, 정상 로그인                             | ☐    |
| 5   | 로그아웃 버튼            | 세션 삭제, 쿠키 제거, 로그인 페이지 표시                | ☐    |
| 6   | 새로고침 후 세션 유지    | 로그인 상태 유지                                        | ☐    |
| 7   | redirect 파라미터        | `/auth?redirect=/archive` → 로그인 후 `/archive`로 이동 | ☐    |
| 8   | OAuth 실패 시 에러 표시  | `/auth?error=callback_failed` → 에러 메시지 표시        | ☐    |

### 보호 라우트 테스트

| #   | 테스트 시나리오            | 예상 결과                | 상태 |
| --- | -------------------------- | ------------------------ | ---- |
| 9   | 미인증 → /archive          | 로그인 페이지로 redirect | ☐    |
| 10  | 미인증 → /favorites        | 로그인 페이지로 redirect | ☐    |
| 11  | 미인증 → /interview        | 로그인 페이지로 redirect | ☐    |
| 12  | 미인증 → /team-spaces/[id] | 로그인 페이지로 redirect | ☐    |

### API 테스트

| #   | 테스트 시나리오              | 예상 결과           | 상태 |
| --- | ---------------------------- | ------------------- | ---- |
| 13  | 미인증 → POST /api/sessions  | 401 반환            | ☐    |
| 14  | 인증 → POST /api/sessions    | 200, 세션 생성      | ☐    |
| 15  | 미인증 → GET /api/favorites  | 401 반환            | ☐    |
| 16  | 인증 → GET /api/favorites    | 200, 찜 목록 반환   | ☐    |
| 17  | 미인증 → GET /api/auth/me    | 401 반환            | ☐    |
| 18  | 인증 → GET /api/auth/me      | 200, 유저 정보 반환 | ☐    |
| 19  | 삭제된 /api/auth/signin 접근 | 404 반환            | ☐    |
| 20  | 삭제된 /api/auth/signup 접근 | 404 반환            | ☐    |

### 게스트 모드 테스트

| #   | 테스트 시나리오                     | 예상 결과               | 상태 |
| --- | ----------------------------------- | ----------------------- | ---- |
| 21  | 미인증 → /case-studies              | 정상 로드               | ☐    |
| 22  | 미인증 → /case-studies/[slug]       | 정상 로드               | ☐    |
| 23  | 미인증 → 케이스 스터디 면접 시작    | 게스트 모드로 진행      | ☐    |
| 24  | 게스트 면접 완료 → LoginPromptModal | Google 로그인 버튼 표시 | ☐    |

### UI 테스트

| #   | 테스트 시나리오              | 예상 결과                             | 상태 |
| --- | ---------------------------- | ------------------------------------- | ---- |
| 25  | /auth 페이지 레이아웃        | 로고 + Google 버튼 + 카드 UI          | ☐    |
| 26  | Google 버튼 hover            | 살짝 회색 배경 (gray-50)              | ☐    |
| 27  | LoginPromptModal Google 버튼 | "Google로 로그인하고 저장하기" 텍스트 | ☐    |
| 28  | 홈 footer 표시               | "© 2026 mochabun · 개인정보 처리방침" | ☐    |
| 29  | /privacy 페이지              | 개인정보 처리방침 정상 표시           | ☐    |
| 30  | 모바일 반응형                | 로그인 페이지, footer 모바일 정상     | ☐    |

### 회귀 테스트

| #   | 테스트 시나리오    | 예상 결과                      | 상태 |
| --- | ------------------ | ------------------------------ | ---- |
| 31  | 홈페이지 정상 로드 | 기존 레이아웃 유지             | ☐    |
| 32  | 면접 생성 및 진행  | 질문 생성 → 답변 → 피드백 정상 | ☐    |
| 33  | 아카이브 조회      | 면접 기록 정상 표시            | ☐    |
| 34  | 찜 기능            | 추가/삭제 정상 동작            | ☐    |
| 35  | 팀스페이스 기능    | 생성/참여/세션공유 정상        | ☐    |
