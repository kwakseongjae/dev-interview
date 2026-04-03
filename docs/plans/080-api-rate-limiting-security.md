# #80 API 어뷰징 방지: Rate Limiting + 인증 강화 + 비용 보호

**Issue**: [#80](https://github.com/kwakseongjae/dev-interview/issues/80)
**Branch**: `fix/80-api-rate-limiting`
**Type**: Bug / Security
**Priority**: HIGH

---

## 1. Overview

### 문제 정의

전체 API 보안 감사 결과 (49개 엔드포인트):

- **인증 없이 Claude API 호출 가능한 CRITICAL 취약점** 4개
- **Rate Limiting 전무** — 모든 엔드포인트에 횟수 제한 없음
- 악의적 사용자가 반복 호출 시 시간당 $50-500 Claude API 비용 발생 가능

### 비회원 플로우 제약

비회원 면접 체험(#71)이 핵심 기능이므로, 아래 엔드포인트는 **인증 필수화 불가**:

- `POST /api/questions/generate` — 비회원 면접의 핵심
- `POST /api/answers` — 비회원 답변 저장
- `POST /api/sessions` — 비회원 세션 생성
- `GET /api/questions/[id]/hint` — 비회원 면접 중 힌트

→ **Rate Limiting(Upstash)이 유일한 해결책**. IP 기반 일일 한도로 어뷰징만 차단.

### 추가 발견 사항

| #   | 문제                                                                       | 심각도 |
| --- | -------------------------------------------------------------------------- | ------ |
| 1   | `api_error_logs` 테이블 미존재 — `error-logger.ts` insert가 조용히 실패 중 | HIGH   |
| 2   | `POST /api/sessions` POST — 비인증 `summarizeQueryToTitle()` Claude 호출   | HIGH   |
| 3   | `POST /api/answers/[id]/model-answer` — Sonnet 모델 무제한 (가장 비싼)     | HIGH   |
| 4   | `GET /api/team-spaces/invite/[code]` — 초대 코드 브루트포스 가능           | MEDIUM |
| 5   | IP 추출 인프라 부재                                                        | HIGH   |

### 범위

- Phase 1: 인프라 구축 (Upstash + DB + 유틸리티)
- Phase 2: 비회원 보호 (IP 기반 Rate Limit) + 인증 가능한 곳 강화
- Phase 3: 인증 사용자 Rate Limit + 비용 쿼터
- Phase 4: 모니터링 대시보드

---

## 2. Upstash 도입 근거 (리서치 기반)

### 2.1 무료 티어 실제 한도 (2025년 3월 변경)

| 항목            | 값                                     | 출처                                   |
| --------------- | -------------------------------------- | -------------------------------------- |
| **월간 커맨드** | **500,000**                            | upstash.com/pricing                    |
| 일일 한도       | 없음 (순수 월간 기준)                  | upstash.com/docs/redis/overall/pricing |
| 스토리지        | 256 MB                                 |                                        |
| DB 개수         | 1개                                    |                                        |
| 초당 커맨드     | 10,000                                 |                                        |
| 대역폭          | 10 GB/월                               |                                        |
| **서울 리전**   | **없음** — 도쿄(ap-northeast-1) 최근접 |                                        |

### 2.2 Rate Limit 체크당 Redis 커맨드 소비

| 알고리즘         | 정상 요청 | 차단 (ephemeral cache hit) | Analytics |
| ---------------- | --------- | -------------------------- | --------- |
| **Fixed Window** | **2 cmd** | **0 cmd**                  | +1 cmd    |
| Sliding Window   | **4 cmd** | **0 cmd**                  | +1 cmd    |
| Token Bucket     | **4 cmd** | **0 cmd**                  | +1 cmd    |

### 2.3 우리 트래픽 vs 무료 한도

**현재 규모**: 유저 12명, 세션 53개(누적), 일일 API 150-250건

| 알고리즘                       | 월간 체크 가능 수 | 일일 환산 | 현재 사용률 |
| ------------------------------ | ----------------- | --------- | ----------- |
| Fixed Window (analytics OFF)   | ~250,000          | ~8,300    | **3%**      |
| Fixed Window (analytics ON)    | ~166,000          | ~5,500    | **4.5%**    |
| Sliding Window (analytics OFF) | ~125,000          | ~4,100    | **6%**      |

**임계점**: DAU ~400명 (일일 ~8,000 API 요청) 도달 시 무료 한도 접근
**유료 전환 비용**: $0.20/100K cmd → DAU 1,000명 기준 **월 $2-3**

### 2.4 레이턴시

- 도쿄 Redis → 한국 클라이언트: **~30-50ms** (네트워크 홉)
- Upstash edge caching 활성 시: **~5-15ms**
- Rate limit은 비즈니스 로직 전 체크라 UX 체감 영향 미미

### 2.5 Fail-Open 메커니즘 (공식 지원)

```typescript
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.fixedWindow(10, "60 s"),
  timeout: 3000, // ← 3초 내 응답 없으면 자동 pass
  ephemeralCache: new Map(), // ← 이미 차단된 IP는 Redis 호출 없이 로컬 거부
});
```

- `timeout`: Redis 미응답 시 `success: true` 반환 (공식 fail-open)
- 추가로 `try-catch` 감싸서 이중 안전망

### 2.6 Vercel Marketplace 통합

- Vercel 대시보드에서 Upstash 설치 → `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` **자동 주입**
- 별도 Upstash 계정 생성 불필요 (Vercel-managed)
- 재배포 시 자동 적용

### 2.7 대안 비교 (도입하지 않는 이유)

| 옵션             | 치명적 단점                                                |
| ---------------- | ---------------------------------------------------------- |
| 인메모리 (Map)   | Vercel 서버리스에서 인스턴스별 독립 → 전역 Rate Limit 불가 |
| Vercel KV        | 2024년 12월 폐지, Upstash로 이관됨                         |
| Cloudflare KV    | 쓰기 1,000/일 → Rate Limit에 부적합                        |
| Supabase DB 기반 | 매 요청 DB 쿼리 → 레이턴시, DB 부하 증가                   |
| Vercel WAF       | Pro 플랜 $20/month 필요                                    |

**결론**: Upstash가 유일하게 실효성 있는 선택지.

---

## 3. 엔드포인트별 보호 전략

### 3.1 비회원 허용 + Rate Limit 필수 (인증 강화 불가)

| 엔드포인트                     | 현재 인증      | Claude 호출                                       | 보호 방식                                                 |
| ------------------------------ | -------------- | ------------------------------------------------- | --------------------------------------------------------- |
| `POST /api/questions/generate` | Optional       | `generateQuestions()`                             | IP 기반: **3회/일** (비회원), **10회/분** (회원)          |
| `POST /api/answers`            | Optional       | 없음                                              | IP 기반: **30회/시** (비회원)                             |
| `POST /api/sessions`           | Optional(POST) | `summarizeQueryToTitle()` + `generateQuestions()` | IP 기반: **5회/일** (비회원)                              |
| `GET /api/questions/[id]/hint` | 없음           | `getOrGenerateHint()`                             | IP 기반: **10회/시** (DB 캐싱으로 재호출은 Claude 미호출) |

### 3.2 인증 강화 가능 + Rate Limit 추가

| 엔드포인트                                | 현재 인증 | 변경              | Claude 호출           | Rate Limit |
| ----------------------------------------- | --------- | ----------------- | --------------------- | ---------- |
| `POST /api/questions/replace`             | 없음      | → `requireUser()` | `generateQuestions()` | 10회/분    |
| `POST /api/case-studies/[slug]/questions` | 없음      | → `requireUser()` | `generateQuestions()` | 10회/분    |

### 3.3 인증 있음 + Rate Limit 추가 (Claude API)

| 엔드포인트                               | Claude 함수                  | 모델   | 예상 토큰 | Rate Limit       |
| ---------------------------------------- | ---------------------------- | ------ | --------- | ---------------- |
| `POST /api/answers/[id]/score`           | `evaluateAnswer()`           | Sonnet | ~1,000    | 10회/분, 50회/일 |
| `POST /api/answers/[id]/feedback/quick`  | `generateQuickFeedback()`    | Sonnet | ~256      | 10회/분, 50회/일 |
| `POST /api/answers/[id]/feedback/detail` | `generateDetailedFeedback()` | Sonnet | ~1,024    | 10회/분, 50회/일 |
| `POST /api/answers/[id]/feedback/full`   | `generateFullFeedback()`     | Sonnet | ~1,500    | 10회/분, 50회/일 |
| `POST /api/answers/[id]/model-answer`    | `generateModelAnswer()`      | Sonnet | ~1,024    | 10회/분, 50회/일 |
| `POST /api/references/upload`            | 없음 (간접)                  | —      | —         | 10회/일          |

### 3.4 비-Claude 보호

| 엔드포인트                           | 보호 방식                         |
| ------------------------------------ | --------------------------------- |
| `GET /api/team-spaces/invite/[code]` | IP 기반: 5회/분 (브루트포스 방지) |
| 나머지 모든 API                      | IP 기반: 60회/분 (기본 DDoS 방어) |

---

## 4. Architecture

### 4.1 요청 처리 흐름

```
API Request
│
├─ middleware.ts → 세션 리프레시 (기존 유지, 변경 없음)
│
└─ Route Handler 진입
   │
   ├─ 1. getClientIp() — IP 추출
   │
   ├─ 2. checkRateLimit(identifier, tier) — Upstash 체크
   │     ├─ 성공 → 계속
   │     ├─ 초과 → 429 반환 + 헤더
   │     └─ 에러 → fail-open (요청 허용)
   │
   ├─ 3. 인증 체크 (requireUser / getUserOptional)
   │
   ├─ 4. [Claude 엔드포인트만] checkDailyBudget()
   │     └─ 초과 → 503 "일일 한도 초과"
   │
   ├─ 5. 비즈니스 로직 실행
   │
   └─ 6. recordUsage() — fire-and-forget
```

### 4.2 Rate Limit 티어 설계

```typescript
// src/lib/ratelimit.ts

// 알고리즘: Fixed Window (2 cmd/check — 월 250K 체크 가능)
// Analytics: OFF (cmd 절약)

const TIERS = {
  // Claude API — 인증 사용자 (userId 기반)
  "ai-auth": fixedWindow(10, "60 s"), // 분당 10회

  // Claude API — 비회원 (IP 기반)
  "ai-anon": fixedWindow(3, "86400 s"), // 일 3회

  // 세션 생성 — 비회원 (IP 기반)
  "session-anon": fixedWindow(5, "86400 s"), // 일 5회

  // 파일 업로드 (userId 기반)
  upload: fixedWindow(10, "86400 s"), // 일 10회

  // 초대 코드 (IP 기반)
  invite: fixedWindow(5, "60 s"), // 분당 5회

  // 일반 API (IP 기반)
  general: fixedWindow(60, "60 s"), // 분당 60회
};
```

### 4.3 파일 구조

```
src/lib/
├── ratelimit.ts           # [NEW] Upstash Rate Limiter
│   ├── TIERS 정의
│   ├── checkRateLimit(identifier, tier) → { success, headers }
│   └── UPSTASH 미설정 시 인메모리 폴백
├── ip.ts                  # [NEW] getClientIp()
│   └── x-real-ip > x-forwarded-for > "127.0.0.1"
├── usage.ts               # [NEW] 일일 사용량 + 비용 쿼터
│   ├── checkDailyBudget() → { allowed, used, limit }
│   └── recordUsage(userId, ip, endpoint, tokens, cost)
└── api-guard.ts           # [NEW] 통합 가드 유틸리티
    └── withRateLimit(request, { tier, identifier? }) → Response | null

src/app/api/
├── questions/
│   ├── generate/route.ts     # [MODIFY] ai-anon / ai-auth 분기
│   ├── replace/route.ts      # [MODIFY] requireUser() + ai-auth
│   └── [id]/hint/route.ts    # [MODIFY] general (DB 캐싱 있으므로)
├── answers/
│   ├── route.ts              # [MODIFY] general (비회원 허용 유지)
│   └── [id]/
│       ├── score/route.ts          # [MODIFY] ai-auth
│       ├── model-answer/route.ts   # [MODIFY] ai-auth
│       └── feedback/
│           ├── quick/route.ts      # [MODIFY] ai-auth
│           ├── detail/route.ts     # [MODIFY] ai-auth
│           └── full/route.ts       # [MODIFY] ai-auth
├── case-studies/[slug]/
│   └── questions/route.ts    # [MODIFY] requireUser() + ai-auth
├── references/upload/route.ts # [MODIFY] upload
├── sessions/route.ts         # [MODIFY] session-anon (POST)
├── team-spaces/invite/[code]/route.ts  # [MODIFY] invite
└── admin/usage/route.ts      # [NEW] 사용량 조회 API
```

### 4.4 설계 결정

| 결정                            | 근거                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------- |
| **Fixed Window** (Sliding 아님) | 2 cmd/check vs 4 cmd → 무료 한도 2배 활용. 1분 윈도우에 정밀한 sliding 불필요 |
| **Analytics OFF**               | cmd +1 절약. 사용량 추적은 Supabase `api_usage_daily`로 별도 수행             |
| **per-route 유틸리티**          | mistakes.md 규칙: 미들웨어는 세션 리프레시만                                  |
| **userId 우선, IP 폴백**        | 공유 IP(오피스/VPN) 오탐 방지                                                 |
| **fail-open**                   | 가용성 우선. Upstash 장애 시 서비스 중단 방지                                 |
| **인메모리 폴백** (dev)         | 개발환경에서 UPSTASH 없이도 동작                                              |
| **Vercel Marketplace**          | 환경변수 자동 주입, 별도 계정 불필요                                          |

---

## 5. Implementation Plan

### Phase 1: 인프라 구축

**Task 1.1: 패키지 설치**

```bash
npm install @upstash/ratelimit @upstash/redis
```

**Task 1.2: DB 마이그레이션**

`api_error_logs` (이미 코드가 참조하지만 테이블 없음):

```sql
CREATE TABLE api_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type text NOT NULL,
  error_message text NOT NULL,
  error_code text,
  endpoint text,
  user_id uuid REFERENCES auth.users(id),
  session_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_error_logs_created ON api_error_logs(created_at DESC);
CREATE INDEX idx_error_logs_type ON api_error_logs(error_type);
-- RLS: admin read, service_role insert
```

`api_usage_daily`:

```sql
CREATE TABLE api_usage_daily (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul')::date,
  user_id uuid REFERENCES auth.users(id),
  ip_address text,
  endpoint text NOT NULL,
  request_count int NOT NULL DEFAULT 0,
  total_tokens int NOT NULL DEFAULT 0,
  estimated_cost_cents int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(day, COALESCE(user_id, '00000000-...'::uuid), COALESCE(ip_address, ''), endpoint)
);
-- RLS: admin read, service_role insert/update
-- increment_daily_usage() RPC 함수
```

**Task 1.3: `src/lib/ip.ts`**

```typescript
import { headers } from "next/headers";

export async function getClientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0].trim() ??
    "127.0.0.1"
  );
}
```

**Task 1.4: `src/lib/ratelimit.ts`**

- `Redis.fromEnv()` 사용 (Vercel Marketplace 자동 주입)
- 6개 티어 인스턴스 (ai-auth, ai-anon, session-anon, upload, invite, general)
- `checkRateLimit(identifier, tier)`: 성공 시 null, 실패 시 429 Response 반환
- `timeout: 3000` + try-catch fail-open
- UPSTASH 미설정 시 `Map` 기반 인메모리 폴백

**Task 1.5: `src/lib/usage.ts`**

- `recordUsage()`: `increment_daily_usage` RPC 호출 (fire-and-forget)
- `checkDailyBudget()`: 일일 전체 비용 합산 vs 상한선 ($5)

**Task 1.6: `src/lib/api-guard.ts`**

- `withRateLimit(request, options)` 헬퍼
- 내부: getClientIp() → 인증 확인 → checkRateLimit() → 429 or null

### Phase 2: 비회원 보호 + 인증 강화

**Task 2.1: `POST /api/questions/generate`**

- 비회원: `ai-anon` (IP 3회/일)
- 회원: `ai-auth` (10회/분)
- 기존 `getUserOptional()` 유지, 결과에 따라 tier 분기

**Task 2.2: `POST /api/sessions` (POST)**

- 비회원: `session-anon` (IP 5회/일)
- 회원: `ai-auth` (10회/분)

**Task 2.3: `GET /api/questions/[id]/hint`**

- `general` 티어 (DB 캐싱으로 Claude 재호출 방지됨)
- 인증 추가 안 함 (비회원 면접 플로우)

**Task 2.4: `POST /api/answers`**

- `general` 티어 (Claude 미호출)
- 인증 추가 안 함 (비회원 답변 저장)

**Task 2.5: `POST /api/questions/replace`**

- `requireUser()` 추가 (이 기능은 회원만 사용)
- `ai-auth` 티어

**Task 2.6: `POST /api/case-studies/[slug]/questions`**

- `requireUser()` 추가
- `ai-auth` 티어

### Phase 3: 인증 사용자 Rate Limit

**Task 3.1: Claude API 엔드포인트 일괄 적용** (`ai-auth`)

- `/api/answers/[id]/score`
- `/api/answers/[id]/feedback/quick`
- `/api/answers/[id]/feedback/detail`
- `/api/answers/[id]/feedback/full`
- `/api/answers/[id]/model-answer`

각 파일 상단에 Rate Limit 체크 3줄 추가:

```typescript
const ip = await getClientIp();
const blocked = await checkRateLimit(auth.sub, "ai-auth");
if (blocked) return blocked;
```

**Task 3.2: 파일 업로드** (`upload`)

- `/api/references/upload`

**Task 3.3: 초대 코드** (`invite`)

- `/api/team-spaces/invite/[code]`

**Task 3.4: 비용 쿼터 적용**

- Claude API 호출 전 `checkDailyBudget()` 추가
- 초과 시 503 반환: `{ error: "일일 사용 한도에 도달했습니다" }`

### Phase 4: 모니터링

**Task 4.1: `/api/admin/usage/route.ts`**

- `api_usage_daily` 테이블 조회
- 일별/엔드포인트별/사용자별 집계

**Task 4.2: 관리자 대시보드 패널**

- `src/app/admin/_components/usage-panel.tsx`
- 일일 요청 수, 비용 추정, 예산 사용률
- 기존 token-usage-panel 옆에 배치

---

## 6. Upstash 커맨드 소비 예측

### 현재 트래픽 (DAU ~10)

| 티어         | 일일 체크 수 | cmd/check | 일일 cmd         |
| ------------ | ------------ | --------- | ---------------- |
| ai-auth      | ~50          | 2         | 100              |
| ai-anon      | ~5           | 2         | 10               |
| session-anon | ~5           | 2         | 10               |
| general      | ~150         | 2         | 300              |
| upload       | ~2           | 2         | 4                |
| invite       | ~3           | 2         | 6                |
| **합계**     |              |           | **~430 cmd/day** |

**월간**: ~13,000 cmd → 무료 한도 500K의 **2.6%**

### 성장 시나리오

| DAU       | 일일 cmd    | 월간 cmd  | 무료 한도 대비 | 추가 비용    |
| --------- | ----------- | --------- | -------------- | ------------ |
| 10 (현재) | ~430        | ~13K      | 2.6%           | $0           |
| 50        | ~2,100      | ~63K      | 12.6%          | $0           |
| 100       | ~4,300      | ~129K     | 25.8%          | $0           |
| 300       | ~13,000     | ~390K     | 78%            | $0           |
| **500**   | **~21,500** | **~645K** | **129%**       | **$0.29/월** |
| 1,000     | ~43,000     | ~1.29M    | 258%           | **$1.58/월** |

---

## 7. Quality Gates

- [ ] `npm run build` 성공
- [ ] `npx tsc --noEmit` 통과
- [ ] `npx eslint src/` 통과
- [ ] 비회원 질문 생성 4회째 → 429 반환 확인
- [ ] 회원 Claude API 11회/분째 → 429 반환 확인
- [ ] Rate Limit 응답에 `X-RateLimit-*` 헤더 포함
- [ ] UPSTASH 미설정(dev) 시 인메모리 폴백 동작
- [ ] `requireUser()` 추가한 엔드포인트에 비인증 요청 → 401
- [ ] 기존 비회원 면접 플로우 (generate → answer → hint) 정상 동작
- [ ] Upstash timeout/에러 시 fail-open (요청 통과) 확인
- [ ] 관리자 대시보드 사용량 표시

---

## 8. Risks & Mitigation

| 리스크                  | 영향                                         | 완화                                                       |
| ----------------------- | -------------------------------------------- | ---------------------------------------------------------- |
| Upstash 장애            | Rate Limit 무력화                            | `timeout: 3000` + try-catch fail-open                      |
| 무료 한도 초과          | Redis `ERR max daily request limit` 하드블록 | fail-open으로 서비스 유지 + DAU 300 이전에 유료 전환       |
| 도쿄 리전 레이턴시      | +30-50ms per API call                        | edge caching으로 ~5-15ms. Rate limit 체크는 UX 임계 아님   |
| 공유 IP 오탐            | 오피스 사용자 제한                           | 인증 사용자는 userId 기반 (IP 무관)                        |
| 비회원 한도 너무 타이트 | 서비스 체험 부족                             | 3회/일 → 필요 시 5회로 조정 가능 (Redis key prefix 변경만) |

### 의존성 (사전 준비 필요)

1. **Vercel Marketplace에서 Upstash Redis 설치** → 환경변수 자동 주입
2. ~~별도 Upstash 계정 불필요~~ (Vercel-managed)
3. DB 마이그레이션 2개 (api_error_logs, api_usage_daily)

---

## 9. 배포 순서

1. Vercel Marketplace에서 Upstash Redis 설치 (환경변수 자동)
2. DB 마이그레이션 적용 (`api_error_logs`, `api_usage_daily`)
3. `.env.local`에 Upstash 환경변수 복사 (로컬 개발용)
4. 코드 배포 (Phase 1-4 일괄)
5. 배포 후 관리자 대시보드에서 사용량 모니터링
6. 비회원 한도(3회/일) 적정성 1주일 관찰 후 조정

---

## 10. References

- [GitHub Issue #80](https://github.com/kwakseongjae/dev-interview/issues/80)
- [@upstash/ratelimit v2.0.8](https://github.com/upstash/ratelimit-js) — `Ratelimit.fixedWindow()`, `timeout`, `ephemeralCache`
- [Upstash 커맨드 비용 문서](https://upstash.com/docs/redis/sdks/ratelimit-ts/costs)
- [Upstash Vercel 통합](https://upstash.com/docs/redis/howto/vercelintegration)
- [Upstash 가격](https://upstash.com/docs/redis/overall/pricing) — 500K cmd/월 무료, 이후 $0.20/100K
- [mistakes.md — 미들웨어 규칙](../../.claude/rules/mistakes.md)
- Supabase Project: `vigdrexjtfcweogiwooq` (ap-northeast-2)

---

## 11. Implementation Summary

**Completion Date**: 2026-04-02
**Implemented By**: Claude Opus 4.6

### Changes Made

#### New Files (7)

- `src/lib/ratelimit.ts` — Upstash Rate Limiter (6 티어, Fixed Window, fail-open, 인메모리 폴백)
- `src/lib/ip.ts` — 클라이언트 IP 추출 (x-real-ip > x-forwarded-for)
- `src/lib/usage.ts` — 일일 사용량 추적 (recordUsage, checkDailyBudget)
- `src/lib/timezone.ts` — KST 날짜 유틸리티 (getKstDateString)
- `src/app/api/admin/usage/route.ts` — 관리자 사용량 조회 API
- `src/app/admin/_components/usage-panel.tsx` — 관리자 대시보드 Rate Limit 탭

#### Modified Files (14)

- `package.json` — @upstash/ratelimit, @upstash/redis 추가
- `src/app/admin/page.tsx` — "Rate Limit" 탭 추가
- `src/app/api/questions/generate/route.ts` — general(IP) + ai-anon/ai-auth 분기
- `src/app/api/questions/replace/route.ts` — requireUser() + ai-auth
- `src/app/api/questions/[id]/hint/route.ts` — general(IP)
- `src/app/api/case-studies/[slug]/questions/route.ts` — requireUser() + ai-auth
- `src/app/api/answers/route.ts` — general(IP)
- `src/app/api/answers/[id]/score/route.ts` — ai-auth
- `src/app/api/answers/[id]/feedback/quick/route.ts` — ai-auth
- `src/app/api/answers/[id]/feedback/detail/route.ts` — ai-auth
- `src/app/api/answers/[id]/feedback/full/route.ts` — ai-auth
- `src/app/api/answers/[id]/model-answer/route.ts` — ai-auth
- `src/app/api/references/upload/route.ts` — upload
- `src/app/api/sessions/route.ts` — session-anon/ai-auth 분기
- `src/app/api/team-spaces/invite/[code]/route.ts` — invite

#### DB Migrations (2)

- `create_api_error_logs` — 에러 로그 테이블 (기존 코드가 참조하나 누락됨)
- `create_api_usage_daily` — 일일 사용량 테이블 + increment_daily_usage() RPC

### Quality Validation

- [x] Build: Success (3.7s)
- [x] Type Check: 0 errors
- [x] Lint: 0 errors (1 warning — 기존 파일, 이번 변경 무관)

### Deviations from Plan

**Added**:

- `src/lib/timezone.ts` — 계획에 없었으나 `usage.ts`의 KST 날짜 의존성으로 필요

**Changed**:

- `RatelimitResponse` 타입을 `@upstash/ratelimit`에서 import 시도 → 미 export → 자체 `RateLimitResult` 인터페이스로 정의
- 인증 사용자 라우트(score, feedback/\*, model-answer 등)에서 `getClientIp()` 불필요하여 제거 (userId 기반 Rate Limit만 적용)

**Skipped**:

- `recordUsage()` 호출 — 각 라우트에서 실제 비용/토큰 기록은 미적용 (Claude API 호출 결과의 토큰 수를 파싱하는 로직 필요, follow-up으로 분리)
- `checkDailyBudget()` 호출 — 유틸리티는 생성했으나 라우트에 적용하지 않음 (recordUsage와 함께 적용 필요)

### Follow-up Tasks

- [ ] 각 Claude API 호출 후 `recordUsage()` 연동 (토큰 수 추적)
- [ ] `checkDailyBudget()` 라우트 적용 (일일 $5 상한선)
- [ ] 비회원 한도(3회/일) 적정성 1주일 관찰 후 조정
- [ ] Case Study 조회수 서버 사이드 중복 방지 (IP + user_id 해시)

---

## QA Checklist

> Generated by qa-generator agent — 2026-04-02
> 총 42개 테스트 케이스 (High 18, Medium 16, Low 8)

### 핵심 기능 테스트 (High)

| #    | 테스트 시나리오                                  | 예상 결과                        |
| ---- | ------------------------------------------------ | -------------------------------- |
| FT-1 | 비회원 질문 생성 4회째                           | ai-anon(3/day) → 429             |
| FT-2 | 회원 질문 생성 11회/분째                         | ai-auth(10/min) → 429            |
| FT-3 | 비회원 `POST /api/questions/replace`             | 401 Unauthorized                 |
| FT-4 | 비회원 `POST /api/case-studies/[slug]/questions` | 401 Unauthorized                 |
| FT-5 | 비회원 세션 생성 6회째                           | session-anon(5/day) → 429        |
| FT-6 | 파일 업로드 11회째                               | upload(10/day) → 429             |
| FT-7 | 429 응답 헤더 확인                               | X-RateLimit-\*, Retry-After 포함 |
| FT-8 | 관리자 사용량 API                                | 일일 사용량 데이터 정상 반환     |

### 엣지 케이스

| #    | 시나리오                       | 예상 결과                   |
| ---- | ------------------------------ | --------------------------- |
| EC-1 | Upstash 장애 (잘못된 환경변수) | fail-open, 요청 통과        |
| EC-2 | UPSTASH 미설정                 | 인메모리 폴백 동작          |
| EC-3 | IP 헤더 우선순위               | x-real-ip > x-forwarded-for |
| EC-4 | KST 자정 리셋                  | 일일 카운터 리셋            |

### 회귀 테스트

| #    | 기능                                   | 예상 결과                   |
| ---- | -------------------------------------- | --------------------------- |
| RT-1 | 비회원 면접 (generate → answer → hint) | 한도 내 정상 동작           |
| RT-2 | 회원 면접 전체 플로우                  | 정상 동작                   |
| RT-3 | 관리자 대시보드 기존 탭                | 에러 로그, 토큰 사용량 정상 |
