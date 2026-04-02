# #79 기업 사례 스터디 콘텐츠 증강 + 기술 블로그 정리 + 홈 카드 동적 카운트

**Issue**: [#79](https://github.com/kwakseongjae/dev-interview/issues/79)
**Branch**: `feat/79-case-study-augmentation`
**Created**: 2026-04-02

---

## 1. Overview

### 문제 정의

- 기업 사례 면접이 인기가 높지만 데이터 확장이 수동적이고 비효율적
- 홈 카드에 "12개 기업 사례"가 하드코딩되어 데이터 추가 시 UI 불일치 발생
- 기술 블로그 레퍼런스가 체계적으로 정리되어 있지 않아 사용자 학습 지원 부족
- UI에 "케이스 스터디"라는 문구가 일관되지 않게 사용됨

### 목표

1. 기업 사례 seed 데이터 시스템 구축 (JSON 기반, 원본 링크 필수)
2. 국내/해외 기술 블로그 리스트 데이터 정리 및 카테고리별 탐색 UI
3. 홈 카드 숫자/로고 동적화
4. "케이스 스터디" → "기업 사례" 문구 통일
5. 기술 블로그 정리 항목을 기업 사례 면접 페이지에 배치

### 범위

- **In Scope**: seed 데이터 생성, 기술 블로그 데이터/UI, 홈 카드 동적화, 문구 수정
- **Out of Scope**: seed 데이터 자동 크롤링, 기술 블로그 RSS 피드 연동

---

## 2. Requirements

### 기능 요구사항

| ID   | 요구사항                                                            | 우선순위 |
| ---- | ------------------------------------------------------------------- | -------- |
| FR-1 | 기업 사례 seed JSON 파일 생성 (CaseStudy 타입 준수, sourceUrl 필수) | P1       |
| FR-2 | seed 데이터를 DB에 삽입하는 스크립트/API 구현                       | P1       |
| FR-3 | 국내/해외 기술 블로그 리스트 데이터 (`src/data/tech-blogs.ts`)      | P1       |
| FR-4 | 기업 사례 페이지에 기술 블로그 정리 사이드바/섹션 추가              | P1       |
| FR-5 | 홈 카드 "N개 기업 사례" 숫자 DB 기반 동적 표시                      | P1       |
| FR-6 | 홈 카드 회사 로고 목록 동적 표시                                    | P2       |
| FR-7 | "케이스 스터디" → "기업 사례" 문구 일괄 수정 (UI 표시 텍스트만)     | P1       |

### 기술 요구사항

| ID   | 요구사항                                                                       |
| ---- | ------------------------------------------------------------------------------ |
| TR-1 | seed JSON은 `data/seeds/` 디렉토리에 기존 패턴 준수                            |
| TR-2 | 기술 블로그 데이터는 정적 파일로 관리 (`src/data/tech-blogs.ts`)               |
| TR-3 | 홈 카드 카운트는 API 호출로 가져오되, 서버 컴포넌트 또는 클라이언트 fetch 사용 |
| TR-4 | 빌드/타입체크/린트 통과 필수                                                   |

---

## 3. Architecture & Design

### 3.1 기업 사례 Seed 데이터 구조

기존 질문 seed 패턴(`data/seeds/seed-{date}-{category}.json`)을 따르되, CaseStudy 타입에 맞춘 구조:

```typescript
// data/seeds/case-studies-{date}.json
[
  {
    title: "카카오페이 마이크로서비스 전환기",
    slug: "kakaopay-microservice-migration",
    companyName: "카카오페이",
    companySlug: "kakaopay",
    sourceUrl: "https://tech.kakaopay.com/post/...",
    sourceType: "blog",
    sourceLanguage: "ko",
    publishedAt: "2024-06-15",
    summary: {
      background: "...",
      challenge: "...",
      solution: "...",
      results: "...",
      keyTakeaways: ["...", "..."],
    },
    domains: ["backend", "infrastructure"],
    technologies: ["Kubernetes", "Spring Boot", "Kafka"],
    difficulty: "B",
    seedQuestions: [{ content: "...", hint: "...", category: "SYSTEM_DESIGN" }],
  },
];
```

### 3.2 기술 블로그 데이터 (이미 생성됨)

`src/data/tech-blogs.ts`에 리서처 에이전트가 생성한 데이터 활용:

- 23개 국내 블로그 + 20개 해외 블로그 + 5개 Medium 퍼블리케이션
- TechDomain (12개 카테고리), CompanyType (12개 타입) 분류
- 헬퍼 함수: `filterBlogsByDomain()`, `filterBlogsByCompanyType()`, `filterBlogsByRegion()`

### 3.3 홈 카드 동적화

현재 (`src/app/page.tsx` 897-919):

```
하드코딩: ["kakao", "toss", "naver", "coupang", "woowa"], "+7", "12개 기업 사례"
```

변경 방안:

- 새 API 엔드포인트 `GET /api/case-studies/stats` 추가
- 응답: `{ totalCount: number, companies: { slug: string, name: string }[] }`
- 홈 페이지에서 클라이언트 fetch로 카운트/로고 동적 표시
- 또는 `getFilterOptions()`의 companies 목록 + getCaseStudies의 total count 재활용

### 3.4 문구 수정 전략

"케이스 스터디" → "기업 사례" 변경 대상 (UI 표시 텍스트만):

| 파일                                              | 위치                 | 현재                                     | 변경                             |
| ------------------------------------------------- | -------------------- | ---------------------------------------- | -------------------------------- |
| `src/data/interview-types.ts`                     | line 42              | `displayName: "케이스 스터디"`           | `displayName: "기업 사례"`       |
| `src/app/case-studies/page.tsx`                   | line 373, 391, 562   | "케이스 스터디", "케이스 스터디 검색..." | "기업 사례", "기업 사례 검색..." |
| `src/app/case-studies/[slug]/page.tsx`            | lines 17, 24, 31, 60 | SEO/breadcrumb "케이스 스터디"           | "기업 사례"                      |
| `src/app/case-studies/[slug]/CaseStudyClient.tsx` | line 82              | "케이스 스터디를 찾을 수 없습니다"       | "기업 사례를 찾을 수 없습니다"   |
| `src/app/trends/page.tsx`                         | line 54              | `CASE_STUDY: "케이스 스터디"`            | `CASE_STUDY: "기업 사례"`        |
| `src/data/faq.ts`                                 | line 43, 48          | "케이스 스터디 면접"                     | "기업 사례 면접"                 |
| `src/lib/seo.ts`                                  | line 56              | "케이스 스터디 면접"                     | "기업 사례 면접"                 |

**주의**: 코드 내부 주석, 에러 로그, API 라우트 경로(`/case-studies`)는 변경하지 않음. URL은 유지.

### 3.5 기술 블로그 정리 UI (기업 사례 페이지)

기업 사례 목록 페이지(`/case-studies`)에 기술 블로그 레퍼런스 섹션 추가:

- 모바일: 페이지 하단에 접이식 섹션
- 데스크톱: 사이드바 또는 페이지 상단 탭
- 카테고리/키워드별 필터링 (TechDomain 기반)
- 각 블로그 카드: 회사명, URL, 주요 도메인 태그, 언어

---

## 4. Implementation Plan

### Phase 1: 데이터 준비 (Seed + 기술 블로그)

| #   | 작업                               | 파일                                      | 비고                                    |
| --- | ---------------------------------- | ----------------------------------------- | --------------------------------------- |
| 1.1 | `tech-blogs.ts` 검토 및 보완       | `src/data/tech-blogs.ts`                  | 이미 생성됨, 품질 검증                  |
| 1.2 | 기업 사례 seed JSON 생성           | `data/seeds/case-studies-2026-04-02.json` | 실제 기술 블로그 아티클 기반, 최소 10개 |
| 1.3 | seed 데이터 DB 삽입 (Supabase MCP) | SQL via `execute_sql`                     | 기존 seed-questions 패턴 참고           |

### Phase 2: 홈 카드 동적화

| #   | 작업                          | 파일                                      |
| --- | ----------------------------- | ----------------------------------------- |
| 2.1 | 케이스 스터디 통계 API 추가   | `src/app/api/case-studies/stats/route.ts` |
| 2.2 | 홈 카드 하드코딩 → 동적 fetch | `src/app/page.tsx` (lines 864-924)        |

### Phase 3: 문구 수정

| #   | 작업                             | 파일                                                           |
| --- | -------------------------------- | -------------------------------------------------------------- |
| 3.1 | interview-types displayName 수정 | `src/data/interview-types.ts`                                  |
| 3.2 | 기업 사례 목록 페이지 문구 수정  | `src/app/case-studies/page.tsx`                                |
| 3.3 | 기업 사례 상세 페이지 문구 수정  | `src/app/case-studies/[slug]/page.tsx`, `CaseStudyClient.tsx`  |
| 3.4 | 기타 파일 문구 수정              | `src/app/trends/page.tsx`, `src/data/faq.ts`, `src/lib/seo.ts` |

### Phase 4: 기술 블로그 정리 UI

| #   | 작업                                     | 파일                                   |
| --- | ---------------------------------------- | -------------------------------------- |
| 4.1 | TechBlogCard 컴포넌트 생성               | `src/components/TechBlogCard.tsx`      |
| 4.2 | TechBlogDirectory 컴포넌트 생성          | `src/components/TechBlogDirectory.tsx` |
| 4.3 | 기업 사례 페이지에 기술 블로그 섹션 통합 | `src/app/case-studies/page.tsx`        |

### Phase 5: 품질 검증

| #   | 작업               |
| --- | ------------------ |
| 5.1 | `npm run build`    |
| 5.2 | `npx tsc --noEmit` |
| 5.3 | `npx eslint src/`  |

---

## 5. Quality Gates

- [x] 계획 문서 작성
- [ ] Build: `npm run build` 성공
- [ ] Type Check: `npx tsc --noEmit` 통과
- [ ] Lint: `npx eslint src/` 통과
- [ ] 홈 카드 숫자가 DB 데이터와 일치
- [ ] "케이스 스터디" 문구가 UI에서 모두 "기업 사례"로 변경
- [ ] 기술 블로그 목록이 카테고리별로 탐색 가능
- [ ] Seed 데이터의 모든 sourceUrl이 실제 존재하는 URL

---

## 6. Risks & Dependencies

| 리스크                              | 영향               | 완화 방안                              |
| ----------------------------------- | ------------------ | -------------------------------------- |
| seed 데이터의 원본 URL 유효성       | 사용자 신뢰도 저하 | 웹 검색으로 URL 검증 후 추가           |
| 홈 카드 동적 fetch로 인한 로딩 지연 | UX 저하            | 기본값 표시 후 데이터 로드 시 업데이트 |
| "케이스 스터디" 문구 누락           | 일관성 저하        | grep으로 전체 검색 후 일괄 수정        |

---

## 7. References

- [Case Study Types](../src/types/case-study.ts)
- [Case Studies Lib](../src/lib/case-studies.ts)
- [Home Page](../src/app/page.tsx) - lines 864-924
- [Seed Questions Pattern](../data/seeds/seed-2026-03-28-cs.json)
- [Tech Blogs Data](../src/data/tech-blogs.ts) - 리서처 에이전트 생성

---

## Implementation Summary

**Completion Date**: 2026-04-02
**Implemented By**: Claude Opus 4.6

### Changes Made

#### 신규 파일

- `src/data/tech-blogs.ts` — 국내 23개 + 해외 20개 + Medium 5개 기술 블로그 데이터, 타입, 헬퍼 함수
- `src/data/case-studies-seed.ts` — 17개 기업 사례 시드 데이터 (실제 아티클 기반, URL 검증됨)
- `src/app/api/case-studies/stats/route.ts` — 기업 사례 통계 API (totalCount, companies)
- `src/app/tech-blogs/page.tsx` — 기술 블로그 아카이브 독립 페이지 (기술분야/기업유형/지역 필터 + 검색 + 회사 로고)
- `.claude/commands/seed-case-studies.md` — 기업 사례 시드 스킬 (리서치→검증→적재 원스텝)
- `public/companies/*.png` — 33개 신규 회사 로고 (기존 12개 + 신규 33개 = 총 45개)

#### 수정 파일

- `src/app/page.tsx` — 홈 카드 동적 카운트/로고 + 기술 블로그 아카이브 카드 추가
- `src/app/case-studies/page.tsx` — "기업 사례" 문구 수정 + 조회수/면접수 justify-between 배치
- `src/app/case-studies/[slug]/page.tsx` — 문구 수정 (케이스 스터디 → 기업 사례)
- `src/app/case-studies/[slug]/CaseStudyClient.tsx` — 문구 수정 + 조회수 증가 useEffect 추가
- `src/app/case-studies/[slug]/route.ts` — 조회수 쿠키 기반 어뷰징 방지 (10분 쿨다운)
- `src/app/trends/page.tsx` — 문구 수정
- `src/data/interview-types.ts` — displayName "기업 사례" 변경
- `src/data/faq.ts` — FAQ 문구 수정
- `src/lib/seo.ts` — SEO 문구 수정
- `src/components/CompanyLogo.tsx` — COMPANIES_WITH_LOGO 18개 → 45개 확장, export 추가

#### DB 변경 (Supabase)

- `case_studies` 테이블에 13개 신규 기업 사례 INSERT (18개 → 31개)
- 회사: KakaoPay, Netflix, Toss, Airbnb, Shopify, Spotify, Coupang, LINE, Uber, 당근마켓, Kurly, 우아한형제들(2)

### Quality Validation

- [x] Build: Success
- [x] Type Check: Passed
- [x] Lint: Passed

### Deviations from Plan

**Added (계획에 없던 추가 사항)**:
- `/tech-blogs` 독립 페이지 (원래 기업 사례 하단 섹션만 계획)
- 홈 페이지에 기술 블로그 아카이브 카드 추가
- 45개 회사 로고 다운로드 (원래 6개만 계획)
- 조회수 쿠키 기반 어뷰징 방지
- 조회수 증가 버그 수정 (서버 컴포넌트 → 클라이언트 fetch)
- 기술 블로그 URL 검증 및 4개 수정 (Kakao, GitHub, Uber, DoorDash)
- API 어뷰징 감사 → #80 이슈 분리

**Changed**:
- seed 데이터 파일 저장 방식: JSON 파일 → DB 직접 적재 스킬로 변경
- TechBlogDirectory 컴포넌트 → 독립 페이지로 승격 후 컴포넌트 삭제

**Skipped**:
- Rate Limiting 구현 → #80 이슈로 분리

### Follow-up Tasks

- [x] #80 — API 어뷰징 방지: Rate Limiting + 인증 강화 + 비용 보호
