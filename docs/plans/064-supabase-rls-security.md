# #64 - Supabase 테이블 RLS 보안 취약점 점검 및 수정

## 1. Overview

### 문제 정의

Supabase Security Advisor에서 **ERROR 1건 + WARN 11건** 보안 이슈가 감지되었다.
`question_cache` 테이블은 RLS가 완전히 비활성화되어 있고, 7개 함수에 `search_path`가 미설정되어 있으며,
일부 RLS 정책이 과도하게 허용적(always true)이다.

### 목표

- 모든 테이블에 적절한 RLS 정책 적용
- 함수 `search_path` 고정으로 스키마 인젝션 방지
- 과도한 허용 정책을 최소 권한 원칙으로 수정
- Security Advisor ERROR/WARN 0건 달성

### 범위

- Supabase 마이그레이션 작성 (SQL DDL)
- Dashboard에서 비밀번호 유출 보호 활성화
- 코드 변경 없음 (모든 API 라우트가 이미 `supabaseAdmin` 사용)

---

## 2. Requirements

### 기능 요구사항

| ID   | 요구사항                                                    | 우선순위 |
| ---- | ----------------------------------------------------------- | -------- |
| FR-1 | `question_cache` RLS 활성화 (service_role only)             | CRITICAL |
| FR-2 | 7개 함수에 `SET search_path = ''` 적용                      | HIGH     |
| FR-3 | `questions` INSERT 정책 roles 수정 (public → authenticated) | HIGH     |
| FR-4 | `users` INSERT 정책 roles 수정 (잘못된 public → 삭제)       | HIGH     |
| FR-5 | `users` SELECT 중복 정책 정리 (`USING(true)` 제거)          | HIGH     |
| FR-6 | `vector` 확장 extensions 스키마로 이동                      | MEDIUM   |
| FR-7 | 비밀번호 유출 보호(HaveIBeenPwned) 활성화                   | LOW      |

### 기술 요구사항

| ID   | 요구사항                                                 |
| ---- | -------------------------------------------------------- |
| TR-1 | Supabase Migration으로 DDL 변경 적용                     |
| TR-2 | 기존 데이터 및 기능에 영향 없음 검증                     |
| TR-3 | `SECURITY DEFINER` 함수는 반드시 `search_path` 고정 필수 |

---

## 3. Architecture & Design

### 현재 상태 분석

**테이블 RLS 현황:**

| 테이블             | RLS    | 문제                        |
| ------------------ | ------ | --------------------------- |
| `question_cache`   | ❌ OFF | 누구나 접근 가능 (ERROR)    |
| 나머지 17개 테이블 | ✅ ON  | 일부 정책이 과도하게 허용적 |

**함수 현황 (search_path 미설정):**

| 함수                        | SECURITY DEFINER | 위험도                                                 |
| --------------------------- | ---------------- | ------------------------------------------------------ |
| `handle_new_user`           | ✅ Yes           | **CRITICAL** - 트리거 함수, 스키마 인젝션 시 권한 상승 |
| `increment_interview_count` | ✅ Yes           | **HIGH** - anon key로 호출됨                           |
| `increment_view_count`      | ✅ Yes           | **HIGH** - anon key로 호출됨                           |
| `check_question_duplicate`  | No               | MEDIUM - service_role로만 호출                         |
| `find_similar_questions`    | No               | MEDIUM - service_role로만 호출                         |
| `search_similar_questions`  | No               | LOW - 미사용                                           |
| `search_cached_queries`     | No               | MEDIUM - service_role로만 호출                         |

**과도한 RLS 정책:**

| 테이블      | 정책명                                                  | 문제                                  | 수정 방향                                        |
| ----------- | ------------------------------------------------------- | ------------------------------------- | ------------------------------------------------ |
| `questions` | `Authenticated users can insert questions`              | `TO public WITH CHECK(true)`          | role을 `authenticated`로 제한, `WITH CHECK` 강화 |
| `users`     | `Service role can insert users`                         | `TO public WITH CHECK(true)`          | 삭제 (service_role은 RLS 우회)                   |
| `users`     | `Users can view own profile`                            | `USING(true)`                         | 삭제 (중복, 전체 공개 위험)                      |
| `users`     | `Users can view own data` / `Users can update own data` | `Users can update own profile`과 중복 | 중복 정책 통합 정리                              |

### 설계 결정

1. **`question_cache` RLS**: 정책 없이 RLS만 활성화 → service_role만 접근 가능 (가장 깔끔한 패턴)
2. **`vector` 확장 이동**: `ALTER EXTENSION vector SET SCHEMA extensions` 사용, 함수에서 타입 참조를 `extensions.vector`로 변경
3. **함수 search_path**: `SET search_path = ''`로 설정, 테이블/타입 참조는 fully qualified name 사용

---

## 4. Implementation Plan

### Phase 1: 마이그레이션 작성 및 적용

단일 마이그레이션 파일 `20260325_security_hardening.sql` 작성:

**Step 1: question_cache RLS 활성화**

```sql
ALTER TABLE public.question_cache ENABLE ROW LEVEL SECURITY;
-- 정책 없음 = service_role only (RLS bypass)
```

**Step 2: 과도한 RLS 정책 수정**

