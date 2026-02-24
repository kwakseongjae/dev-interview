# QA 체크리스트 - #39: AEO/SEO/GEO 최적화

> 생성: 2026-02-24
> 이슈: [#39 AEO/SEO/GEO 최적화](https://github.com/kwakseongjae/dev-interview/issues/39)
> 구현 범위: JSON-LD 구조화 데이터, FAQ 콘텐츠, AI 크롤러 지원, 동적 메타데이터, 동적 사이트맵

---

## 테스트 요약

| 구분             | 개수                         | 설명                                       |
| ---------------- | ---------------------------- | ------------------------------------------ |
| 총 테스트 케이스 | 38개                         | 기능, 엣지 케이스, 시각적, 회귀, 성능 통합 |
| 우선순위별       | High: 16, Medium: 14, Low: 8 |                                            |
| 예상 테스트 시간 | 45분                         | 로컬 개발 환경 + Google Rich Results Test  |

---

## 1. 기능 테스트 (Functional Tests)

### 1.1 JSON-LD 구조화 데이터

| #    | 테스트 시나리오                             | 사전 조건                 | 테스트 단계                                                                                  | 예상 결과                                                                                                                                                               | 우선순위 |
| ---- | ------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FT-1 | Organization JSON-LD 생성                   | npm run build 완료        | 1. 루트 페이지 소스보기<br>2. `<script type="application/ld+json">` 검색                     | `@type: "Organization"`, `name: "모카번"`, `url: "https://www.mochabun.co.kr"` 포함                                                                                     | High     |
| FT-2 | WebApplication JSON-LD 생성                 | npm run build 완료        | 1. 루트 페이지 소스보기<br>2. WebApplication 스크립트 확인                                   | `applicationCategory: "EducationalApplication"`, `offers: {price: "0"}` 포함                                                                                            | High     |
| FT-3 | FAQPage JSON-LD 홈페이지에 존재             | npm run build 완료        | 1. 홈페이지(/) 소스보기<br>2. FAQPage 스크립트 검색                                          | 8개 FAQ 항목 모두 `mainEntity` 배열에 포함<br>각 항목에 `@type: "Question"`, `acceptedAnswer` 존재                                                                      | High     |
| FT-4 | BreadcrumbList JSON-LD 케이스 스터디 페이지 | 케이스 스터디 페이지 로드 | 1. `/case-studies/[slug]` 페이지 소스보기<br>2. BreadcrumbList 검색                          | `itemListElement` 배열: 홈(1) → 케이스 스터디(2) → 회사명(3)                                                                                                            | High     |
| FT-5 | JSON-LD XSS 안전성 검증                     | 소스코드 검토             | 1. `src/lib/seo.ts` 확인<br>2. `JSON.stringify(...).replace(/</g, '\\u003c')` 적용 여부 확인 | 모든 JSON-LD에서 `<` 문자가 `\u003c`로 이스케이프됨                                                                                                                     | High     |
| FT-6 | FAQ 데이터 8개 항목 로드                    | 홈페이지 로드             | 1. 홈페이지 하단 FAQ 섹션 확인<br>2. 질문 항목 개수 확인                                     | 8개 FAQ 항목 모두 표시됨:<br>1. 모카번은 어떤 서비스<br>2. 기술 스택<br>3. AI 면접 질문<br>4. 준비 방법<br>5. 트렌드 질문<br>6. 팀 협업<br>7. 기업 사례<br>8. 무료 사용 | High     |

### 1.2 메타데이터 및 메타 태그

| #     | 테스트 시나리오                  | 사전 조건                          | 테스트 단계                                                                | 예상 결과                                                                                | 우선순위 |
| ----- | -------------------------------- | ---------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------- |
| FT-7  | 루트 레이아웃에 확장 키워드 추가 | npm run build 완료                 | 1. 소스 코드 `src/app/layout.tsx` 확인<br>2. `keywords` 메타 태그 검색     | 기존 대비 키워드 수 증가 (12개+)<br>"AEO", "AI 검색", "LLM" 포함                         | Medium   |
| FT-8  | Twitter/X 카드 메타데이터 추가   | 루트 페이지                        | 1. 소스 코드 확인<br>2. `twitter:` meta 태그 존재                          | `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image` 모두 존재        | Medium   |
| FT-9  | Trends 페이지 메타데이터 확장    | `/trends` 페이지 로드              | 1. 페이지 소스보기<br>2. 메타 태그 확인                                    | `keywords`, `og:title`, `og:description`, `twitter:card`, `canonical` 모두 설정됨        | Medium   |
| FT-10 | Case Study 동적 메타데이터 생성  | `/case-studies/[slug]` 페이지 로드 | 1. 페이지 타이틀 확인<br>2. 소스코드에서 `og:title`, `og:description` 확인 | 회사명과 면접 제목을 기반한 동적 메타데이터<br>정적 케이스 스터디는 사전 설정 메타데이터 | High     |

### 1.3 robots.txt 및 크롤러 설정

| #     | 테스트 시나리오           | 사전 조건          | 테스트 단계                                            | 예상 결과                                                                                                                                                  | 우선순위 |
| ----- | ------------------------- | ------------------ | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FT-11 | AI 크롤러 6종 명시적 허용 | npm run build 완료 | 1. `src/app/robots.ts` 코드 확인<br>2. rules 배열 검색 | 다음 6종 userAgent 모두 `allow: "/"` 규칙 포함:<br>- ChatGPT-User<br>- Claude-SearchBot<br>- PerplexityBot<br>- GPTBot<br>- ClaudeBot<br>- Google-Extended | High     |
| FT-12 | 기본 크롤러 규칙 유지     | robots.ts          | 1. robots.ts 확인<br>2. `*` userAgent 규칙 확인        | `disallow: ["/api/", "/auth/", "/complete/"]`<br>`allow: "/"` 유지                                                                                         | High     |

### 1.4 llms.txt 파일

| #     | 테스트 시나리오              | 사전 조건          | 테스트 단계                                                                                      | 예상 결과                                                                                                                                  | 우선순위 |
| ----- | ---------------------------- | ------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| FT-13 | llms.txt 정적 파일 서빙      | npm run dev        | 1. 브라우저 주소창에 `https://localhost:3000/llms.txt` 입력<br>2. 파일 다운로드 또는 텍스트 표시 | llms.txt 파일이 다운로드되거나 텍스트로 표시됨<br>UTF-8 인코딩, Markdown 형식                                                              | High     |
| FT-14 | llms.txt 기본 콘텐츠         | llms.txt 파일      | 1. 파일 내용 확인<br>2. 섹션 구조 확인                                                           | Markdown 형식:<br>- `# 모카번 (mochabun)` 제목<br>- 주요 기능 섹션<br>- 지원 기술 스택 섹션<br>각 항목에 `https://mochabun.co.kr` URL 포함 | High     |
| FT-15 | llms-full.txt 확장 버전 서빙 | npm run dev        | 1. 브라우저에서 `https://localhost:3000/llms-full.txt` 입력                                      | llms-full.txt 다운로드 가능<br>llms.txt보다 상세한 설명 포함                                                                               | Medium   |
| FT-16 | llms-full.txt FAQ 전문 포함  | llms-full.txt 파일 | 1. 파일 내용 검색<br>2. "자주 묻는 질문" 섹션 확인                                               | 8개 FAQ 전문이 Markdown 형식으로 포함됨<br>AI가 직접 인용 가능한 구조                                                                      | Medium   |

### 1.5 동적 사이트맵

| #     | 테스트 시나리오                    | 사전 조건                 | 테스트 단계                                                                                            | 예상 결과                                                                                                     | 우선순위 |
| ----- | ---------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | -------- |
| FT-17 | 사이트맵 동적 생성 (case-studies)  | npm run build + 빌드 완료 | 1. `src/app/sitemap.ts` 코드 확인<br>2. Supabase 쿼리 호출 여부 확인                                   | 동적 함수 구현 (`async function sitemap()`)                                                                   | High     |
| FT-18 | 사이트맵에 케이스 스터디 URL 포함  | 로컬 개발 서버 실행       | 1. `/sitemap.xml` 접근<br>2. 케이스 스터디 slug URL 검색<br>(예: `/case-studies/google-llm-interview`) | 모든 케이스 스터디 페이지가 `<url>` 요소로 포함됨<br>각 URL: `https://www.mochabun.co.kr/case-studies/{slug}` | High     |
| FT-19 | 사이트맵에 트렌드 토픽 페이지 포함 | sitemap.ts                | 1. 코드 확인<br>2. `TREND_TOPICS` 사용 여부 확인                                                       | 모든 트렌드 토픽이 `/trends?topic={topicId}` 형식으로 포함                                                    | Medium   |
| FT-20 | 사이트맵 URL 절대경로 사용         | sitemap.xml               | 1. 생성된 sitemap.xml 확인<br>2. 모든 URL이 전체 주소인지 확인                                         | 상대 경로 없음, 모두 `https://www.mochabun.co.kr/...` 형식                                                    | High     |

### 1.6 Case Study 페이지 (서버/클라이언트 분리)

| #     | 테스트 시나리오                           | 사전 조건                | 테스트 단계                                                          | 예상 결과                                                                       | 우선순위 |
| ----- | ----------------------------------------- | ------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------- |
| FT-21 | 케이스 스터디 페이지 렌더링               | 케이스 스터디 URL 접근   | 1. `/case-studies/{valid-slug}` 접근<br>2. 페이지 로드 완료          | 페이지가 정상 렌더링됨<br>회사명, 면접 제목, 질문/답변 콘텐츠 표시              | High     |
| FT-22 | 케이스 스터디 동적 메타데이터             | 케이스 스터디 페이지     | 1. 페이지 소스보기<br>2. `<title>` 태그 및 og 메타 확인              | `title`: `{회사명} {제목} - 모카번`<br>`og:title`, `og:description` 동적 설정됨 | High     |
| FT-23 | 케이스 스터디 서버→클라이언트 데이터 전달 | CaseStudyClient 컴포넌트 | 1. 코드 확인<br>2. 서버에서 fetch한 데이터가 props로 전달되는지 확인 | 이중 fetch 없음, 서버에서 1회 fetch → props로 컴포넌트 전달                     | High     |
| FT-24 | 잘못된 slug 접근 시 404                   | 존재하지 않는 slug       | 1. `/case-studies/invalid-slug-12345` 접근                           | 404 페이지 또는 Not Found 에러 페이지 표시                                      | Medium   |

### 1.7 FAQ 섹션 UI 및 콘텐츠

| #     | 테스트 시나리오             | 사전 조건       | 테스트 단계                                                                              | 예상 결과                                                                                                 | 우선순위 |
| ----- | --------------------------- | --------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------- |
| FT-25 | FAQ Accordion UI 인터랙션   | 홈페이지 로드   | 1. 홈페이지 하단 FAQ 섹션 확인<br>2. 첫 번째 FAQ 항목 클릭                               | 해당 항목이 확장되고 답변 표시됨                                                                          | High     |
| FT-26 | FAQ 항목 펼침/접힘 토글     | FAQ 열린 상태   | 1. 열린 항목 다시 클릭                                                                   | 항목이 축소되고 답변 숨겨짐                                                                               | Medium   |
| FT-27 | 다중 FAQ 항목 동시 열기     | FAQ 섹션        | 1. 첫 항목 클릭하여 열기<br>2. 두 번째 항목 클릭                                         | 첫 항목은 닫히고 두 번째만 열림 (싱글 아코디언)<br>또는 둘 다 열림 (멀티 아코디언) - 설정에 따라          | Medium   |
| FT-28 | FAQ 콘텐츠 즉답형 구조      | 데이터 검토     | 1. `src/data/faq.ts` 검토<br>2. 각 답변 첫 50자 확인                                     | 모든 FAQ 답변의 첫 50-100자에 완전한 답변 포함<br>예: "모카번은 AI가 개발자의 경력과 기술 스택에 맞는..." | High     |
| FT-29 | FAQ 콘텐츠 단정적 어투      | FAQ 데이터 검토 | 1. 데이터 파일에서 답변 문구 검색<br>2. "할 수 있습니다"와 "할 수 있을 것 같습니다" 비교 | 모두 단정적 어투 사용<br>불확실한 표현 없음                                                               | Medium   |
| FT-30 | FAQ 콘텐츠 데이터 기반 근거 | 답변 문구 검토  | 1. FAQ 답변에서 구체적 수치/데이터 확인                                                  | "많은 개발자" 대신 "10개 이상 포지션 지원"<br>또는 구체적 기능 수치 언급                                  | Medium   |

---

## 2. 엣지 케이스 및 에러 처리

| #    | 테스트 시나리오              | 사전 조건                        | 테스트 단계                                    | 예상 결과                                                              | 우선순위 |
| ---- | ---------------------------- | -------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------- | -------- |
| EC-1 | 케이스 스터디 데이터 없을 때 | Supabase 쿼리 결과 empty         | 1. sitemap 생성<br>2. getCaseStudySlugs() 호출 | 에러 없이 빈 배열 반환<br>사이트맵에는 정적 페이지만 포함              | Medium   |
| EC-2 | FAQ 데이터 로드 실패         | 네트워크 지연 또는 import 실패   | 1. 홈페이지 로드<br>2. FAQ 섹션 표시 여부 확인 | FAQ 섹션이 표시되거나 안 보임 (에러 없음)<br>다른 페이지 콘텐츠는 정상 | Low      |
| EC-3 | JSON-LD 스크립트에 특수 문자 | 데이터에 `<`, `>`, `&` 포함      | 1. 소스 코드 확인<br>2. escape 처리 여부 확인  | 특수 문자가 제대로 이스케이프됨<br>`<` → `\u003c`                      | High     |
| EC-4 | 빌드 타임 Supabase 호출 실패 | Supabase 다운 또는 네트워크 오류 | 1. `npm run build` 실행                        | 빌드 실패 또는 폴백 동작<br>만약 폴백 없으면 에러 로그 표시            | Low      |
| EC-5 | llms.txt 접근 불가           | 파일이 `public/` 디렉토리에 없음 | 1. `https://localhost:3000/llms.txt` 접근      | 404 또는 파일이 서빙됨                                                 | Low      |

---

## 3. 시각적 및 UI/UX 테스트

| #    | 테스트 시나리오               | 사전 조건            | 테스트 단계                                                         | 예상 결과                                                                                               | 우선순위 |
| ---- | ----------------------------- | -------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------- |
| UI-1 | FAQ Accordion 애니메이션      | 홈페이지 로드        | 1. FAQ 항목 클릭<br>2. 열림/닫힘 애니메이션 관찰                    | 부드러운 높이 변화 애니메이션<br>깜빡임 없음, 텍스트가 순차적으로 표시                                  | Medium   |
| UI-2 | FAQ 아이콘 변화               | Accordion 토글       | 1. 아이콘(▼/▶) 또는 +/- 확인<br>2. 회전 또는 변화                   | 항목 열림/닫힘에 따라 아이콘 변경<br>시각적 피드백 제공                                                 | Low      |
| UI-3 | 케이스 스터디 페이지 레이아웃 | 케이스 스터디 페이지 | 1. 데스크톱/태블릿/모바일에서 확인                                  | 반응형 레이아웃 적용<br>모든 화면에서 가독성 유지                                                       | Medium   |
| UI-4 | 깨진 이미지 또는 로고         | 루트 레이아웃        | 1. 페이지 로드<br>2. 개발자 도구 Network 탭에서 이미지 확인         | Organization JSON-LD의 로고 URL이 유효<br>`https://www.mochabun.co.kr/assets/images/logo.png` 접근 가능 | Low      |
| UI-5 | 텍스트 줄바꿈 및 오버플로우   | 모바일 화면 (320px)  | 1. FAQ 제목과 답변이 화면을 넘는지 확인<br>2. 가로 스크롤 발생 여부 | 줄바꿈 정상 처리<br>가로 스크롤 없음                                                                    | Low      |

---

## 4. 회귀 테스트 (기존 기능 영향 확인)

| #    | 테스트 시나리오           | 사전 조건        | 테스트 단계                                           | 예상 결과                                                      | 우선순위 |
| ---- | ------------------------- | ---------------- | ----------------------------------------------------- | -------------------------------------------------------------- | -------- |
| RT-1 | 홈페이지 기본 렌더링      | 이전 버전과 비교 | 1. 홈페이지(/) 로드<br>2. 헤더, 히어로, CTA 버튼 확인 | 모든 요소가 정상 표시<br>레이아웃 변화 없음                    | High     |
| RT-2 | 인터뷰 페이지 기능        | 이전 버전과 비교 | 1. `/interview` 로드<br>2. 질문 생성 플로우 진행      | 질문 생성, 타이머, 힌트 기능 정상 작동                         | High     |
| RT-3 | 트렌드 페이지 필터링      | `/trends` 페이지 | 1. 페이지 로드<br>2. 토픽 필터 클릭                   | 토픽별 필터링 정상 작동<br>메타데이터 업데이트 여부 확인       | High     |
| RT-4 | 팀 스페이스 기능          | `/team-spaces`   | 1. 팀 스페이스 페이지 로드<br>2. 팀 생성/참여 플로우  | 기존 기능 정상 작동<br>새 메타데이터로 인한 영향 없음          | High     |
| RT-5 | 케이스 스터디 목록 페이지 | `/case-studies`  | 1. 목록 페이지 로드<br>2. 필터, 검색, 정렬 기능       | 리스트 표시, 검색 정상 작동<br>서버 컴포넌트 변환 후 성능 개선 | High     |
| RT-6 | 로그인/인증 플로우        | 로그인 페이지    | 1. `/auth/signin` 접근<br>2. OAuth 로그인 시도        | 인증 플로우 정상 작동<br>새 메타데이터 로딩으로 인한 지연 없음 | High     |
| RT-7 | 페이지 네비게이션         | 사이트 전체      | 1. 각 페이지 간 네비게이션<br>2. 뒤로가기 버튼        | 모든 링크 작동<br>페이지 전환 부드러움                         | Medium   |

---

## 5. 성능 테스트

| #    | 테스트 시나리오                | 사전 조건             | 테스트 단계                                                          | 예상 결과                                                              | 우선순위 |
| ---- | ------------------------------ | --------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------- |
| PT-1 | 빌드 크기 증가                 | npm run build         | 1. 빌드 로그 확인<br>2. "Total size" 또는 "bundle size" 확인         | 번들 크기 증가 < 10KB<br>(JSON-LD + FAQ + 컴포넌트 추가)               | Medium   |
| PT-2 | 홈페이지 초기 로드 시간        | 캐시 제거 상태        | 1. DevTools Performance 탭<br>2. LCP (Largest Contentful Paint) 측정 | LCP 변화 < 100ms<br>기존 성능 유지                                     | Medium   |
| PT-3 | 케이스 스터디 페이지 로드 시간 | 서버 컴포넌트 변환 후 | 1. 로컬 개발 서버 응답 시간 측정<br>2. 이전 버전과 비교              | 응답 시간 동일 또는 개선 (1회 fetch)<br>TTI (Time to Interactive) 단축 | Medium   |
| PT-4 | 사이트맵 생성 시간             | npm run build         | 1. 빌드 로그에서 sitemap.ts 실행 시간 확인                           | 빌드 시간 증가 < 2초<br>(Supabase 쿼리 추가)                           | Low      |
| PT-5 | JSON-LD 렌더링 성능            | 페이지 로드           | 1. JSON-LD 스크립트 크기 측정<br>2. 파싱/렌더링 영향 확인            | 각 JSON-LD 스크립트 < 5KB<br>렌더링 블로킹 없음                        | Low      |

---

## 6. 구조화 데이터 검증

| #    | 테스트 시나리오             | 사전 조건       | 테스트 단계                                                                                                                                                                                                      | 예상 결과                                                | 우선순위 |
| ---- | --------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | -------- |
| SD-1 | Google Rich Results Test    | 홈페이지 URL    | 1. https://search.google.com/test/rich-results 접근<br>2. 사이트 URL 입력                                                                                                                                        | "Valid ✓" 표시<br>Organization, FAQPage 스키마 인식됨    | High     |
| SD-2 | Schema Markup Validator     | 모든 페이지     | 1. https://validator.schema.org/ 접근<br>2. 루트 페이지, 홈페이지, 케이스 스터디 URL 검증                                                                                                                        | 모든 스키마 "Valid"<br>에러 또는 경고 없음               | High     |
| SD-3 | 각 JSON-LD 타입별 필드 검증 | 검증 도구       | 1. Organization 필수 필드: name, url, logo 확인<br>2. WebApplication 필수: name, url, applicationCategory 확인<br>3. FAQPage: mainEntity 배열과 각 Question 구조<br>4. BreadcrumbList: itemListElement 배열 구조 | 모든 필수 필드 존재<br>필드 타입 정확함                  | High     |
| SD-4 | FAQPage 스키마 완성도       | FAQPage JSON-LD | 1. 각 Question 항목 확인<br>2. `name` (질문), `acceptedAnswer.text` (답변) 존재 확인                                                                                                                             | 8개 항목 모두 name + acceptedAnswer 보유<br>빈 필드 없음 | High     |

---

## 7. 크로스 브라우저 및 디바이스 테스트

| 브라우저/디바이스           | 테스트 항목                                  | 예상 결과                                | 상태 |
| --------------------------- | -------------------------------------------- | ---------------------------------------- | ---- |
| Chrome (최신)               | 페이지 렌더링, JSON-LD, FAQ 인터랙션         | 모두 정상                                | ⬜   |
| Safari (최신)               | 페이지 렌더링, 애니메이션, 인터랙션          | 부드러운 애니메이션, 정상 렌더링         | ⬜   |
| Firefox (최신)              | 페이지 렌더링, 개발자 도구에서 스크립트 확인 | JSON-LD 스크립트 보임                    | ⬜   |
| Edge (최신)                 | 페이지 렌더링, 메타데이터                    | 정상                                     | ⬜   |
| Chrome Mobile (Android 12+) | 반응형 레이아웃, FAQ 터치 인터랙션           | 모바일 레이아웃 정상, 터치 인터랙션 반응 | ⬜   |
| Safari Mobile (iOS 16+)     | 반응형 레이아웃, 애니메이션                  | 부드러운 동작, 레이아웃 정상             | ⬜   |

---

## 8. SEO/AEO 검증

| #     | 테스트 항목                   | 검증 방법                                        | 예상 결과                                                                              | 우선순위 |
| ----- | ----------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------- | -------- |
| SEO-1 | 메타 디스크립션               | 페이지 소스 또는 SEO 도구 (Semrush, Ahrefs)      | 150-160자, 주요 키워드 포함                                                            | Medium   |
| SEO-2 | Open Graph 메타 태그          | 페이지 소스 확인<br>또는 Facebook Share Debugger | og:title, og:description, og:image, og:url 모두 설정                                   | Medium   |
| SEO-3 | Canonical URL                 | 페이지 소스 확인                                 | 중복 내용 페이지에서 canonical 설정<br>예: `/trends?topic=llm` → canonical = `/trends` | Medium   |
| SEO-4 | Sitemap 유효성                | Google Search Console 또는 validator             | sitemap.xml이 유효한 XML 형식<br>모든 URL이 정상 접근 가능                             | High     |
| SEO-5 | robots.txt 문법               | robots.txt 파일 확인                             | 파일이 유효한 형식<br>AI 크롤러 6종 명시적 allow 규칙 존재                             | High     |
| SEO-6 | FAQ 스키마가 AI 검색에 최적화 | 콘텐츠 분석                                      | 첫 50자에 완전한 답변 포함<br>AI가 인용 가능한 형태                                    | High     |
| SEO-7 | llms.txt 검색 가능성          | AI 크롤러 테스트 (예: Perplexity AI)             | AI 검색에서 mochabun 검색 시 llms.txt에 나열된 기능 포함되는지 확인 (장기 모니터링)    | Low      |

---

## 9. 코드 품질 및 타입 안전성

| #    | 테스트 항목            | 검증 방법                           | 예상 결과                                                      | 우선순위 |
| ---- | ---------------------- | ----------------------------------- | -------------------------------------------------------------- | -------- |
| CQ-1 | TypeScript 타입 에러   | npx tsc --noEmit                    | 타입 에러 0개                                                  | High     |
| CQ-2 | ESLint 린트 통과       | npm run lint (또는 npx eslint src/) | 린트 에러 0개<br>경고 최소화                                   | High     |
| CQ-3 | Build 성공             | npm run build                       | 빌드 완료, 에러 없음<br>모든 페이지 생성됨                     | High     |
| CQ-4 | schema-dts 타입 정확성 | 코드 검토                           | JSON-LD 생성 함수에서 schema-dts 타입 사용<br>타입 안전성 보장 | High     |
| CQ-5 | 컴포넌트 재사용성      | 코드 검토                           | FaqSection, JsonLd 컴포넌트가 generic하고 재사용 가능          | Medium   |

---

## 10. 테스트 실행 가이드

### 10.1 사전 준비

```bash
# 1. 최신 코드 확인
git checkout feat/39-aeo-seo-geo-optimization

# 2. 의존성 설치
npm install

# 3. 환경 변수 확인 (.env.local)
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY 필수

# 4. 타입 및 린트 검증
npm run build
npx tsc --noEmit
npx eslint src/
```

### 10.2 로컬 개발 환경 테스트

```bash
# 1. 개발 서버 실행
npm run dev

# 2. 각 페이지 확인
# - 홈페이지: http://localhost:3000
# - 케이스 스터디: http://localhost:3000/case-studies/[valid-slug]
# - 트렌드: http://localhost:3000/trends
# - llms.txt: http://localhost:3000/llms.txt
# - llms-full.txt: http://localhost:3000/llms-full.txt
# - sitemap: http://localhost:3000/sitemap.xml

# 3. 개발자 도구에서 확인
# - 소스보기: 페이지 HTML에서 JSON-LD 스크립트 확인
# - Console: 에러 없음
# - Network: llms.txt 200 상태코드
```

### 10.3 Google 도구를 이용한 검증

```
1. Google Rich Results Test
   URL: https://search.google.com/test/rich-results
   입력: https://www.mochabun.co.kr (또는 Preview URL)
   확인: Organization, FAQPage 인식됨

2. Schema Markup Validator
   URL: https://validator.schema.org/
   입력: 페이지 URL 또는 소스 HTML
   확인: 스키마 Valid, 에러 없음

3. Google Search Console (프로덕션 배포 후)
   확인 항목:
   - Coverage 탭에서 sitemap 인덱싱 여부
   - Enhancement 탭에서 "Structured Data" 섹션
   - 구조화 데이터 에러 여부 (1-2주 뒤 반영)
```

### 10.4 우선순위별 테스트 순서

**Phase 1: 필수 테스트 (30분)** - 우선순위 High

1. FT-1 ~ FT-6: JSON-LD 생성 확인
2. FT-11 ~ FT-12: robots.txt AI 크롤러 허용
3. FT-13 ~ FT-14: llms.txt 서빙
4. FT-17 ~ FT-20: 동적 사이트맵
5. FT-21 ~ FT-23: 케이스 스터디 페이지
6. SD-1 ~ SD-4: 구조화 데이터 검증 (Google Rich Results Test)
7. CQ-1 ~ CQ-4: 코드 품질

**Phase 2: 주요 기능 테스트 (10분)** - 우선순위 Medium

1. FT-25 ~ FT-30: FAQ 섹션 UI 및 콘텐츠
2. FT-7 ~ FT-10: 메타데이터 확장
3. RT-1 ~ RT-7: 회귀 테스트

**Phase 3: 선택 테스트 (5분)** - 우선순위 Low

1. UI-1 ~ UI-5: 시각적 테스트
2. EC-1 ~ EC-5: 엣지 케이스
3. PT-1 ~ PT-5: 성능 테스트

### 10.5 실패 시 대응

- **빌드 실패**: `npm run build` 로그에서 에러 메시지 확인 → 해당 파일 수정
- **타입 에러**: `npx tsc --noEmit` 에러 위치 확인 → 타입 지정 수정
- **JSON-LD 검증 실패**: Google Rich Results Test에서 에러 항목 확인 → `src/lib/seo.ts`에서 필드 추가
- **메타데이터 미반영**: 페이지 소스보기에서 메타 태그 확인 → generateMetadata 함수 재확인
- **llms.txt 404**: `public/llms.txt` 파일 존재 여부 확인 → public 디렉토리에 파일 추가

---

## 체크리스트 작성 및 실행 기록

| 테스트 단계          | 실행자 | 날짜 | 상태 |
| -------------------- | ------ | ---- | ---- |
| Phase 1: 필수 테스트 |        |      | ⬜   |
| Phase 2: 주요 기능   |        |      | ⬜   |
| Phase 3: 선택 테스트 |        |      | ⬜   |
| **최종 승인**        |        |      | ⬜   |

---

**마지막 업데이트**: 2026-02-24
**생성자**: qa-generator agent
**관련 이슈**: [#39 AEO/SEO/GEO 최적화](https://github.com/kwakseongjae/dev-interview/issues/39)
