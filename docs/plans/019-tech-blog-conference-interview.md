# Plan: 테크 블로그/컨퍼런스 기반 사례 고난도 면접 기능

**Issue**: [#19](https://github.com/kwakseongjae/dev-interview/issues/19) - 테크 블로그/컨퍼런스 기반 실제 사례 고난도 면접 기능
**Branch**: `feat/19-tech-blog-conference-interview`
**Created**: 2026-02-06
**Status**: Planning

---

## 1. Overview

### Problem Statement

현재 mochabun의 AI 면접 질문은 일반적인 기술 개념(CS, 프로젝트, 시스템 설계) 위주로 생성됩니다. 시니어/리드급 개발자나 CTO/VP Engineering 면접을 준비하는 사용자에게는 **실제 기업의 기술적 도전과 해결 사례** 기반의 심층 면접 질문이 필요합니다.

### Objectives

1. 공신력 있는 테크 블로그/컨퍼런스 레퍼런스를 구조화된 케이스 스터디로 관리
2. 케이스 스터디를 탐색하고 학습할 수 있는 브라우징 UI 제공
3. 케이스 스터디 기반 C레벨 고난도 면접 세션 진행 기능
4. 기업/기술 도메인별 맞춤 면접 준비 지원

### Scope

- **In Scope**: 케이스 스터디 데이터 모델, 브라우징 페이지, 면접 세션 UI, AI 질문 생성 확장
- **Out of Scope**: 자동 크롤링/스크래핑 (초기에는 수동 큐레이션), 유료화, 사용자 케이스 스터디 제출

### 사용자 시나리오

> "Toss가 20년 된 코어뱅킹 시스템을 MSA로 전환한 사례를 읽고, 그 사례를 기반으로 면접관이 물어볼 수 있는 고난도 질문에 답변 연습을 하고 싶어요."

---

## 2. Requirements

### Functional Requirements

| ID    | 요구사항                                                | 우선순위 |
| ----- | ------------------------------------------------------- | -------- |
| FR-1  | 케이스 스터디 목록을 카드 그리드로 탐색                 | P1       |
| FR-2  | 기업/기술 도메인/난이도/소스 타입별 필터링              | P1       |
| FR-3  | 케이스 스터디 상세 페이지 (구조화된 요약)               | P1       |
| FR-4  | 케이스 스터디 기반 면접 세션 시작                       | P1       |
| FR-5  | 스플릿 뷰: 케이스 스터디 참고자료 + 면접 질문/답변 영역 | P1       |
| FR-6  | 학습 모드 / 면접 모드 토글                              | P2       |
| FR-7  | 힌트 단계적 공개 (3단계)                                | P2       |
| FR-8  | 케이스 스터디 즐겨찾기                                  | P2       |
| FR-9  | 검색 (Cmd+K 커맨드 팔레트)                              | P3       |
| FR-10 | 관련 케이스 스터디 추천                                 | P3       |

### Technical Requirements

| ID   | 요구사항                                                         | 우선순위 |
| ---- | ---------------------------------------------------------------- | -------- |
| TR-1 | Supabase에 case_studies 테이블 + RLS                             | P1       |
| TR-2 | InterviewTypeCode에 "CASE_STUDY" 추가                            | P1       |
| TR-3 | Claude AI 프롬프트에 케이스 스터디 컨텍스트 주입                 | P1       |
| TR-4 | Server Component로 목록 페이지 구현 (Streaming)                  | P1       |
| TR-5 | Client Component로 면접 세션 구현                                | P1       |
| TR-6 | Resizable split-view (react-resizable-panels)                    | P1       |
| TR-7 | 새 Shadcn 컴포넌트 설치 (Tabs, Accordion, Command, Resizable 등) | P1       |
| TR-8 | URL searchParams 기반 필터 상태 관리 (SSR 지원)                  | P2       |

### Non-Functional Requirements

| ID    | 요구사항                              |
| ----- | ------------------------------------- |
| NFR-1 | 케이스 스터디 목록 페이지 LCP < 1.5s  |
| NFR-2 | 면접 세션 TTI < 2.0s (dynamic import) |
| NFR-3 | 모바일 반응형 (md: 브레이크포인트)    |
| NFR-4 | 한국어 UI + 영어 기술 용어 혼합 지원  |

---

## 3. Architecture & Design

### 3.1 UI 설계

#### A. 케이스 스터디 브라우징 페이지 (`/case-studies`)

```
+------------------+------------------------------------------+
| SIDEBAR FILTERS  |  CONTENT AREA                            |
| (desktop only)   |                                          |
|                  |  [검색바] [정렬: 최신|인기|난이도]         |
| 기업              |                                          |
| [ ] Toss         |  +----------+  +----------+  +----------+|
| [ ] Netflix      |  | Card     |  | Card     |  | Card     ||
| [ ] Uber         |  | [Logo]   |  | [Logo]   |  | [Logo]   ||
|                  |  | Title    |  | Title    |  | Title    ||
| 기술 도메인        |  | [Tags]   |  | [Tags]   |  | [Tags]   ||
| [ ] MSA          |  | [Diff]   |  | [Diff]   |  | [Diff]   ||
| [ ] 분산시스템     |  +----------+  +----------+  +----------+|
| [ ] 프론트엔드     |                                          |
|                  |  +----------+  +----------+  +----------+|
| 난이도            |  | Card     |  | Card     |  | Card     ||
| [ ] A (기본)      |  +----------+  +----------+  +----------+|
| [ ] B (심화)      |                                          |
| [ ] C (고난도)    |  [더 보기...]                              |
|                  |                                          |
| 소스              |                                          |
| [ ] 블로그        |                                          |
| [ ] 컨퍼런스      |                                          |
+------------------+------------------------------------------+
```

**모바일**: 사이드바 → 수평 스크롤 필터 칩 + Sheet(드로어) 필터 패널

#### B. 케이스 스터디 카드

```
+-----------------------------------------------+
| [Netflix 로고 32x32]  Netflix Engineering      |
| "GraphQL Federation으로 200+ MSA 통합"          |
|                                                |
| [MSA] [GraphQL] [분산시스템]                     |
|                                                |
| 난이도: [==========] C레벨                      |
| 소스: 블로그  |  2024.03.15                      |
|                                                |
| 5개 면접 질문 | 128명 연습                        |
| [학습하기] [면접 시작]                            |
+-----------------------------------------------+
```

#### C. 케이스 스터디 상세 + 면접 세션 (스플릿 뷰)

```
+----------------------------------------------------------+
| HEADER: 타이머 | 진행도 | 케이스 제목 | 모드 토글 | 제출   |
+----------------------------------------------------------+
| 케이스 참고자료 (리사이즈) |  면접 영역 (리사이즈)         |
|                           |                               |
| [Accordion: 배경]          |  Q2/5: [시스템설계]           |
|   Netflix의 기존 REST BFF  |                               |
|   아키텍처에서 N+1 문제... |  "Netflix의 GraphQL          |
|                           |  Federation 아키텍처에서..."   |
| [Accordion: 도전과제]      |                               |
|   - 200+ MSA 다른 계약     |  [답변 텍스트 에어리어]        |
|   - 100ms 미만 레이턴시    |                               |
|                           |  [힌트 1단계] [힌트 2단계]    |
| [Accordion: 해결방안]      |  [이전] [●●○○○] [다음]       |
|   DGS 프레임워크 도입...   |                               |
|                           |                               |
| [Accordion: 결과]          |                               |
|   - API 응답 40% 감소     |                               |
|                           |                               |
| [원문 링크]                |                               |
+----------------------------------------------------------+
```

**모바일**: 스플릿 뷰 → 탭으로 전환 (탭 1: 케이스 스터디 / 탭 2: 면접)

### 3.2 데이터 모델

#### Supabase 테이블: `case_studies`

```sql
CREATE TABLE case_studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 기본 정보
  title text NOT NULL,
  slug text UNIQUE NOT NULL,

  -- 기업 정보
  company_name text NOT NULL,
  company_logo_url text,
  company_slug text NOT NULL,

  -- 소스 정보
  source_url text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('blog', 'conference', 'paper')),
  source_language text DEFAULT 'ko' CHECK (source_language IN ('ko', 'en')),
  published_at timestamptz,

  -- 구조화된 콘텐츠 (JSON)
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- summary 구조: { background, challenge, solution, results, keyTakeaways[] }

  -- 분류
  domains text[] NOT NULL DEFAULT '{}',
  technologies text[] NOT NULL DEFAULT '{}',
  difficulty text NOT NULL DEFAULT 'B' CHECK (difficulty IN ('A', 'B', 'C')),

  -- 면접 질문 템플릿 (AI가 참고할 사전 정의 질문)
  seed_questions jsonb DEFAULT '[]'::jsonb,

  -- 메타데이터
  view_count integer DEFAULT 0,
  interview_count integer DEFAULT 0,
  is_published boolean DEFAULT true,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_case_studies_company ON case_studies(company_slug);
CREATE INDEX idx_case_studies_domains ON case_studies USING gin(domains);
CREATE INDEX idx_case_studies_technologies ON case_studies USING gin(technologies);
CREATE INDEX idx_case_studies_difficulty ON case_studies(difficulty);
CREATE INDEX idx_case_studies_source_type ON case_studies(source_type);

-- RLS
ALTER TABLE case_studies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read published case studies"
  ON case_studies FOR SELECT
  USING (is_published = true);
```

#### Supabase 테이블: `case_study_favorites`

```sql
CREATE TABLE case_study_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_study_id uuid NOT NULL REFERENCES case_studies(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, case_study_id)
);
```

#### interview_types 테이블 확장

```sql
INSERT INTO interview_types (code, name, display_name, description, icon, color, sort_order)
VALUES ('CASE_STUDY', '사례 기반 면접', '사례 기반', '실제 기업 기술 사례 기반 고난도 면접', 'BookOpen', 'orange', 4);
```

### 3.3 TypeScript 타입

```typescript
// src/types/case-study.ts

export interface CaseStudySummary {
  background: string;
  challenge: string;
  solution: string;
  results: string;
  keyTakeaways: string[];
}

export interface CaseStudy {
  id: string;
  title: string;
  slug: string;
  companyName: string;
  companyLogoUrl: string | null;
  companySlug: string;
  sourceUrl: string;
  sourceType: "blog" | "conference" | "paper";
  sourceLanguage: "ko" | "en";
  publishedAt: string | null;
  summary: CaseStudySummary;
  domains: string[];
  technologies: string[];
  difficulty: "A" | "B" | "C";
  seedQuestions: { content: string; hint: string; category: string }[];
  viewCount: number;
  interviewCount: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
}

export interface CaseStudyFilters {
  companies: string[];
  domains: string[];
  difficulty: string[];
  sourceType: string[];
  search: string;
  sort: "recent" | "popular" | "difficulty";
}
```

### 3.4 AI 프롬프트 확장

기존 `INTERVIEW_TYPE_PROMPTS`에 `CASE_STUDY` 타입 추가:

```typescript
// src/lib/claude.ts 확장
CASE_STUDY: `당신은 시니어/CTO급 기술 면접관입니다.
아래 실제 기업 사례를 기반으로 C레벨(고난도) 면접 질문을 생성하세요.

[케이스 스터디 컨텍스트]
기업: {company}
제목: {title}
배경: {summary.background}
도전과제: {summary.challenge}
해결방안: {summary.solution}
결과: {summary.results}

질문 생성 규칙:
1. 아키텍처 의사결정의 근거와 trade-off를 묻는 질문
2. 다른 접근법과의 비교를 요구하는 질문
3. 확장성/장애 대응 시나리오 질문
4. 유사한 문제를 다른 맥락에서 해결하는 질문
5. 기술 리더십/의사결정 관점의 질문

난이도: C레벨 (시니어/리드/CTO 대상)
- 단순 개념 질문 금지
- "왜", "어떻게", "다른 접근법은" 형태 필수
- 실무 경험 기반 답변 필요`;
```

### 3.5 파일 구조

```
src/
├── app/
│   └── case-studies/
│       ├── page.tsx                    # Server Component: 브라우징 페이지
│       ├── loading.tsx                 # Streaming 폴백
│       └── [slug]/
│           ├── page.tsx               # Server Component: 상세 + 학습 모드
│           └── interview/
│               └── page.tsx           # Client Component: 면접 세션
├── components/
│   └── case-studies/
│       ├── CaseStudyCard.tsx          # 케이스 스터디 카드
│       ├── CaseStudyGrid.tsx          # 카드 그리드 (Server Component)
│       ├── CaseStudyGridSkeleton.tsx  # 로딩 스켈레톤
│       ├── CaseStudyDetail.tsx        # 상세 뷰 (Accordion)
│       ├── CaseStudyInterview.tsx     # 스플릿 뷰 면접 세션
│       ├── FilterSidebar.tsx          # 데스크톱 필터 사이드바
│       ├── FilterChips.tsx            # 모바일 필터 칩
│       ├── CompanyBadge.tsx           # 기업 로고 + 이름 뱃지
│       ├── DomainBadge.tsx            # 기술 도메인 뱃지
│       └── DifficultyIndicator.tsx    # 난이도 표시기
├── types/
│   └── case-study.ts                  # TypeScript 타입
├── lib/
│   └── case-studies.ts                # API 함수 + 데이터 페칭
└── app/api/
    └── case-studies/
        ├── route.ts                   # GET: 목록 (필터/정렬/페이지네이션)
        └── [id]/
            ├── route.ts              # GET: 상세, PATCH: 조회수
            └── questions/
                └── route.ts          # POST: AI 질문 생성
```

---

## 4. Implementation Plan

### Phase 1: 기반 구축 (Setup)

| #   | 작업                                                                                                               | 파일                     | 난이도 |
| --- | ------------------------------------------------------------------------------------------------------------------ | ------------------------ | ------ |
| 1-1 | Shadcn 컴포넌트 설치 (tabs, accordion, command, resizable, select, tooltip, skeleton, toggle-group, dropdown-menu) | `src/components/ui/`     | 낮음   |
| 1-2 | `case_studies` + `case_study_favorites` 테이블 생성 (Supabase Migration)                                           | Supabase MCP             | 중간   |
| 1-3 | `interview_types`에 CASE_STUDY 타입 추가                                                                           | Supabase MCP             | 낮음   |
| 1-4 | TypeScript 타입 정의 (`src/types/case-study.ts`)                                                                   | 타입 파일                | 낮음   |
| 1-5 | `InterviewTypeCode`에 "CASE_STUDY" 추가                                                                            | `src/types/interview.ts` | 낮음   |
| 1-6 | 시드 데이터: 10-15개 케이스 스터디 입력                                                                            | Supabase MCP             | 중간   |

### Phase 2: 코어 기능 (Core)

| #    | 작업                                                      | 파일                                               | 난이도 |
| ---- | --------------------------------------------------------- | -------------------------------------------------- | ------ |
| 2-1  | API: GET /api/case-studies (필터/정렬/페이지네이션)       | `src/app/api/case-studies/route.ts`                | 중간   |
| 2-2  | API: GET /api/case-studies/[id] (상세 + 조회수)           | `src/app/api/case-studies/[id]/route.ts`           | 낮음   |
| 2-3  | API: POST /api/case-studies/[id]/questions (AI 질문 생성) | `src/app/api/case-studies/[id]/questions/route.ts` | 높음   |
| 2-4  | Claude 프롬프트 확장 (CASE_STUDY 타입)                    | `src/lib/claude.ts`                                | 중간   |
| 2-5  | lib: case-studies.ts (데이터 페칭 함수)                   | `src/lib/case-studies.ts`                          | 중간   |
| 2-6  | 케이스 스터디 카드 컴포넌트                               | `src/components/case-studies/CaseStudyCard.tsx`    | 중간   |
| 2-7  | 필터 사이드바 + 모바일 필터 칩                            | `src/components/case-studies/Filter*.tsx`          | 중간   |
| 2-8  | 브라우징 페이지 (Server Component + Suspense)             | `src/app/case-studies/page.tsx`                    | 중간   |
| 2-9  | 상세 페이지 (Accordion 기반 구조화 뷰)                    | `src/app/case-studies/[slug]/page.tsx`             | 중간   |
| 2-10 | 면접 세션 페이지 (스플릿 뷰 + 타이머)                     | `src/app/case-studies/[slug]/interview/page.tsx`   | 높음   |

### Phase 3: 폴리싱 (Polish)

| #   | 작업                                                  | 파일                                       | 난이도 |
| --- | ----------------------------------------------------- | ------------------------------------------ | ------ |
| 3-1 | 모바일 반응형 (탭 전환, 시트 필터)                    | 전체 컴포넌트                              | 중간   |
| 3-2 | 즐겨찾기 기능 (기존 패턴 재사용)                      | API + 컴포넌트                             | 낮음   |
| 3-3 | 네비게이션에 케이스 스터디 메뉴 추가                  | 레이아웃                                   | 낮음   |
| 3-4 | 홈페이지 InterviewTypeSelector에 CASE_STUDY 옵션 추가 | `src/components/InterviewTypeSelector.tsx` | 낮음   |
| 3-5 | 스켈레톤 로더 + 빈 상태 UI                            | 컴포넌트                                   | 낮음   |
| 3-6 | SEO 메타데이터 (각 케이스 스터디 페이지)              | 페이지 metadata                            | 낮음   |

---

## 5. Quality Gates

### 검증 체크리스트

- [ ] `npm run build` 성공
- [ ] `npx tsc --noEmit` 타입 에러 없음
- [ ] `npx eslint src/` 린트 통과
- [ ] 케이스 스터디 목록 페이지 LCP < 1.5s
- [ ] 면접 세션 페이지 TTI < 2.0s
- [ ] 모바일 반응형 정상 동작 (375px ~ 768px)
- [ ] AI 질문 생성 정상 동작 (케이스 스터디 컨텍스트 반영)
- [ ] 필터링/정렬 정상 동작
- [ ] 로컬스토리지 면접 진행 상태 자동 저장/복구

### Vercel React Best Practices 적용 규칙

| 규칙                           | 적용 위치                       | 우선순위 |
| ------------------------------ | ------------------------------- | -------- |
| `async-parallel`               | 케이스 목록 페이지 병렬 fetch   | CRITICAL |
| `async-suspense-boundaries`    | 목록/상세 페이지 Suspense       | CRITICAL |
| `bundle-dynamic-imports`       | 면접 세션 dynamic import        | CRITICAL |
| `bundle-barrel-imports`        | lucide-react, radix 아이콘      | CRITICAL |
| `server-serialization`         | Server→Client 최소 props        | HIGH     |
| `server-cache-react`           | React.cache()로 중복 fetch 방지 | HIGH     |
| `server-parallel-fetching`     | async Server Component 구성     | HIGH     |
| `rerender-functional-setstate` | 면접 세션 상태 관리             | MEDIUM   |
| `rerender-memo`                | 피드백 컴포넌트 메모이제이션    | MEDIUM   |
| `rerender-lazy-state-init`     | localStorage 초기화             | MEDIUM   |

---

## 6. Risks & Dependencies

| 리스크                               | 영향도 | 대응                                          |
| ------------------------------------ | ------ | --------------------------------------------- |
| 케이스 스터디 콘텐츠 수동 입력 부담  | 중간   | 초기 10-15개로 시작, AI 요약 생성 보조 활용   |
| AI 프롬프트 품질 (C레벨 난이도 유지) | 높음   | 프롬프트 엔지니어링 반복, seed_questions 활용 |
| 스플릿 뷰 모바일 UX                  | 중간   | 모바일은 탭 전환으로 대체                     |
| react-resizable-panels 번들 크기     | 낮음   | dynamic import로 면접 세션에서만 로드         |
| 기업 로고 저작권                     | 낮음   | 텍스트 기반 기업명 뱃지로 대체 가능           |

### Dependencies

- Shadcn 컴포넌트 추가 설치 필요 (Phase 1-1)
- `react-resizable-panels` 패키지 설치 필요
- Supabase 마이그레이션 (Phase 1-2)

---

## 7. Rollout & Monitoring

### 배포 전략

1. Phase 1-2 완료 후 `/case-studies` 경로로 배포
2. 홈페이지 InterviewTypeSelector에 "사례 기반" 옵션 추가
3. 네비게이션 메뉴에 링크 추가

### 성공 지표

- 케이스 스터디 페이지 방문 수
- 면접 세션 시작/완료 비율
- AI 피드백 점수 분포 (C레벨 난이도 적정성 검증)

---

## 8. Timeline & Milestones

| 마일스톤 | 내용                                   | 상태 |
| -------- | -------------------------------------- | ---- |
| M1       | Phase 1 완료 (기반 구축 + 시드 데이터) | 대기 |
| M2       | Phase 2 완료 (코어 기능)               | 대기 |
| M3       | Phase 3 완료 (폴리싱)                  | 대기 |

---

## 9. References

### 이슈 & 문서

- [#19 - 테크 블로그/컨퍼런스 기반 실제 사례 고난도 면접 기능](https://github.com/kwakseongjae/dev-interview/issues/19)
- [#7 - 면접 범주 시스템 구현](https://github.com/kwakseongjae/dev-interview/issues/7) (InterviewType 패턴 참고)

### 레퍼런스 소스 (초기 시드 데이터 후보)

**한국 기업 블로그 (우선)**:

- 토스: https://toss.tech/ (코어뱅킹 MSA, Gateway, 하이브리드 클라우드)
- 우아한형제들: https://techblog.woowahan.com/ (이벤트 아키텍처, 트래픽 대응)
- 당근: https://medium.com/daangn (Feature Store, 딥러닝 추천)
- 카카오: https://tech.kakao.com/ (분산 스토리지, 메시징)
- 네이버 D2: https://d2.naver.com/helloworld (검색 SRE, Kafka)

**글로벌 기업 블로그**:

- Discord: https://discord.com/category/engineering (Cassandra→ScyllaDB)
- Netflix: https://netflixtechblog.com/ (Chaos Engineering, 스트리밍)
- Stripe: https://stripe.com/blog/engineering (API 설계, 멱등성)
- Figma: https://www.figma.com/blog/engineering/ (CRDT 멀티플레이어)
- Uber: https://www.uber.com/blog/engineering/ (DOMA, Michelangelo)

**컨퍼런스**:

- SLASH (토스): https://toss.im/slash-24
- 우아콘: https://woowacon.com/
- DEVIEW (네이버): https://deview.kr/2023
- if(kakao): https://if.kakao.com/2025

### 기존 코드 패턴 참고

- `src/components/InterviewTypeSelector.tsx` - 타입 선택 UI 패턴
- `src/app/interview/page.tsx` - 면접 세션 플로우
- `src/lib/claude.ts` - AI 질문 생성 + 프롬프트 패턴
- `src/hooks/useTimer.ts` - 타이머 훅
- `src/components/feedback/` - 피드백 컴포넌트 패턴

---

## 10. 시드 데이터 (초기 10개 케이스 스터디)

| #   | 기업         | 제목                                | 소스   | 도메인               | 난이도 |
| --- | ------------ | ----------------------------------- | ------ | -------------------- | ------ |
| 1   | Toss         | 은행 최초 코어뱅킹 MSA 전환기       | 블로그 | MSA, 금융            | C      |
| 2   | Toss         | 레거시 인프라 → 하이브리드 클라우드 | 블로그 | 인프라, 클라우드     | C      |
| 3   | 우아한형제들 | 회원시스템 이벤트기반 아키텍처      | 블로그 | 이벤트 아키텍처, MSA | B      |
| 4   | 우아한형제들 | 빼빼로데이 대규모 트래픽 대응       | 블로그 | 트래픽, 스케일링     | B      |
| 5   | 당근         | 딥러닝 개인화 추천 시스템           | 블로그 | ML, 추천시스템       | C      |
| 6   | Discord      | Cassandra→ScyllaDB 마이그레이션     | 블로그 | DB, 마이그레이션     | C      |
| 7   | Netflix      | 6,500만 동시 스트림 처리            | 블로그 | 스트리밍, 스케일링   | C      |
| 8   | Stripe       | API 버저닝으로 하위호환성 유지      | 블로그 | API 설계             | B      |
| 9   | Figma        | CRDT 기반 실시간 멀티플레이어       | 블로그 | 실시간, CRDT         | C      |
| 10  | Slack        | 500만+ WebSocket 동시 세션          | 블로그 | 실시간, 메시징       | C      |

---

## Implementation Summary

**Completion Date**: 2026-02-06
**Implemented By**: Claude Opus 4.6

### Changes Made

#### New Files Created

- `src/types/case-study.ts` - CaseStudy, CaseStudyListItem, CaseStudyFilters 타입 정의
- `src/lib/case-studies.ts` - 서버사이드 데이터 패칭 (필터/정렬/페이지네이션/즐겨찾기)
- `src/app/api/case-studies/route.ts` - GET 목록 API (필터, 정렬, 페이지네이션)
- `src/app/api/case-studies/[slug]/route.ts` - GET 상세 + 조회수 증가
- `src/app/api/case-studies/[slug]/start/route.ts` - POST 면접 세션 생성 (CASE_STUDY 타입)
- `src/app/api/case-studies/[slug]/questions/route.ts` - POST AI 질문 생성
- `src/app/case-studies/page.tsx` - 브라우징 페이지 (커스텀 SortDropdown, 필터 패널, 카드 그리드)
- `src/app/case-studies/[slug]/page.tsx` - 상세 페이지 (요약 4섹션, 핵심 인사이트, 후킹 CTA)
- `src/app/case-studies/[slug]/interview/page.tsx` - 전용 면접 페이지 (split layout, 타이머, 자동저장)
- `src/components/CompanyLogo.tsx` - 기업 로고 이미지 컴포넌트
- `src/components/ui/` - Shadcn 컴포넌트 8개 (accordion, tabs, resizable, select, skeleton, toggle, toggle-group, tooltip, dropdown-menu, command)
- `public/companies/` - 기업 로고 이미지 12개

#### Files Modified

- `src/lib/api.ts` - `startCaseStudyInterviewApi`, `getCaseStudiesApi`, `getCaseStudyBySlugApi` 등 클라이언트 API 추가
- `src/lib/claude.ts` - CASE_STUDY AI 프롬프트 추가
- `src/types/interview.ts` - InterviewTypeCode에 "CASE_STUDY" 추가
- `src/components/InterviewTypeSelector.tsx` - CASE_STUDY 옵션 추가
- `src/app/page.tsx` - 홈페이지에 케이스 스터디 연결
- `src/app/api/interview-types/route.ts` - CASE_STUDY 타입 포함
- `package.json` / `package-lock.json` - Shadcn 의존성 추가
- `tailwind.config.ts` - 필요한 설정 추가

#### Database Changes (Supabase)

- `case_studies` 테이블 생성 (RLS + 인덱스)
- `case_study_favorites` 테이블 생성
- `interview_types`에 CASE_STUDY 레코드 추가
- 18개 케이스 스터디 시드 데이터 삽입 (12개 기업, 한국/글로벌)
- `published_at` 날짜 웹 리서치 기반 보정

### Key Implementation Details

- **면접 페이지 레이아웃**: ResizablePanelGroup → CSS flex 기반 split layout으로 변경 (react-resizable-panels v4.6.0 API 호환 이슈)
- **게시일 정렬**: `created_at` 대신 `published_at` 기준 최신순 정렬 (원문 게시일 기반)
- **CTA 패턴**: 상세 페이지에서 질문 내용 비노출, 후킹 CTA로 면접 페이지 유도
- **세션 복원**: localStorage 기반 자동저장(10초) + 재접속 시 세션 복원
- **커스텀 SortDropdown**: framer-motion 애니메이션, 외부 클릭 닫기, gold 하이라이트

### Quality Validation

- [x] Build: Success (`npm run build`)
- [x] Type Check: Passed (`npx tsc --noEmit`)
- [x] Lint: Passed (변경 파일 대상, `npx eslint src/case-studies/ src/api/case-studies/ ...`)
- [x] DB: 18개 케이스 스터디 정상 조회, published_at 정렬 확인

### Deviations from Plan

**Changed**:

- ResizablePanelGroup → CSS flex layout (v4.6.0 API 호환 이슈로 인한 변경)
- Server Component → Client Component 브라우징 페이지 (URL searchParams 필터 + 동적 로딩)
- 컴포넌트 분리 구조 간소화 (별도 CaseStudyCard, FilterSidebar 컴포넌트 대신 page.tsx 내 인라인)

**Added**:

- 커스텀 SortDropdown 컴포넌트 (native select 대체)
- 게시일(published_at) 표시 기능 (카드 + 상세 페이지)
- 웹 리서치 기반 게시일 보정

**Skipped** (P2/P3, follow-up):

- 학습 모드 / 면접 모드 토글 (FR-6)
- Cmd+K 커맨드 팔레트 검색 (FR-9)
- 관련 케이스 스터디 추천 (FR-10)
- SEO 메타데이터 (Phase 3-6)

### Follow-up Tasks

- [ ] 학습 모드 토글 추가 (FR-6)
- [ ] 케이스 스터디 SEO 메타데이터 추가
- [ ] 원문 URL이 정확하지 않은 6건의 케이스 스터디 원문 검증/교체
- [ ] 추가 케이스 스터디 데이터 확보 (목표 30개+)

### Notes

- 기존 면접 세션/아카이브 시스템 100% 재활용 (submitAnswerApi, completeSessionApi, /complete, /archive)
- Discord, Figma 중복 케이스 스터디 제거 (20→18개)
- 일부 케이스 스터디(카카오, 네이버, LINE, 쿠팡, Netflix 카오스, 당근 채팅)는 정확한 원문 매칭이 아닌 가장 가까운 레퍼런스 기반
