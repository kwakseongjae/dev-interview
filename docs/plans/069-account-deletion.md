# [#69] Feature: 회원탈퇴 기능 추가 (Soft Delete)

> GitHub Issue: [#69](https://github.com/kwakseongjae/dev-interview/issues/69)
> Branch: `feat/69-account-deletion`
> Created: 2026-03-29

---

## 1. Overview

### 문제 정의

현재 mochabun 서비스에는 회원탈퇴 기능이 없어 사용자가 계정과 데이터를 삭제할 수 없다. 개인정보 보호 및 서비스 운영 관점에서 필수 기능이다.

### 목표

- Soft delete 방식으로 회원탈퇴 구현 (복구 가능성 보존)
- Supabase Auth `ban_duration`으로 로그인 차단
- `users` 테이블에 `deleted_at` 컬럼 추가로 비활성화 관리
- 탈퇴 확인 UI (경고 + 확인 입력)

### 범위

- **포함**: 탈퇴 API, 탈퇴 UI(설정 페이지), 미들웨어 차단, RLS 정책 업데이트
- **제외**: 데이터 영구 삭제 스케줄러 (Phase 2), 계정 복구 UI

---

## 2. Requirements

### 기능 요구사항

| ID   | 요구사항                                                  | 우선순위 |
| ---- | --------------------------------------------------------- | -------- |
| FR-1 | 로그인한 사용자가 설정 페이지에서 회원탈퇴 버튼 접근 가능 | P1       |
| FR-2 | 탈퇴 확인 모달: 경고 문구 + "탈퇴합니다" 텍스트 입력 확인 | P1       |
| FR-3 | 탈퇴 사유 선택 (선택사항, 드롭다운)                       | P2       |
| FR-4 | 탈퇴 후 자동 로그아웃 + 홈페이지 리다이렉트               | P1       |
| FR-5 | 탈퇴 후 동일 Google 계정으로 재가입 불가 (ban 상태)       | P1       |

### 기술 요구사항

| ID   | 요구사항                                                       | 우선순위 |
| ---- | -------------------------------------------------------------- | -------- |
| TR-1 | `users` 테이블에 `deleted_at`, `deletion_reason` 컬럼 추가     | P1       |
| TR-2 | Supabase Auth `ban_duration: "876000h"` (~100년)로 로그인 차단 | P1       |
| TR-3 | RLS 정책에 `deleted_at IS NULL` 필터 추가                      | P1       |
| TR-4 | API 엔드포인트 `POST /api/auth/delete-account`                 | P1       |
| TR-5 | 미들웨어에서 banned 사용자 감지 시 쿠키 정리 + 리다이렉트      | P1       |

---

## 3. Architecture & Design

### Soft Delete 전략

```
사용자 탈퇴 요청
  ↓
1. users.deleted_at = NOW(), users.deletion_reason = '사유'
  ↓
2. supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: "876000h" })
   → auth.users.banned_until 설정 → 로그인 자동 차단
  ↓
3. 클라이언트 signOut() + 쿠키 정리
  ↓
4. 홈페이지 리다이렉트
```

**왜 `ban_duration`인가?** (`shouldSoftDelete: true` 대신)

- `shouldSoftDelete: true`는 auth.users에서 email/phone/name을 비가역적으로 삭제
- `ban_duration`은 모든 데이터 보존 + 로그인 자동 차단
- 복구 시 `ban_duration: "none"`으로 해제 가능

**데이터 처리**: 사용자 데이터는 그대로 보관하되 RLS로 접근 차단

- user_id FK 유지 (무결성)
- `deleted_at IS NULL` 필터로 쿼리에서 제외
- 향후 Phase 2에서 30일 후 익명화 스케줄러 구현 가능

### 파일 구조

```
신규 파일:
├── src/app/settings/page.tsx              # 설정 페이지
├── src/app/api/auth/delete-account/route.ts  # 탈퇴 API
├── src/components/DeleteAccountDialog.tsx  # 탈퇴 확인 모달
├── supabase/migrations/YYYYMMDD_soft_delete_users.sql  # 마이그레이션

수정 파일:
├── src/lib/supabase/middleware.ts         # banned 유저 감지
├── src/lib/api.ts                        # deleteAccount() 함수 추가
├── src/app/page.tsx                      # 설정 페이지 링크 (Settings 아이콘)
├── src/types/database.ts                 # deleted_at, deletion_reason 타입 추가
```

---

## 4. Implementation Plan

### Phase 1: DB 마이그레이션

**파일**: `supabase/migrations/YYYYMMDD_soft_delete_users.sql`

```sql
-- 1. users 테이블에 soft delete 컬럼 추가
ALTER TABLE public.users
  ADD COLUMN deleted_at timestamptz DEFAULT NULL,
  ADD COLUMN deletion_reason text DEFAULT NULL;

-- 2. 인덱스 (활성 사용자 필터링 최적화)
CREATE INDEX idx_users_deleted_at ON public.users(deleted_at)
  WHERE deleted_at IS NULL;

-- 3. RLS 정책 업데이트 — 탈퇴 사용자 데이터 접근 차단
-- 기존 정책 삭제 후 재생성 (deleted_at IS NULL 조건 추가)
```

### Phase 2: API 엔드포인트

**파일**: `src/app/api/auth/delete-account/route.ts`

```
POST /api/auth/delete-account
Body: { reason?: string }
Response: { success: true } | { error: string }
```

처리 순서:

1. `requireUser()`로 인증 확인
2. `users.deleted_at`이 이미 설정되어 있는지 확인 (중복 요청 방지)
3. `(supabaseAdmin as any).from("users").update({ deleted_at, deletion_reason })`
4. `supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: "876000h" })`
5. 서버 사이드 `signOut()` 호출
6. `{ success: true }` 반환

### Phase 3: UI 구현

**설정 페이지** (`src/app/settings/page.tsx`):

- 계정 정보 표시 (이메일, 닉네임)
- 회원탈퇴 섹션 (하단, 위험 영역 스타일링)
- 탈퇴 버튼 클릭 → DeleteAccountDialog 오픈

**탈퇴 확인 모달** (`src/components/DeleteAccountDialog.tsx`):

- Radix UI Dialog 사용 (기존 LoginPromptModal 패턴 참조)
- 경고 문구: "계정과 관련 데이터가 비활성화되며 로그인이 불가능합니다"
- "탈퇴합니다" 텍스트 입력 확인 (일치해야 버튼 활성화)
- 탈퇴 사유 선택 (선택사항)
- 탈퇴 버튼: destructive variant, 로딩 상태

### Phase 4: 미들웨어 업데이트

**파일**: `src/lib/supabase/middleware.ts`

- `getUser()` 실패 시 (banned 사용자) 에러 타입 확인
- 인증 쿠키(`sb-*`)가 존재하지만 getUser 실패 → 쿠키 정리 + 홈 리다이렉트
- `?reason=account_deleted` 쿼리 파라미터로 탈퇴 안내 표시

### Phase 5: 홈페이지 연동

**파일**: `src/app/page.tsx`

- 로그인 상태일 때 Settings 아이콘(이미 import됨)에 `/settings` 링크 추가
- `?reason=account_deleted` 쿼리 파라미터 감지 시 토스트 메시지

---

## 5. Quality Gates

### 필수 검증

- [ ] `npm run build` 성공
- [ ] `npx tsc --noEmit` 통과
- [ ] `npx eslint src/` 통과

### 기능 검증

- [ ] 설정 페이지 접근 가능 (로그인 상태)
- [ ] 탈퇴 확인 모달: "탈퇴합니다" 입력 전 버튼 비활성화
- [ ] 탈퇴 후 자동 로그아웃 + 홈 리다이렉트
- [ ] 탈퇴 후 재로그인 시도 시 차단 (ban_duration 적용)
- [ ] RLS 정책으로 탈퇴 사용자 데이터 접근 불가

---

## 6. Risks & Dependencies

| 리스크                                                | 영향                      | 대응                                           |
| ----------------------------------------------------- | ------------------------- | ---------------------------------------------- |
| JWT 만료 전 1시간 동안 기존 토큰 유효                 | 낮음 (사용자 본인이 요청) | 미들웨어에서 쿠키 정리로 즉시 로그아웃         |
| RLS 정책 수정 시 기존 쿼리 영향                       | 중간                      | 마이그레이션 후 전체 빌드 검증                 |
| `supabaseAdmin.auth.admin.updateUserById` 타입 불일치 | 낮음                      | `(supabaseAdmin as any)` 패턴 사용 (기존 규칙) |

---

## 7. Vercel React Best Practices 적용

- **server-serialization**: 설정 페이지 서버 컴포넌트 / 클라이언트 컴포넌트 분리
- **rerender-memo**: Dialog 상태가 부모 리렌더링 유발하지 않도록 분리
- **bundle-barrel-imports**: 새 컴포넌트 barrel export 지양

---

## 8. References

- [Supabase Auth Admin updateUserById](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid)
- [Supabase Auth Admin deleteUser](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser)
- mistakes.md: `(supabaseAdmin as any).from(...)` 패턴 필수

---

## Implementation Summary

**Completion Date**: 2026-03-29
**Implemented By**: Claude Opus 4.6

### Changes Made

#### Files Created (6)

- [src/app/api/auth/delete-account/route.ts](src/app/api/auth/delete-account/route.ts) — 탈퇴 API: soft delete(deleted_at) → signOut (ban 미사용)
- [src/app/api/auth/recover-account/route.ts](src/app/api/auth/recover-account/route.ts) — 복구 API: 15일 이내 검증 → deleted_at 초기화
- [src/components/DeleteAccountDialog.tsx](src/components/DeleteAccountDialog.tsx) — 탈퇴 확인 모달: 15일 복구 안내 + 사유 선택(칩) + "탈퇴합니다" 텍스트 확인
- [src/app/settings/page.tsx](src/app/settings/page.tsx) — 설정 페이지: 계정 정보 + 로그아웃 + 회원탈퇴
- [src/app/account-recovery/page.tsx](src/app/account-recovery/page.tsx) — 계정 복구 페이지: 남은 일수 표시 + 만료 시 안내
- [supabase/migrations] — soft_delete_users + cleanup_deleted_accounts_cron

#### Files Modified (4)

- [src/types/database.ts](src/types/database.ts) — users Row/Insert/Update에 deleted_at, deletion_reason 타입 추가
- [src/app/api/auth/me/route.ts](src/app/api/auth/me/route.ts) — admin으로 deleted_at 포함 조회, 탈퇴 유저에게 `{ deleted: true, deleted_at }` 반환
- [src/lib/api.ts](src/lib/api.ts) — getCurrentUser()에서 deleted 감지 시 /account-recovery 리다이렉트
- [src/app/page.tsx](src/app/page.tsx) — 헤더에 설정 아이콘 추가 + 탈퇴 완료 배너(15일 복구 안내)

#### DB Migrations

1. **soft_delete_users**: `deleted_at`, `deletion_reason` 컬럼 + RLS `deleted_at IS NULL` 필터
2. **cleanup_deleted_accounts_cron**: pg_cron 활성화 + `cleanup_deleted_accounts()` 함수 + 매일 KST 03:00 자동 실행

#### Key Implementation Details

- **Soft Delete 전략**: `users.deleted_at`만 사용 (ban 미사용 — 재가입 시 복구 플로우 지원)
- **15일 Grace Period**: 탈퇴 후 15일간 복구 가능, 이후 pg_cron이 하드 삭제
- **하드 삭제**: answers/questions user_id → NULL 익명화 → users CASCADE 삭제 → auth.users 삭제 (재가입 허용)
- **데이터 접근 차단**: RLS `deleted_at IS NULL` 필터 (탈퇴 유저는 본인 데이터 조회 불가)
- **복구 감지**: `/api/auth/me`가 admin으로 deleted_at 체크 → 클라이언트에서 /account-recovery로 유도
- **UX 플로우**: 5곳에 15일 복구 안내 (설정 페이지, 확인 모달, 홈 배너, 복구 페이지 기간 내/만료)

### Quality Validation

- [x] Build: Success
- [x] Type Check: Passed
- [x] Lint: Passed
- [x] pg_cron 함수 실행 테스트: `{ deleted: 0, failed: 0 }`

### Deviations from Plan

**Added (계획 이후 확장)**:

- 15일 grace period + 하드 삭제 (원래 계획은 soft delete만)
- 계정 복구 페이지 + API (원래 Phase 2 예정)
- pg_cron 자동 정리 (원래 Phase 2 예정)
- `/api/auth/me` admin 조회로 전환 (deleted_at 감지 위해)
- `getCurrentUser()`에서 deleted 감지 → 자동 리다이렉트

**Changed**:

- ban_duration 제거 → soft delete + RLS만으로 접근 차단 (복구 플로우 지원)
- 미들웨어 변경 없음 (원래 코드 유지, 성능 보존)

### Bugs Fixed During Implementation

- **미들웨어 오탐지**: `!user && error && hasAuthCookie` 조건이 세션 만료에도 탈퇴 리다이렉트 트리거 → 미들웨어 변경 자체를 철회하고 클라이언트 감지 방식으로 전환

### Performance Impact

- Bundle size: 설정/복구 페이지 + Dialog 추가 (~5KB)
- 미들웨어 DB 쿼리 없음 (성능 영향 제로)
- `/api/auth/me`만 admin 조회로 변경 (기존 대비 차이 미미)