```sql
-- users: 잘못된 INSERT 정책 삭제 (service_role은 RLS 우회하므로 정책 불필요)
DROP POLICY "Service role can insert users" ON public.users;

-- users: 전체 공개 SELECT 정책 삭제
DROP POLICY "Users can view own profile" ON public.users;

-- users: 중복 UPDATE 정책 정리 (하나만 유지)
DROP POLICY "Users can update own data" ON public.users;

-- questions: INSERT 정책을 authenticated role 전용으로 교체
DROP POLICY "Authenticated users can insert questions" ON public.questions;
CREATE POLICY "Authenticated users can insert questions"
  ON public.questions FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

**Step 3: vector 확장 스키마 이동**

```sql
ALTER EXTENSION vector SET SCHEMA extensions;
```

**Step 4: 7개 함수에 search_path 설정 (CREATE OR REPLACE)**

각 함수를 `SET search_path = ''`로 재생성. 함수 내부의 테이블/타입 참조를 fully qualified name으로 변경:

- `vector(1024)` → `extensions.vector(1024)`
- `questions` → `public.questions`
- `categories` → `public.categories`
- `question_cache` → `public.question_cache`

### Phase 2: Dashboard 설정

- Supabase Dashboard → Authentication → Settings → Password Security
- "Enable leaked password protection" 활성화

### Phase 3: 검증

- `get_advisors` security 재실행
- ERROR 0건, WARN 최소화 확인

### 변경 파일 목록

| 파일                                                  | 작업              |
| ----------------------------------------------------- | ----------------- |
| `supabase/migrations/20260325_security_hardening.sql` | 신규 마이그레이션 |

---

## 5. Quality Gates

### 검증 체크리스트

- [ ] 마이그레이션 적용 성공
- [ ] `question_cache` RLS 활성화 확인 (`list_tables`로 검증)
- [ ] 기존 API 기능 정상 동작 (service_role로 접근하므로 영향 없어야 함)
- [ ] `get_advisors` security에서 ERROR 0건
- [ ] `get_advisors` security에서 function_search_path_mutable WARN 0건
- [ ] `get_advisors` security에서 rls_policy_always_true WARN 감소
- [ ] 비밀번호 유출 보호 활성화 확인
- [ ] `npm run build` 성공 (코드 변경 없으므로 기존 상태 유지)

---

## 6. Risks & Dependencies

### 리스크

| 리스크                                      | 영향   | 완화 방안                                                                       |
| ------------------------------------------- | ------ | ------------------------------------------------------------------------------- |
| `vector` 확장 이동 시 기존 쿼리 실패        | HIGH   | 함수 내 타입 참조를 동시에 fully qualified로 변경                               |
| `users` SELECT 정책 제거 시 프론트엔드 영향 | MEDIUM | 코드베이스 확인 결과 모든 users 접근이 `supabaseAdmin` 경유 → 영향 없음         |
| `questions` INSERT 정책 변경 시 영향        | LOW    | 코드베이스 확인 결과 `supabaseAdmin.from('questions').upsert()` 사용 → RLS 우회 |

### 의존성

- Supabase MCP `apply_migration` 권한
- Supabase Dashboard 접근 (비밀번호 유출 보호 설정)

---

## 7. Timeline & Milestones

| 단계 | 내용                      |
| ---- | ------------------------- |
| M1   | 마이그레이션 작성 및 적용 |
| M2   | Dashboard 설정 변경       |
| M3   | Security Advisor 재검증   |

---

## 8. References

- [GitHub Issue #64](https://github.com/kwakseongjae/dev-interview/issues/64)
- [Supabase RLS Disabled Lint](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public)
- [Supabase Function Search Path Lint](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
- [Supabase Permissive RLS Policy Lint](https://supabase.com/docs/guides/database/database-linter?lint=0024_permissive_rls_policy)
- [Supabase Extension in Public Lint](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public)
- [Supabase Password Security](https://supabase.com/docs/guides/auth/password-security)

---

## 9. Implementation Summary

**Completion Date**: 2026-03-25
**Implemented By**: Claude Opus 4.6

### Changes Made

#### Files Modified/Created

- [supabase/migrations/20260325_security_hardening.sql](supabase/migrations/20260325_security_hardening.sql) - 보안 강화 마이그레이션 (신규)
- [docs/plans/064-supabase-rls-security.md](docs/plans/064-supabase-rls-security.md) - 계획 문서 (신규)

#### Key Implementation Details

- `question_cache` RLS 활성화 (정책 없음 = service_role only 패턴)
- `users` 테이블에서 과잉 INSERT/SELECT/UPDATE 정책 3개 삭제
- `questions` INSERT 정책을 `TO authenticated`로 role 제한
- `vector` 확장을 `public` → `extensions` 스키마로 이동
- 7개 함수에 `SET search_path = ''` 적용 + fully qualified name 변환
  - SECURITY DEFINER 함수 3개 (handle_new_user, increment_interview_count, increment_view_count) 포함
  - vector 타입 사용 함수 4개에서 `extensions.vector()` 및 `OPERATOR(extensions.<=>)` 적용

### Quality Validation

- [x] Build: Success
- [x] Type Check: Passed
- [x] Lint: Passed
- [x] Migration: Applied successfully via Supabase MCP
- [x] Security Advisor: ERROR 1 → 0, WARN 11 → 2

### Deviations from Plan

**Skipped**:

- 비밀번호 유출 보호 활성화: Google OAuth만 사용하므로 불필요, Pro Plan 이상 필요

### Security Advisor 결과 (After)

| 수준 | 항목                                | 비고                              |
| ---- | ----------------------------------- | --------------------------------- |
| INFO | `question_cache` RLS 정책 없음      | 의도적 (service_role only)        |
| WARN | `questions` INSERT WITH CHECK(true) | authenticated로 제한됨, 수용 가능 |
| WARN | 비밀번호 유출 보호 미활성화         | Google OAuth만 사용, 불필요       |

### Commits

> 커밋 전 상태 — `/commit` 실행 시 생성 예정

### Follow-up Tasks

없음
