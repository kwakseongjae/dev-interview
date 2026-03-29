# Plan: 비회원 면접 트래킹 + 관리자 대시보드

**Issue**: [#71](https://github.com/kwakseongjae/dev-interview/issues/71)
**Branch**: `feat/71-admin-dashboard`
**Created**: 2026-03-30

---

## 1. Overview

### 문제 정의

현재 비회원도 면접 질문을 생성하고 연습할 수 있으나, 사용 데이터를 추적/분석할 수 있는 UI가 없음. 비회원 사용 패턴 파악 및 전환율 분석을 위한 관리자 전용 대시보드가 필요.

### 목표

- 관리자 전용 대시보드(`/admin`)에서 비회원/회원 사용 현황을 한눈에 확인
- 일별/주별 트렌드, 인기 쿼리, 면접 유형 분포, 전환율 등 핵심 지표 시각화
- 기간 필터를 통한 유연한 데이터 조회

### 범위

- 새 페이지: `/admin` (관리자 대시보드)
- 새 API: `/api/admin/stats` (통계 조회)
- 관리자 인증: 환경변수 `ADMIN_EMAILS` 기반 이메일 허용 목록
- DB: PostgreSQL RPC 함수로 집계 쿼리 구현
- UI: shadcn chart (recharts) + shadcn table 추가

---

## 2. Requirements

### 기능 요구사항 (FR)

| ID    | 요구사항                                                           | 우선순위 |
| ----- | ------------------------------------------------------------------ | -------- |
| FR-1  | 관리자 대시보드 페이지 (`/admin`) 접근 가능                        | P1       |
| FR-2  | 관리자 인증 (비관리자 접근 차단, 이메일 허용 목록)                 | P1       |
| FR-3  | KPI 카드: 총 세션 수, 오늘 세션 수, 총 사용자 수, 비회원 세션 비율 | P1       |
| FR-4  | 일별 세션 추이 차트 (비회원 vs 회원 구분)                          | P1       |
| FR-5  | 비회원 vs 회원 세션 비율 표시                                      | P1       |
| FR-6  | 인기 쿼리 Top 10 (비회원 기준)                                     | P1       |
| FR-7  | 면접 유형별 분포 차트                                              | P1       |
| FR-8  | 기간 필터 (최근 7일, 30일, 전체)                                   | P1       |
| FR-9  | 비회원 → 회원 전환율 표시 (세션 claim 기준)                        | P2       |
| FR-10 | 세션 완료율 (비회원 vs 회원)                                       | P2       |
| FR-11 | 최근 비회원 세션 목록 테이블                                       | P2       |

### 기술 요구사항 (TR)

| ID   | 요구사항                                                     |
| ---- | ------------------------------------------------------------ |
| TR-1 | PostgreSQL RPC 함수로 집계 쿼리 (단일 DB 라운드트립)         |
| TR-2 | shadcn chart (recharts) + shadcn table 컴포넌트 설치         |
| TR-3 | Server Component 기반 페이지 + Client Component 차트/테이블  |
| TR-4 | `ADMIN_EMAILS` 환경변수로 관리자 식별                        |
| TR-5 | layout.tsx + API route 양쪽에서 인증 검증 (방어적 이중 체크) |

### 비기능 요구사항 (NFR)

| ID    | 요구사항                               |
| ----- | -------------------------------------- |
| NFR-1 | 대시보드 로딩 3초 이내 (RPC 단일 쿼리) |
| NFR-2 | 반응형 레이아웃 (모바일 대응)          |
| NFR-3 | 로딩 상태 스켈레톤 표시                |

---

## 3. Architecture & Design

### 설계 결정

**1. 관리자 인증: 환경변수 이메일 허용 목록**

- `ADMIN_EMAILS=admin@example.com,admin2@example.com`
- DB에 `is_admin` 컬럼 추가 대비 간단하고 빠른 구현
- 관리자가 1~2명인 현재 규모에 적합

**2. 데이터 집계: PostgreSQL RPC 함수**

- Supabase JS 클라이언트의 여러 쿼리 대신 단일 RPC 호출
- GROUP BY, COUNT 등 복잡한 집계를 DB 레벨에서 처리
- 네트워크 라운드트립 최소화

**3. 인증 위치: layout.tsx (서버 사이드)**

- mistakes.md 규칙: 미들웨어에 인증 로직 추가 금지
- layout.tsx에서 서버 사이드 인증 → 실패 시 redirect("/")
- API route에서도 동일하게 검증 (방어적 이중 체크)

**4. 차트 라이브러리: shadcn chart (recharts 래핑)**

- 프로젝트에 이미 shadcn 사용 중 → 일관된 테마 적용
- `"use client"` 컴포넌트로 차트 렌더링

### 컴포넌트 구조

```
src/app/admin/
├── layout.tsx              # Server Component: 관리자 인증 게이트
├── page.tsx                # Server Component: 데이터 fetch + 대시보드 렌더링
├── loading.tsx             # 스켈레톤 로딩
└── _components/
    ├── stat-cards.tsx      # KPI 카드 4개 (총 세션, 오늘, 사용자, 비회원 비율)
    ├── daily-trend-chart.tsx    # "use client" 일별 추이 LineChart
    ├── type-distribution-chart.tsx  # "use client" 면접 유형 BarChart
    ├── popular-queries.tsx      # 인기 쿼리 Top 10 리스트
    ├── period-filter.tsx        # "use client" 기간 필터 (7일/30일/전체)
    ├── conversion-stats.tsx     # 전환율 + 완료율 표시
    └── recent-sessions-table.tsx # "use client" 최근 비회원 세션 테이블

src/app/api/admin/
└── stats/
    └── route.ts            # GET: 관리자 통계 API (RPC 호출)
```

### API 설계

**GET /api/admin/stats?period=7d|30d|all**

Response:

```json
{
  "overview": {
    "total_sessions": 1234,
    "today_sessions": 45,
    "total_users": 300,
    "guest_session_ratio": 0.42
  },
  "daily_trend": [{ "date": "2026-03-23", "guest": 12, "member": 8 }],
  "popular_queries": [{ "query": "프론트엔드 3년차", "count": 25 }],
  "type_distribution": [
    {
      "type_name": "기술면접",
      "display_name": "기술면접",
      "count": 80,
      "color": "#..."
    }
  ],
  "conversion": {
    "claimed_sessions": 50,
    "total_guest_sessions": 200,
    "rate": 0.25
  },
  "completion": {
    "guest_rate": 0.6,
    "member_rate": 0.85
  },
  "recent_guest_sessions": [
    {
      "id": "...",
      "query": "...",
      "created_at": "...",
      "question_count": 5,
      "is_completed": true
    }
  ]
}
```

---

## 4. Implementation Plan

### Phase 1: 기반 설정 (Setup)

| 작업                 | 파일               | 설명                                |
| -------------------- | ------------------ | ----------------------------------- |
| shadcn 컴포넌트 설치 | -                  | `npx shadcn@latest add chart table` |
| 환경변수 추가        | `.env.local`       | `ADMIN_EMAILS` 추가                 |
| RPC 함수 생성        | Supabase Migration | `get_admin_stats(period text)` 함수 |

### Phase 2: 핵심 구현 (Core)

| 작업            | 파일                                                    | 설명                     |
| --------------- | ------------------------------------------------------- | ------------------------ |
| 관리자 레이아웃 | `src/app/admin/layout.tsx`                              | 서버 사이드 인증 게이트  |
| 통계 API        | `src/app/api/admin/stats/route.ts`                      | RPC 호출 + 인증          |
| 대시보드 페이지 | `src/app/admin/page.tsx`                                | 서버 컴포넌트, API fetch |
| KPI 카드        | `src/app/admin/_components/stat-cards.tsx`              | 4개 핵심 지표            |
| 기간 필터       | `src/app/admin/_components/period-filter.tsx`           | 7일/30일/전체            |
| 일별 추이 차트  | `src/app/admin/_components/daily-trend-chart.tsx`       | LineChart                |
| 유형 분포 차트  | `src/app/admin/_components/type-distribution-chart.tsx` | BarChart                 |
| 인기 쿼리       | `src/app/admin/_components/popular-queries.tsx`         | Top 10 리스트            |

### Phase 3: 부가 기능 (Polish)

| 작업            | 파일                                                  | 설명                 |
| --------------- | ----------------------------------------------------- | -------------------- |
| 전환율 + 완료율 | `src/app/admin/_components/conversion-stats.tsx`      | 비회원→회원 전환     |
| 세션 테이블     | `src/app/admin/_components/recent-sessions-table.tsx` | 최근 비회원 세션     |
| 로딩 스켈레톤   | `src/app/admin/loading.tsx`                           | 스켈레톤 UI          |
| 반응형 대응     | -                                                     | 모바일 레이아웃 조정 |

---

## 5. Quality Gates

### 필수 검증

- [ ] `npm run build` 성공
- [ ] `npx tsc --noEmit` 타입 에러 없음
- [ ] `npx eslint src/` 린트 통과
- [ ] 비관리자 접근 시 `/` 리다이렉트 확인
- [ ] 미로그인 사용자 접근 차단 확인
- [ ] 기간 필터 (7일/30일/전체) 정상 동작
- [ ] 차트 데이터 정상 렌더링
- [ ] 모바일 반응형 확인

### Vercel React Best Practices 적용

- `server-*`: 페이지는 Server Component, 차트만 Client Component
- `bundle-*`: recharts 동적 import 고려
- `rerender-*`: 필터 상태 변경 시 불필요한 리렌더 방지

---

## 6. Risks & Dependencies

| 리스크             | 영향                 | 대응                                             |
| ------------------ | -------------------- | ------------------------------------------------ |
| recharts 번들 크기 | 번들 증가            | 동적 import + `/admin` 전용 (일반 사용자 미영향) |
| RPC 함수 성능      | 대량 데이터 시 느림  | 30일 기본 필터, 인덱스 활용                      |
| 관리자 이메일 변경 | 환경변수 재배포 필요 | 향후 DB role 기반으로 전환 가능                  |

---

## 7. References

- [shadcn/ui Chart](https://ui.shadcn.com/docs/components/chart)
- [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/data-table)
- [Supabase RPC Functions](https://supabase.com/docs/reference/javascript/rpc)
- mistakes.md: 미들웨어에 인증 로직 추가 금지 규칙

---

## Implementation Summary

**Completion Date**: 2026-03-30
**Implemented By**: Claude Opus 4.6

### Changes Made

#### New Files

- `src/app/admin/layout.tsx` — 서버 사이드 관리자 인증 게이트 (DB `is_admin` 기반)
- `src/app/admin/page.tsx` — 대시보드 메인 페이지 (기간 필터 + 데이터 fetch)
- `src/app/admin/loading.tsx` — 스켈레톤 로딩 UI
- `src/app/admin/_components/stat-cards.tsx` — KPI 카드 4개 (총 세션, 오늘, 사용자, 비회원 비율)
- `src/app/admin/_components/daily-trend-chart.tsx` — 일별 세션 추이 LineChart (비회원/회원 구분)
- `src/app/admin/_components/type-distribution-chart.tsx` — 면접 유형별 BarChart
- `src/app/admin/_components/popular-queries.tsx` — 인기 쿼리 Top 10
- `src/app/admin/_components/period-filter.tsx` — 기간 필터 (7일/30일/전체)
- `src/app/admin/_components/conversion-stats.tsx` — 전환율 + 완료율 비교
- `src/app/admin/_components/recent-sessions-table.tsx` — 최근 비회원 세션 테이블
- `src/app/api/admin/stats/route.ts` — 관리자 통계 API (11개 병렬 쿼리)
- `src/components/ui/chart.tsx` — shadcn chart 컴포넌트 (recharts 래핑)
- `docs/plans/071-admin-dashboard.md` — 계획 문서
- `specs/2-admin-dashboard/spec.md` — 스펙 문서
- `specs/2-admin-dashboard/checklists/requirements.md` — 품질 체크리스트

#### Files Modified

- `src/app/api/sessions/[id]/claim/route.ts` — `claimed_at` 타임스탬프 기록 추가
- `src/app/api/auth/me/route.ts` — `is_admin` 필드 반환 추가
- `src/app/page.tsx` — 관리자용 Shield 아이콘 버튼 추가 (헤더)
- `src/lib/api.ts` — `UserInfo` 타입에 `is_admin` 필드 추가
- `src/types/database.ts` — `claimed_at`, `is_admin` 필드 추가
- `package.json` / `package-lock.json` — recharts 추가 + npm audit fix

#### DB Migrations

1. `add_claimed_at_to_interview_sessions` — `claimed_at` 컬럼 + 인덱스 3개
2. `add_is_admin_to_users` — `is_admin` 컬럼 + 관리자 유저 설정

### Quality Validation

- [x] Build: Success
- [x] Type Check: Passed
- [x] Lint: Passed
- [x] npm audit: 0 vulnerabilities (5개 fix 완료)

### Deviations from Plan

**Changed**:

- 관리자 인증: 환경변수(`ADMIN_EMAILS`) → DB 기반(`users.is_admin`) 변경 (사용자 요청)
- RPC 함수 대신 API route에서 11개 Supabase 쿼리를 `Promise.all`로 병렬 실행 (유지보수성 우선)

**Added**:

- 헤더에 관리자 전용 Shield 아이콘 버튼 (사용자 요청)
- `/api/auth/me`에서 `is_admin` 반환
- npm audit fix (brace-expansion, flatted, next, picomatch, yaml)

### Performance Impact

- recharts 번들: `/admin` 페이지에서만 로드 (일반 사용자 미영향)
- 통계 API: 11개 쿼리 병렬 실행으로 응답 시간 최소화
