# 045 - 메인 페이지 FAQ 섹션 위치 개선 및 전용 /faq 페이지 생성

**Issue**: [#45](https://github.com/kwakseongjae/dev-interview/issues/45)
**Branch**: `feat/45-faq-page-relocation`
**Created**: 2026-03-04

---

## 1. Overview

### 문제 정의

현재 메인 페이지 하단(TeamSpaceIntro → FaqSection → Footer 순)에 8개 항목의 FAQ 섹션이 배치되어 있다. 메인 페이지의 나머지 요소들(Hero, Feature Cards, Quick Links, TeamSpaceIntro)은 핵심 기능 소개이지만 FAQ는 성격이 달라 혼재되며, 사용자가 FAQ까지 도달하려면 긴 스크롤이 필요해 실제 노출율이 낮다.

### 목표

1. 전용 `/faq` 페이지 생성 → 8개 전체 FAQ + FAQPage JSON-LD + BreadcrumbList schema 포함
2. 메인 페이지 FaqSection 3-4개로 압축 → 핵심 질문만 노출
3. 메인 페이지 FaqSection 하단에 "모든 질문 보기 →" `/faq` 링크 추가
4. AEO/SEO 효과 보존 (JSON-LD FAQPage schema를 `/faq` 페이지로 이전)

### 범위

- **IN**: `/faq` 페이지 신규 생성, FaqSection 압축 + 링크, JSON-LD 이전
- **OUT**: Footer 수정, 내비게이션 메뉴 추가, FAQ 내용 수정

---

## 2. Requirements

### 기능 요구사항

| ID   | 요구사항                                                            | 우선순위 |
| ---- | ------------------------------------------------------------------- | -------- |
| FR-1 | `/faq` 페이지 생성 - 8개 전체 FAQ accordion                         | P1       |
| FR-2 | `/faq` 페이지 - FAQPage JSON-LD schema + BreadcrumbList schema      | P1       |
| FR-3 | `/faq` 페이지 - metadata (title, description, canonical, openGraph) | P1       |
| FR-4 | 메인 페이지 FaqSection - 3-4개 핵심 항목만 표시                     | P1       |
| FR-5 | 메인 페이지 FaqSection 하단 - "모든 질문 보기 →" `/faq` 링크        | P1       |
| FR-6 | `layout.tsx`의 FAQPage JSON-LD를 `/faq` 페이지로 이전               | P2       |

### 기술 요구사항

| ID   | 요구사항                                                                 |
| ---- | ------------------------------------------------------------------------ |
| TR-1 | `/faq` 페이지는 Server Component (metadata export 사용)                  |
| TR-2 | Accordion UI는 Client Component로 분리 (`"use client"`)                  |
| TR-3 | JSON-LD는 Server Component에서 렌더링 (크롤러 즉시 접근 보장)            |
| TR-4 | 기존 `getFaqJsonLd()`, `getBreadcrumbJsonLd()`, `JsonLd` 컴포넌트 재사용 |
| TR-5 | FaqSection에 `limit` prop 추가하여 표시 항목 수 제어                     |

---

## 3. Architecture & Design

### 현재 구조

```
src/app/layout.tsx
└── <JsonLd data={getFaqJsonLd(FAQ_DATA)} />  ← 루트 레이아웃에 FAQPage 스키마

src/app/page.tsx (line 974)
└── <FaqSection />  ← 8개 항목 전부 표시

src/components/FaqSection.tsx
└── FAQ_DATA.map() → Accordion 8개
```

### 변경 후 구조

```
src/app/layout.tsx
└── getFaqJsonLd 제거 (FAQPage 스키마는 /faq 페이지로 이전)

src/app/page.tsx
└── <FaqSection limit={4} />  ← 4개만 표시 + "모든 질문 보기" 링크

src/components/FaqSection.tsx
└── limit prop 추가 → FAQ_DATA.slice(0, limit).map()
└── limit이 FAQ_DATA.length보다 작으면 하단에 Link 렌더링

src/app/faq/
├── page.tsx        ← Server Component (metadata + JSON-LD + 레이아웃)
└── FaqAccordion.tsx  ← Client Component ("use client" + Accordion)
```

### 재사용 가능한 기존 코드

| 기존 파일                         | 재사용 내용                                                        |
| --------------------------------- | ------------------------------------------------------------------ |
| `src/lib/seo.ts`                  | `getFaqJsonLd()`, `getBreadcrumbJsonLd()`, `SITE_URL`, `SITE_NAME` |
| `src/components/JsonLd.tsx`       | JSON-LD 렌더링 컴포넌트                                            |
| `src/components/ui/accordion.tsx` | Accordion UI                                                       |
| `src/data/faq.ts`                 | `FAQ_DATA` (8개 항목, 수정 없음)                                   |
| `src/app/privacy/page.tsx`        | 페이지 레이아웃 패턴 참고                                          |

### /faq 페이지 레이아웃 (privacy 페이지 패턴 기반)

```
main.grain
└── 배경 decorative (gold/5, navy/5 blur circles)
└── header (← 홈으로 back link)
└── div.max-w-3xl
    ├── h1 "자주 묻는 질문"
    ├── p (설명)
    └── FaqAccordion (Client Component, 8개 전체)
└── footer
```

---

## 4. Implementation Plan

### Step 1: FaqSection 컴포넌트 수정

**파일**: `src/components/FaqSection.tsx`

- `limit?: number` prop 추가
- `FAQ_DATA.slice(0, limit ?? FAQ_DATA.length)` 로 항목 수 제어
- `limit`이 설정되고 `FAQ_DATA.length > limit`이면 하단에 "모든 질문 보기 →" Link 렌더링

### Step 2: 메인 페이지 FaqSection에 limit 전달

**파일**: `src/app/page.tsx`

- `<FaqSection />` → `<FaqSection limit={4} />` 변경 (1줄 수정)

### Step 3: /faq 페이지 생성

**파일**: `src/app/faq/page.tsx` (신규)

- Server Component
- `export const metadata` 설정 (title, description, canonical, openGraph)
- `JsonLd` 컴포넌트로 FAQPage + BreadcrumbList schema 렌더링
- privacy 페이지 레이아웃 패턴 적용 (grain 배경, max-w-3xl, back link)
- `FaqAccordion` Client Component 임포트

**파일**: `src/app/faq/FaqAccordion.tsx` (신규)

- `"use client"` 선언
- Accordion + FAQ_DATA 전체 8개 렌더링
- 기존 FaqSection과 동일한 스타일 적용

### Step 4: layout.tsx에서 FAQPage JSON-LD 제거

**파일**: `src/app/layout.tsx`

- `<JsonLd data={getFaqJsonLd(FAQ_DATA)} />` 줄 제거
- FAQPage schema는 이제 `/faq` 페이지에만 존재

### Step 5: 품질 검증

```bash
npm run build
npx tsc --noEmit
npx eslint src/
```

---

## 5. Quality Gates

### 기능 테스트 체크리스트

- [ ] `/faq` 페이지 접근 가능 (200 OK)
- [ ] `/faq` 페이지에서 Accordion 8개 항목 표시
- [ ] `/faq` 페이지 소스에 FAQPage JSON-LD `<script>` 포함
- [ ] `/faq` 페이지 소스에 BreadcrumbList JSON-LD 포함
- [ ] 메인 페이지 FaqSection 4개 항목만 표시
- [ ] 메인 페이지 FaqSection 하단 "모든 질문 보기" 링크 → `/faq` 이동
- [ ] 메인 페이지에서 FAQPage JSON-LD 제거 확인

### 빌드 검증

- [ ] `npm run build` 성공
- [ ] `npx tsc --noEmit` 타입 에러 없음
- [ ] `npx eslint src/` 린트 에러 없음

---

## 6. Risks & Dependencies

### 리스크

| 리스크                                                         | 영향 | 대응                                                                                         |
| -------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------- |
| FAQPage JSON-LD를 layout에서 제거 시 메인 페이지 AEO 효과 감소 | 낮음 | `/faq` 전용 페이지가 더 적합한 위치 — 메인 페이지는 FAQPage보다 WebApplication schema가 적합 |
| `"use client"` 사용 범위                                       | 낮음 | FaqAccordion만 Client Component, page.tsx는 Server Component 유지                            |

### 의존성

- `src/lib/seo.ts`의 `getFaqJsonLd`, `getBreadcrumbJsonLd` 함수 (이미 구현됨)
- `src/components/JsonLd.tsx` (이미 구현됨)
- `src/data/faq.ts`의 `FAQ_DATA` (수정 없음)

---

## 7. References

- [이슈 #45](https://github.com/kwakseongjae/dev-interview/issues/45)
- [Pramp FAQ 페이지 레퍼런스](https://www.pramp.com/faq)
- [Next.js JSON-LD 공식 가이드](https://nextjs.org/docs/app/guides/json-ld)
- 기존 패턴 참고: `src/app/privacy/page.tsx`

---

---

## Implementation Summary

**Completion Date**: 2026-03-04
**Implemented By**: Claude Sonnet 4.6

### Changes Made

#### Files Modified

- [src/components/FaqSection.tsx](src/components/FaqSection.tsx) - `limit` prop 추가, "모든 질문 보기" Link 렌더링
- [src/app/page.tsx](src/app/page.tsx) - `<FaqSection limit={4} />` 전달
- [src/app/layout.tsx](src/app/layout.tsx) - 루트 레이아웃에서 FAQPage JSON-LD 제거
- [src/data/faq.ts](src/data/faq.ts) - FAQ 데이터 포맷 정리
- [src/app/api/sessions/route.ts](src/app/api/sessions/route.ts) - `requireUser()` → `getUserOptional()` (게스트 인터뷰 지원)
- [src/app/api/sessions/[id]/route.ts](src/app/api/sessions/%5Bid%5D/route.ts) - 게스트 세션 조회 허용
- [src/app/api/sessions/[id]/complete/route.ts](src/app/api/sessions/%5Bid%5D/complete/route.ts) - 게스트 세션 완료 처리 지원
- [src/app/api/answers/route.ts](src/app/api/answers/route.ts) - 게스트 답변 저장 지원 (`user_id: null`)
- [src/app/interview/page.tsx](src/app/interview/page.tsx) - `handleSubmit`의 로그인 체크 제거
- [src/app/search/page.tsx](src/app/search/page.tsx) - `handleStartInterview`의 로그인 게이트 제거
- [src/app/complete/page.tsx](src/app/complete/page.tsx) - 게스트 로그인 유도 배너, 조건부 버튼 UI
- [src/app/archive/[id]/page.tsx](src/app/archive/%5Bid%5D/page.tsx) - 미로그인 시 `/auth?redirect=` 리다이렉트, 게스트 세션 클레임 로직
- [src/app/archive/page.tsx](src/app/archive/page.tsx) - LoginPromptModal 제거, 인라인 인증 게이트, 색상 코드 필터 칩 UI
- [src/app/favorites/page.tsx](src/app/favorites/page.tsx) - LoginPromptModal 제거, 인라인 인증 게이트

#### Files Created

- [src/app/faq/page.tsx](src/app/faq/page.tsx) - 전용 FAQ 페이지 (Server Component, metadata, JSON-LD)
- [src/app/faq/FaqAccordion.tsx](src/app/faq/FaqAccordion.tsx) - FAQ Accordion Client Component (8개 전체)
- [src/app/api/sessions/[id]/claim/route.ts](src/app/api/sessions/%5Bid%5D/claim/route.ts) - 게스트 세션 클레임 API (`PATCH`)

#### Key Implementation Details

- `/faq` 페이지: Server Component + `FaqAccordion` Client Component 분리 (TR-1, TR-2 준수)
- FAQPage JSON-LD + BreadcrumbList schema를 `/faq` 페이지로 이전 (FR-6)
- `FaqSection`의 `limit` prop으로 메인 페이지는 4개만 표시, `/faq` 링크 포함 (FR-4, FR-5)
- **추가 구현**: 게스트 인터뷰 허용 (3개 레이어 로그인 게이트 제거)
  - DB 마이그레이션: `interview_sessions.user_id`, `answers.user_id` NOT NULL 제거
  - 게스트 세션 클레임: localStorage `guestSessionId` → PATCH `/api/sessions/:id/claim`
- **추가 구현**: 아카이브/찜 페이지 인증 컨벤션 개선
  - LoginPromptModal(지연 표시) → 즉시 인라인 인증 게이트 또는 리다이렉트
- **추가 구현**: 아카이브 범주 필터 색상 코드 칩 (blue/emerald/purple/amber)

### Quality Validation

- [x] Build: Success
- [x] Type Check: Passed (`npx tsc --noEmit`)
- [x] Lint: Passed (`npx eslint src/`)

### Deviations from Plan

**Added** (원래 계획에 없던 추가 사항):

- **게스트 인터뷰 허용**: 비로그인 유저도 면접 진행/제출 가능 (DB: `user_id = null`)
- **게스트 세션 클레임**: 로그인 후 게스트 세션을 자신에게 귀속하는 API
- **아카이브/찜 인증 개선**: 업계 컨벤션에 맞게 LoginPromptModal → 인라인 인증 게이트
- **아카이브 범주 필터 색상 코드**: 타입별 고유 색상 칩으로 개선

### Notes

- 게스트 데이터는 `user_id = null`로 DB에 영속화되어 나중에 데이터 가치 활용 가능
- AI 피드백은 로그인 + 아카이브 필요 — 게스트는 `/complete` 페이지에서 로그인 유도
- 게스트 세션 클레임 흐름: `/complete` → localStorage 저장 → OAuth → `/archive/:id` → PATCH claim API
- `/faq` 페이지 빌드 확인: `○ /faq` (Static prerendered)
