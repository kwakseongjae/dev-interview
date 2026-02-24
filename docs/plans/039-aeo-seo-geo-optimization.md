# 039 - AEO/SEO/GEO 최적화 - AI 검색엔진 및 LLM 추천 노출 강화

**Issue**: [#39](https://github.com/kwakseongjae/dev-interview/issues/39)
**Branch**: `feat/39-aeo-seo-geo-optimization`
**Created**: 2026-02-24

---

## 1. Overview

### 문제 정의

현재 mochabun 사이트는 기본 SEO(메타태그, robots.ts, sitemap.ts)만 설정되어 있고, AI 검색엔진(ChatGPT, Claude, Gemini, Grok, Perplexity)에서 추천되기 위한 최적화가 전무함.

2026년 현재 Google 검색의 69%가 zero-click, 전통적 검색 볼륨 25% 감소 전망. SEO + AEO + GEO 통합 최적화 필수.

### 목표

1. **SEO 강화**: JSON-LD 구조화 데이터, 동적 메타데이터, 사이트맵 확장
2. **AEO 구현**: FAQ 스키마, 즉답형 콘텐츠(첫 50-100자 내 완전한 답변), Featured Snippets 최적화
3. **GEO 구현**: llms.txt, AI 크롤러 허용, E-E-A-T 시그널 강화, 자기완결적 콘텐츠 구조
4. **LLMEO 대응**: AI 플랫폼별(ChatGPT/Claude/Perplexity/Gemini) 콘텐츠 구조 최적화

### 핵심 데이터 (근거)

- AI 검색에서 인용된 콘텐츠의 **85%가 Google 상위 10위 밖** → 구조화 데이터가 핵심
- FAQPage schema가 있는 페이지의 **AI Overviews 노출 확률 3.2배** 높음
- AI 검색 트래픽의 **전환율이 일반 오가닉 대비 4.4배** 높음
- 구조화 데이터 구현 웹사이트는 전체의 **12.4%** → 조기 채택 경쟁우위

### 범위

- **IN**: JSON-LD, llms.txt, 동적 메타데이터, 사이트맵 확장, robots.ts AI 크롤러 허용, FAQ 콘텐츠(즉답형+AEO 구조), Twitter 카드, E-E-A-T 시그널
- **OUT**: og:image 동적 생성 (ImageResponse), 다국어(i18n), 외부 백링크 구축, AI 브랜드 모니터링 대시보드

---

## 2. Requirements

### 기능 요구사항

| ID    | 요구사항                                                             | 우선순위 |
| ----- | -------------------------------------------------------------------- | -------- |
| FR-1  | JSON-LD 구조화 데이터: Organization + WebApplication (루트 레이아웃) | P1       |
| FR-2  | JSON-LD: FAQPage 스키마 (홈페이지 FAQ 섹션)                          | P1       |
| FR-3  | JSON-LD: BreadcrumbList 스키마 (주요 페이지)                         | P2       |
| FR-4  | llms.txt + llms-full.txt 파일 생성 (public/)                         | P1       |
| FR-5  | robots.ts에 AI 크롤러 명시적 허용 (6종)                              | P1       |
| FR-6  | 동적 메타데이터: case-studies/[slug] generateMetadata                | P1       |
| FR-7  | 동적 사이트맵: case-studies 슬러그, trends 토픽 포함                 | P1       |
| FR-8  | Twitter/X 카드 메타데이터 추가 (루트 레이아웃)                       | P2       |
| FR-9  | 각 페이지별 canonical URL 설정                                       | P2       |
| FR-10 | 홈페이지 FAQ 섹션 UI (즉답형 AEO 구조 + Accordion)                   | P1       |
| FR-11 | FAQ 콘텐츠: LLMEO 최적화 (단정적/명료, 데이터 기반, E-E-A-T 반영)    | P1       |

### 기술 요구사항

| ID   | 요구사항                                                                                 |
| ---- | ---------------------------------------------------------------------------------------- |
| TR-1 | JSON-LD는 `<script type="application/ld+json">` + XSS 방지 (`.replace(/</g, '\\u003c')`) |
| TR-2 | `schema-dts` 패키지로 TypeScript 타입 지원                                               |
| TR-3 | Next.js App Router의 `generateMetadata()` 패턴 사용                                      |
| TR-4 | 빌드 타임 에러 없음 (`npm run build` 통과)                                               |
| TR-5 | llms.txt는 UTF-8 인코딩, Markdown 형식                                                   |

---

## 3. Architecture & Design

### 3.1 JSON-LD 구조화 데이터

**배치 전략**: 루트 레이아웃에 공통 스키마, 페이지별 추가 스키마

```
src/app/layout.tsx
  └─ Organization + WebApplication JSON-LD (모든 페이지)

src/app/page.tsx (또는 홈 서버 래퍼)
  └─ FAQPage JSON-LD

src/app/case-studies/[slug]/
  └─ layout.tsx (서버 컴포넌트) → Article + BreadcrumbList JSON-LD

src/app/trends/layout.tsx
  └─ WebPage JSON-LD
```

**스키마 타입별 구현**:

1. **Organization** (루트 레이아웃):

```typescript
{
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: '모카번',
  alternateName: 'mochabun',
  url: 'https://mochabun.co.kr',
  logo: 'https://mochabun.co.kr/assets/images/logo.png',
  description: 'AI 기반 개발자 기술면접 준비 서비스',
}
```

2. **WebApplication** (루트 레이아웃):

```typescript
{
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: '모카번',
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Web Browser',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
  featureList: [...],
  inLanguage: 'ko',
}
```

3. **FAQPage** (홈페이지):

```typescript
{
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: '...', acceptedAnswer: { '@type': 'Answer', text: '...' } },
    // 5-8개 FAQ
  ],
}
```

4. **BreadcrumbList** (케이스 스터디 상세):

```typescript
{
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { position: 1, name: '홈', item: 'https://mochabun.co.kr' },
    { position: 2, name: '케이스 스터디', item: 'https://mochabun.co.kr/case-studies' },
    { position: 3, name: '{company} - {title}' },
  ],
}
```

### 3.2 JSON-LD 유틸리티

**새 파일**: `src/lib/seo.ts`

```typescript
// 공통 상수
export const SITE_URL = 'https://mochabun.co.kr';
export const SITE_NAME = '모카번';

// JSON-LD 생성 헬퍼
export function getOrganizationJsonLd(): WithContext<Organization> { ... }
export function getWebApplicationJsonLd(): WithContext<WebApplication> { ... }
export function getFaqJsonLd(faqs: FaqItem[]): WithContext<FAQPage> { ... }
export function getBreadcrumbJsonLd(items: BreadcrumbItem[]): WithContext<BreadcrumbList> { ... }

// JSON-LD 렌더링 컴포넌트
export function JsonLd<T extends Thing>({ data }: { data: WithContext<T> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}
```

### 3.3 llms.txt

**파일**: `public/llms.txt` (정적 파일로 서빙)

```markdown
# 모카번 (mochabun)

> AI 기반 개발자 기술면접 준비 서비스. 경력, 포지션, 기술 스택에 맞는 맞춤형 면접 질문을 AI가 자동 생성합니다.

## 주요 기능

- [AI 맞춤형 면접 질문 생성](https://mochabun.co.kr/interview)
- [최신 기술 트렌드 질문](https://mochabun.co.kr/trends)
- [면접 사례 분석](https://mochabun.co.kr/case-studies)
- [팀 스페이스 협업](https://mochabun.co.kr/team-spaces/new)

## 지원 기술 스택

React, Next.js, TypeScript, Node.js, Python, Java, Spring Boot, ...
```

### 3.4 동적 메타데이터 (case-studies/[slug])

**문제**: 현재 `case-studies/[slug]/page.tsx`가 `"use client"` → `generateMetadata` 사용 불가

**해결**: 서버 컴포넌트 래퍼 패턴

```
src/app/case-studies/[slug]/
  ├── page.tsx          → 서버 컴포넌트 (generateMetadata + JSON-LD + 클라이언트 import)
  └── CaseStudyClient.tsx → 기존 클라이언트 컴포넌트 (이름 변경)
```

### 3.5 동적 사이트맵

`src/app/sitemap.ts`를 확장하여 Supabase에서 case-studies 슬러그를 가져옴:

```typescript
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = [...]; // 기존
  const caseStudyPages = await getCaseStudySlugs(); // DB 조회
  const trendPages = TREND_TOPICS.map(t => ({ url: `${BASE_URL}/trends?topic=${t.id}` }));
  return [...staticPages, ...caseStudyPages, ...trendPages];
}
```

### 3.6 robots.ts AI 크롤러 허용

AI 검색/학습 봇 명시적 허용:

| Bot                 | Token              | 용도                                |
| ------------------- | ------------------ | ----------------------------------- |
| ChatGPT 실시간 검색 | `ChatGPT-User`     | 사용자 질문 시 라이브 페이지 크롤링 |
| Claude 검색         | `Claude-SearchBot` | Anthropic 검색 인덱스               |
| Perplexity 검색     | `PerplexityBot`    | Perplexity AI 검색엔진              |
| OpenAI 학습         | `GPTBot`           | 미래 GPT 모델 학습 데이터           |
| Anthropic 학습      | `ClaudeBot`        | 미래 Claude 모델 학습 데이터        |
| Google AI 학습      | `Google-Extended`  | Gemini 학습/그라운딩                |

```typescript
rules: [
  { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/", "/complete/"] },
  { userAgent: "GPTBot", allow: "/" },
  { userAgent: "ChatGPT-User", allow: "/" },
  { userAgent: "ClaudeBot", allow: "/" },
  { userAgent: "Claude-SearchBot", allow: "/" },
  { userAgent: "PerplexityBot", allow: "/" },
  { userAgent: "Google-Extended", allow: "/" },
];
```

### 3.7 LLMEO 콘텐츠 전략 (AI 플랫폼별 최적화)

레퍼런스: [openads.co.kr AEO/GEO/LLMEO 가이드](https://openads.co.kr/content/contentDetail?contsId=17364)

#### AI 플랫폼별 선호 콘텐츠 특성

| 플랫폼         | 선호 스타일                                       | mochabun 적용                                 |
| -------------- | ------------------------------------------------- | --------------------------------------------- |
| **ChatGPT**    | 자연스러운 대화체, 단계별 설명, 구체적 사례       | FAQ를 대화체로 작성, 면접 준비 단계별 가이드  |
| **Claude**     | 증거 기반 추론, 다각적 관점, 포괄적 배경          | 데이터 인용, 장단점 비교, 근거 제시           |
| **Perplexity** | 권위있는 다중 소스(5+), 최신 데이터, 학술적       | 통계 데이터 포함, 출처 명시, 최신 트렌드 반영 |
| **Gemini**     | 구조화 데이터, 멀티미디어, Google 지식그래프 연결 | Schema.org 완벽 적용, 이미지 alt 최적화       |

#### FAQ 콘텐츠 작성 원칙 (AEO + LLMEO 통합)

**원칙 1: 즉답형 구조** (AEO 핵심)

```
질문: "모카번은 어떤 서비스인가요?"
답변 첫 50자: "모카번은 AI가 개발자의 경력과 기술 스택에 맞는 기술면접 질문을 자동 생성하는 서비스입니다."
→ 이후 상세 설명 (기능, 특징, 차별점)
```

**원칙 2: 4단계 구조** (질문→상황→문제→해결)

```
Q: "기술면접 준비를 어떻게 시작하나요?"
[상황] 개발자 채용 과정에서 기술면접은 필수이지만...
[문제] 어떤 질문이 나올지 모르고, 혼자 준비하기 어렵습니다.
[해결] 모카번에서 포지션과 경력에 맞는 AI 맞춤 질문으로 실전 연습할 수 있습니다.
```

**원칙 3: 단정적/명료하게**

- ❌ "효과가 있을 수 있습니다"
- ✅ "효과가 있습니다"

**원칙 4: 데이터 기반 신뢰성**

- ❌ "많은 개발자가 사용합니다"
- ✅ "프론트엔드, 백엔드, 풀스택 등 10개 이상 포지션의 면접 질문을 지원합니다"

#### FAQ 콘텐츠 목록 (8개)

| #   | 질문                                       | 타겟 키워드                        |
| --- | ------------------------------------------ | ---------------------------------- |
| 1   | 모카번은 어떤 서비스인가요?                | 기술면접 준비 서비스, AI 면접      |
| 2   | 어떤 기술 스택의 면접 질문을 지원하나요?   | React 면접, 백엔드 면접 질문       |
| 3   | AI가 생성하는 면접 질문은 어떻게 다른가요? | AI 면접 질문 생성                  |
| 4   | 기술면접 준비를 어떻게 시작하나요?         | 기술면접 준비 방법, 면접 준비 시작 |
| 5   | 최신 기술 트렌드 질문도 연습할 수 있나요?  | LLM 면접, AI 트렌드 면접           |
| 6   | 팀으로 함께 면접 준비할 수 있나요?         | 팀 면접 준비, 스터디               |
| 7   | 실제 기업 면접 사례도 제공하나요?          | 기업 면접 사례, 케이스 스터디      |
| 8   | 무료로 사용할 수 있나요?                   | 무료 면접 준비                     |

### 3.8 llms-full.txt (확장 버전)

`public/llms-full.txt` - llms.txt의 확장 버전으로, AI가 서비스를 더 깊이 이해할 수 있도록 상세 콘텐츠 포함:

```markdown
# 모카번 (mochabun) - 상세 가이드

> AI 기반 개발자 기술면접 준비 서비스

## 서비스 소개

모카번은 Anthropic Claude AI를 활용하여 개발자의 경력, 포지션, 기술 스택에 맞는
기술면접 질문을 자동 생성하는 한국어 기반 플랫폼입니다.

## 주요 기능 상세

- [AI 맞춤형 면접 질문 생성](https://mochabun.co.kr/interview): ...상세 설명
- [최신 기술 트렌드 질문](https://mochabun.co.kr/trends): LLM, RAG, AI Agent 등 2026년 출제 급상승 토픽
- [실전 모의면접](https://mochabun.co.kr/interview): 타이머, 힌트 기능
- [면접 사례 분석](https://mochabun.co.kr/case-studies): 실제 기업 기술블로그/컨퍼런스 기반 사례
- [팀 스페이스](https://mochabun.co.kr/team-spaces/new): 팀 협업 학습

## 지원 포지션

프론트엔드, 백엔드, 풀스택, DevOps, 데이터 엔지니어, AI/ML 엔지니어

## 지원 기술 스택

React, Next.js, TypeScript, JavaScript, Node.js, Python, Java, Spring Boot,
Go, Kotlin, Swift, Docker, Kubernetes, AWS, 시스템 디자인, 자료구조/알고리즘

## 자주 묻는 질문 (FAQ)

(FAQ 8개 전문 포함 - AI가 직접 인용 가능)
```

---

## 4. Implementation Plan

### Phase 1: 기반 구축 (SEO 인프라)

| #   | Task                                 | Files                                 | Effort |
| --- | ------------------------------------ | ------------------------------------- | ------ |
| 1   | `schema-dts` 패키지 설치             | package.json                          | S      |
| 2   | SEO 유틸리티 생성 (`src/lib/seo.ts`) | 신규 파일                             | M      |
| 3   | robots.ts AI 크롤러 6종 허용 추가    | src/app/robots.ts                     | S      |
| 4   | llms.txt + llms-full.txt 생성        | public/llms.txt, public/llms-full.txt | S      |

### Phase 2: 구조화 데이터 (JSON-LD) + 메타데이터

| #   | Task                                                       | Files              | Effort |
| --- | ---------------------------------------------------------- | ------------------ | ------ |
| 5   | 루트 레이아웃에 Organization + WebApplication JSON-LD 추가 | src/app/layout.tsx | M      |
| 6   | 루트 레이아웃에 Twitter/X 카드 메타데이터 추가             | src/app/layout.tsx | S      |

### Phase 3: 동적 페이지 최적화

| #   | Task                                                        | Files                                                     | Effort |
| --- | ----------------------------------------------------------- | --------------------------------------------------------- | ------ |
| 7   | case-studies/[slug] 서버/클라이언트 분리 + generateMetadata | src/app/case-studies/[slug]/page.tsx, CaseStudyClient.tsx | L      |
| 8   | case-studies/[slug]에 BreadcrumbList JSON-LD 추가           | src/app/case-studies/[slug]/page.tsx                      | S      |
| 9   | trends 레이아웃 메타데이터 보강                             | src/app/trends/layout.tsx                                 | S      |

### Phase 4: 사이트맵 확장

| #   | Task                                                      | Files                                       | Effort |
| --- | --------------------------------------------------------- | ------------------------------------------- | ------ |
| 10  | sitemap.ts 동적 확장 (case-studies slugs + trends topics) | src/app/sitemap.ts, src/lib/case-studies.ts | M      |

### Phase 5: FAQ 콘텐츠 (AEO + LLMEO)

| #   | Task                                                | Files                                              | Effort |
| --- | --------------------------------------------------- | -------------------------------------------------- | ------ |
| 11  | FAQ 데이터 정의 (8개, 즉답형 AEO + LLMEO 원칙 적용) | src/data/faq.ts (신규)                             | M      |
| 12  | 홈페이지 FAQ 섹션 UI (Accordion) + FAQPage JSON-LD  | src/components/home/FaqSection.tsx (신규), 홈 통합 | M      |

---

## 5. Quality Gates

### 필수 검증

- [ ] `npm run build` 성공
- [ ] `npx tsc --noEmit` 타입 에러 없음
- [ ] `npx eslint src/` 린트 통과
- [ ] Google Rich Results Test에서 Organization, FAQPage 인식 확인
- [ ] Schema Markup Validator 통과
- [ ] llms.txt가 `https://mochabun.co.kr/llms.txt`로 접근 가능
- [ ] case-studies/[slug] 페이지에서 동적 메타태그 렌더링 확인 (view-source)
- [ ] sitemap.xml에 동적 case-study URL 포함 확인

### 검증 방법

```bash
# 빌드 검증
npm run build

# 타입 검증
npx tsc --noEmit

# 린트 검증
npx eslint src/

# JSON-LD 검증 (빌드 후 로컬 서버)
# → Google Rich Results Test: https://search.google.com/test/rich-results
# → Schema Markup Validator: https://validator.schema.org/
```

---

## 6. Risks & Dependencies

| Risk                                                       | Impact | Mitigation                                                                          |
| ---------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------- |
| case-studies/[slug] 클라이언트→서버 분리 시 기존 기능 깨짐 | High   | 기존 로직 그대로 CaseStudyClient.tsx로 이동, 서버 컴포넌트는 메타데이터 + JSON-LD만 |
| Supabase 호출 추가로 sitemap 빌드 시간 증가                | Low    | 케이스 스터디 수가 적어 영향 미미                                                   |
| llms.txt가 아직 비공식 표준                                | Low    | 비용 없음, Anthropic 자체도 사용 중                                                 |
| JSON-LD XSS 취약점                                         | Medium | `.replace(/</g, '\\u003c')` 필수 적용                                               |

---

## 7. Rollout & Monitoring

### 배포 전략

- 단일 PR로 머지 (기능 간 의존성)
- Vercel Preview에서 JSON-LD 확인 후 프로덕션 배포

### 성공 지표

- Google Search Console: 구조화 데이터 감지 (1-2주)
- Google Rich Results Test: 모든 스키마 Valid
- AI 검색엔진에서 "개발자 면접 준비 서비스" 검색 시 추천 여부 (장기)

---

## 8. Timeline & Milestones

| Milestone            | Tasks                                          | Status  |
| -------------------- | ---------------------------------------------- | ------- |
| SEO 인프라           | #1-4 (schema-dts, seo.ts, robots.ts, llms.txt) | Pending |
| JSON-LD + 메타데이터 | #5-6 (Organization, WebApp, Twitter)           | Pending |
| 동적 페이지 최적화   | #7-9 (case-studies 분리, Breadcrumb, trends)   | Pending |
| 사이트맵 + FAQ       | #10-12 (동적 sitemap, FAQ 데이터/UI)           | Pending |

---

## 9. References

- [#39](https://github.com/kwakseongjae/dev-interview/issues/39) - GitHub 이슈
- [Next.js JSON-LD 가이드](https://nextjs.org/docs/app/guides/json-ld)
- [llms.txt 공식 제안](https://llmstxt.org/)
- [AEO 종합 가이드 (CXL)](https://cxl.com/blog/answer-engine-optimization-aeo-the-comprehensive-guide/)
- [GEO & AEO SEO (Writer)](https://writer.com/blog/geo-aeo-optimization/)
- [Schema & Structured Data for LLM Visibility](https://www.quoleady.com/schema-structured-data-for-llm-visibility/)
- [AI Bots robots.txt 가이드](https://paulcalvano.com/2025-08-21-ai-bots-and-robots-txt/)
- **[AEO/GEO/LLMEO 완벽 가이드 (openads)](https://openads.co.kr/content/contentDetail?contsId=17364)** - LLMEO 전략, AI 플랫폼별 최적화, 즉답형 콘텐츠 원칙
- [FAQ Schema for AI Search (Frase)](https://www.frase.io/blog/faq-schema-ai-search-geo-aeo) - FAQPage schema AI Overviews 노출 3.2배 데이터
- [LLMEO Strategies 2026 (TechiHub)](https://techiehub.blog/llmeo-strategies-2026/) - LLM 엔진별 최적화 전략
- [스키마 마크업 SEO/GEO 전략 (238lab)](https://238lab.kr/blog-seo-schemamarkup) - 한국 SaaS 스키마 가이드

---

## 10. Implementation Summary

**Completion Date**: 2026-02-24
**Implemented By**: Claude Opus 4.6

### Changes Made

#### New Files (8)

- `src/lib/seo.ts` - SEO 상수(SITE_URL, SITE_NAME 등) + JSON-LD 생성 함수(Organization, WebApplication, FAQPage, BreadcrumbList) + XSS-safe serializer
- `src/components/JsonLd.tsx` - JSON-LD `<script>` 태그 렌더링 컴포넌트 (generic `<T extends Thing>`)
- `src/data/faq.ts` - AEO/LLMEO 원칙 기반 FAQ 8개 항목 (즉답형, 단정적, 데이터 기반)
- `src/components/FaqSection.tsx` - Accordion 기반 FAQ UI 컴포넌트 (framer-motion + shadcn)
- `src/app/case-studies/[slug]/CaseStudyClient.tsx` - 기존 클라이언트 로직 분리 (서버 컴포넌트 전환 위해)
- `public/llms.txt` - AI 크롤러용 사이트 가이드 (llms.txt 표준)
- `public/llms-full.txt` - 확장 버전 (상세 기능 설명 + 전체 FAQ 텍스트)
- `docs/plans/039-aeo-seo-geo-optimization.md` - 계획 문서

#### Modified Files (8)

- `src/app/layout.tsx` - JSON-LD 3종(Organization + WebApplication + FAQPage) 삽입, 키워드 8→12개 확장, Twitter card 추가
- `src/app/page.tsx` - FaqSection 컴포넌트 추가 (홈페이지 FAQ 노출)
- `src/app/robots.ts` - AI 크롤러 6종 허용 규칙 추가 (ChatGPT-User, Claude-SearchBot, PerplexityBot, GPTBot, ClaudeBot, Google-Extended), BASE_URL → SITE_URL 통일
- `src/app/sitemap.ts` - 정적→동적 전환 (Supabase에서 case-study slug 조회 + trend topic 페이지 포함), BASE_URL → SITE_URL 통일
- `src/app/trends/layout.tsx` - keywords, Twitter card, canonical URL, OG url/siteName 추가
- `src/app/case-studies/[slug]/page.tsx` - 클라이언트→서버 컴포넌트 전환, `generateMetadata()` + BreadcrumbList JSON-LD 추가, 서버에서 fetch한 데이터를 props로 전달 (이중 fetch 제거)
- `package.json` / `package-lock.json` - `schema-dts` 패키지 추가

### Key Implementation Details

- **JSON-LD**: `schema-dts` 패키지로 타입 안전한 구조화 데이터 생성, XSS 방지를 위한 `<` → `\u003c` 이스케이프
- **AEO FAQ**: 8개 항목 모두 첫 50자 내 완전한 답변 제공, 단정적/명료한 어투, 데이터 기반 근거 포함
- **LLMEO**: llms-full.txt에 FAQ 전문 포함하여 AI가 직접 추출 가능한 구조
- **Case Study SSR**: 서버 컴포넌트에서 1회 fetch → `generateMetadata()` + `CaseStudyClient` props로 공유 (DB 호출 50% 감소)
- **도메인 통일**: SITE_URL을 `https://www.mochabun.co.kr`로 변경, robots.ts/sitemap.ts의 BASE_URL 하드코딩 제거 → 단일 소스

### Quality Validation

- [x] Build: Success (35 pages)
- [x] Type Check: Passed
- [x] Lint: Passed

### Deviations from Plan

**Added**:

- P0 수정: `SITE_URL`을 `www.mochabun.co.kr`로 변경 (Vercel 리다이렉트 현실 반영)
- P1 수정: robots.ts/sitemap.ts의 BASE_URL 하드코딩을 SITE_URL import로 통일
- P1 수정: CaseStudyClient에 서버 데이터를 props로 전달하여 이중 fetch 제거

**Skipped**:

- OG Image 생성 (P2 - 후속 이슈로)
- sitemap에서 auth/favorites 페이지 제거 (P2)
- llms.txt 발견성 향상 메타 태그 (P2)
- Trends 경로 구조 변경 (P3 - 라우팅 변경 필요)

### Follow-up Tasks

- [ ] OG Image 추가 (1200x630 정적 또는 Next.js opengraph-image.tsx 동적 생성)
- [ ] sitemap에서 SEO 가치 낮은 페이지 제거 (/auth, /favorites)
- [ ] llms.txt 발견성 향상 (robots.txt 주석, `<link rel="ai-guide">`)
- [ ] Trends 페이지 경로 기반 URL 전환 (`/trends?topic=` → `/trends/[topicId]`)
- [ ] Google Search Console에서 구조화 데이터 검증 확인
- [ ] CSP에 Google Analytics 허용 추가 (GA 도입 시)

---

## 11. QA Checklist

> 🤖 Generated by qa-generator agent
> Date: 2026-02-24
> Details: [QA_CHECKLIST_039.md](/QA_CHECKLIST_039.md)

### 테스트 요약

| 구분             | 개수                         | 설명                                       |
| ---------------- | ---------------------------- | ------------------------------------------ |
| 총 테스트 케이스 | 38개                         | 기능, 엣지 케이스, 시각적, 회귀, 성능 통합 |
| 우선순위별       | High: 16, Medium: 14, Low: 8 |                                            |
| 예상 테스트 시간 | 45분                         | 로컬 개발 환경 + Google Rich Results Test  |

### 핵심 테스트 영역

#### 1. JSON-LD 구조화 데이터 (6개)

- Organization + WebApplication + FAQPage + BreadcrumbList 생성 확인
- XSS 안전성 검증 (`<` → `\u003c`)
- Google Rich Results Test 통과

#### 2. FAQ 섹션 (6개)

- 8개 항목 모두 로드 및 렌더링
- Accordion UI 인터랙션 (열기/닫기)
- 즉답형 구조 + 단정적 어투 + 데이터 기반 근거

#### 3. robots.txt 및 AI 크롤러 (2개)

- 6종 AI 봇 명시적 허용 (ChatGPT-User, Claude-SearchBot, PerplexityBot, GPTBot, ClaudeBot, Google-Extended)

#### 4. llms.txt 파일 (4개)

- 정적 파일 서빙 확인
- 콘텐츠 구조 (Markdown 형식)
- 기본 버전 + 확장 버전 (FAQ 전문 포함)

#### 5. 동적 사이트맵 (4개)

- Supabase 쿼리 호출 확인
- 케이스 스터디 slug URL 포함
- 트렌드 토픽 페이지 포함

#### 6. Case Study 페이지 (4개)

- 서버/클라이언트 분리 (이중 fetch 제거)
- 동적 메타데이터 생성
- 404 처리

#### 7. 메타데이터 확장 (4개)

- 키워드 확장 (12개+)
- Twitter/X 카드
- Trends 페이지 메타데이터
- Canonical URL

#### 8. 회귀 테스트 (7개)

- 홈페이지, 인터뷰, 트렌드, 팀 스페이스 기능 정상 작동
- 로그인/인증 플로우
- 페이지 네비게이션

#### 9. 성능 테스트 (5개)

- 번들 크기 증가 < 10KB
- 초기 로드 시간 LCP 변화 < 100ms
- 케이스 스터디 응답 시간 개선

#### 10. 크로스 브라우저 (6개)

- Chrome, Safari, Firefox, Edge
- Chrome Mobile (Android 12+), Safari Mobile (iOS 16+)

### 테스트 실행 체크리스트

**Phase 1: 필수 테스트 (30분)** ⬜

- [ ] FT-1 ~ FT-6: JSON-LD 생성
- [ ] FT-11 ~ FT-12: robots.txt AI 크롤러
- [ ] FT-13 ~ FT-14: llms.txt 서빙
- [ ] FT-17 ~ FT-20: 동적 사이트맵
- [ ] FT-21 ~ FT-23: 케이스 스터디 페이지
- [ ] SD-1 ~ SD-4: 구조화 데이터 검증
- [ ] CQ-1 ~ CQ-4: 코드 품질

**Phase 2: 주요 기능 (10분)** ⬜

- [ ] FT-25 ~ FT-30: FAQ 섹션
- [ ] FT-7 ~ FT-10: 메타데이터
- [ ] RT-1 ~ RT-7: 회귀 테스트

**Phase 3: 선택 (5분)** ⬜

- [ ] UI/UX 테스트
- [ ] 엣지 케이스
- [ ] 성능 테스트

**마지막 업데이트**: 2026-02-24
