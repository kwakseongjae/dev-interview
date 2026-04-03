# Seed Case Studies Command

## Description

**남는 Plan 토큰을 활용해 기업 사례 스터디 DB를 사전에 채우는 통합 커맨드**

Claude Code가 직접:

- 🔍 WebSearch/WebFetch로 실제 기술 블로그 아티클 리서치
- ✅ URL 유효성 검증 + 아티클 내용 정합성 체크
- 📊 Supabase MCP로 기존 기업 사례 분포 분석
- ✍️ 실제 아티클 기반으로 기업 사례 데이터 생성
- 💾 JSON 파일로 저장 (감사 추적용)
- 🗄️ Supabase MCP `execute_sql`로 DB 직접 적재
- 📚 기술 블로그 정리 데이터도 함께 적재 (`src/data/tech-blogs.ts` 참조)

**핵심**: 별도 API 불필요. Claude Code의 Plan 토큰 + WebSearch/WebFetch로 동작.

## Usage

```
/seed-case-studies                              # 전체 분석 → 추천 → 리서치 → 적재
/seed-case-studies toss 5                       # 특정 회사 바로 리서치
/seed-case-studies --domain backend 10          # 특정 도메인 리서치
/seed-case-studies --blog "https://toss.tech/"  # 특정 블로그에서 리서치
```

## Prerequisites

- Supabase MCP 연결 활성화
- WebSearch/WebFetch 사용 가능

## Workflow

### Step 0: Parse Arguments

- **인자 없음**: 전체 흐름 (Analyze → Recommend → Research → Verify → Insert)
- **`{company} {count}`**: 해당 회사 기술 블로그에서 직접 리서치
- **`--domain {domain} {count}`**: 특정 기술 도메인 관련 아티클 리서치
- **`--blog {url}`**: 특정 블로그 URL에서 아티클 수집

직접 지정 시 Step 1-2를 건너뛰고 Step 3으로 직행.

---

### Step 1: ANALYZE — 현황 분석

**Supabase MCP `execute_sql`로 기존 데이터 파악:**

**쿼리 1: 회사별 기업 사례 분포**

```sql
SELECT
  company_name,
  company_slug,
  COUNT(*) AS case_count,
  ARRAY_AGG(DISTINCT unnest_domain) AS domains
FROM case_studies,
LATERAL unnest(domains) AS unnest_domain
WHERE is_published = true
GROUP BY company_name, company_slug
ORDER BY case_count DESC;
```

**쿼리 2: 도메인별 분포**

```sql
SELECT
  unnest_domain AS domain,
  COUNT(*) AS case_count
FROM case_studies,
LATERAL unnest(domains) AS unnest_domain
WHERE is_published = true
GROUP BY unnest_domain
ORDER BY case_count ASC;
```

**결과 출력:**

```
📊 회사별 기업 사례 분포
┌──────────────┬──────────┬──────────────────────────┐
│ 회사          │ 사례 수   │ 도메인                    │
├──────────────┼──────────┼──────────────────────────┤
│ 토스          │ 3        │ frontend, backend        │
│ 카카오        │ 2        │ backend, infrastructure  │
│ ...          │ ...      │ ...                      │
└──────────────┴──────────┴──────────────────────────┘
전체: {total}개

📊 도메인별 분포
(부족한 도메인 하이라이트)
```

---

### Step 2: RECOMMEND — 부족 영역 추천

**추천 로직:**

1. **회사 갭**: `src/data/tech-blogs.ts`에 등록된 회사 중 사례가 없는 회사
2. **도메인 갭**: 사례가 적은 기술 도메인
3. **인기 블로그 우선**: 국내 빅테크 → 해외 빅테크 → 핀테크 → 기타 순

**추천 출력 후 사용자 확인 대기:**

```
💡 추천 시드 계획

1. [회사] Netflix (+3개) — 해외 빅테크, 사례 0개
2. [회사] 당근마켓 (+2개) — 국내, 사례 0개
3. [도메인] data (+3개) — 데이터 엔지니어링 사례 부족

총 추천: 8개

이 계획으로 진행할까요? (수정 가능)
```

---

### Step 3: RESEARCH — 실제 기술 블로그 리서치

**이 단계가 핵심입니다. Claude Code가 실제 아티클을 찾고 읽어서 사례 데이터를 생성합니다.**

#### 3-1. 아티클 검색

각 추천 항목에 대해 WebSearch로 실제 기술 블로그 아티클을 검색:

```
WebSearch: "{company} engineering blog {domain} case study"
WebSearch: "{company} tech blog {keyword}"
```

**검색 우선순위:**

1. 기업 공식 기술 블로그 (tech.kakao.com, toss.tech, engineering.fb.com 등)
2. Medium 엔지니어링 퍼블리케이션 (medium.com/{company}-engineering)
3. 기술 컨퍼런스 발표 자료 (InfoQ, QCon 등)

**절대 포함하지 않을 소스:**

- YouTube 영상
- 개인 블로그 (회사 공식이 아닌 것)
- 뉴스 기사

#### 3-2. 아티클 내용 수집

검색된 아티클을 WebFetch로 실제 내용을 읽어옴:

```
WebFetch: "{article_url}"
  prompt: "이 기술 블로그 아티클의 내용을 분석해주세요:
    1. 배경/맥락 (Background)
    2. 기술적 과제 (Challenge)
    3. 해결 방법 (Solution)
    4. 결과/성과 (Results)
    5. 핵심 교훈 (Key Takeaways)
    6. 사용된 기술 스택
    7. 발행일"
```

#### 3-3. 기업 사례 데이터 생성

실제 아티클 내용을 기반으로 CaseStudy 형식의 JSON 생성:

```json
{
  "title": "토스 프론트엔드 모노레포 전환기",
  "slug": "toss-frontend-monorepo-migration",
  "companyName": "토스",
  "companySlug": "toss",
  "sourceUrl": "https://toss.tech/article/monorepo-migration",
  "sourceType": "blog",
  "sourceLanguage": "ko",
  "publishedAt": "2024-08-15",
  "summary": {
    "background": "토스 프론트엔드 팀은 30개 이상의 서비스를 독립 레포에서 관리하며...",
    "challenge": "패키지 버전 불일치, 중복 코드, 빌드 파이프라인 관리 복잡도...",
    "solution": "Turborepo 기반 모노레포 전환. 점진적 마이그레이션 전략 채택...",
    "results": "빌드 시간 60% 단축, 코드 재사용률 40% 향상...",
    "keyTakeaways": [
      "점진적 마이그레이션이 빅뱅 전환보다 안전하다",
      "모노레포 도구 선택 시 기존 워크플로우와의 호환성이 핵심",
      "CI/CD 파이프라인을 먼저 준비해야 전환이 원활하다"
    ]
  },
  "domains": ["frontend", "infrastructure"],
  "technologies": ["Turborepo", "TypeScript", "React", "pnpm"],
  "difficulty": "B",
  "seedQuestions": [
    {
      "content": "모노레포와 멀티레포의 트레이드오프를 설명하고, 어떤 상황에서 모노레포 전환을 고려해야 하는지 논의해주세요.",
      "hint": "코드 공유, 빌드 최적화, 의존성 관리, CI/CD, 팀 규모, Turborepo vs Nx",
      "category": "SYSTEM_DESIGN"
    },
    {
      "content": "대규모 코드베이스를 모노레포로 점진적 마이그레이션하는 전략을 설계해주세요.",
      "hint": "점진적 전환, 호환성 레이어, 빌드 파이프라인, 팀 온보딩, 롤백 전략",
      "category": "FRONTEND"
    }
  ]
}
```

**생성 시 필수 규칙:**

1. **sourceUrl은 반드시 실제 존재하는 URL** — 리서치에서 찾은 URL 그대로 사용
2. **summary는 실제 아티클 내용 기반** — 허구 금지, WebFetch로 읽은 내용에서 추출
3. **publishedAt은 실제 발행일** — 아티클에서 확인된 날짜
4. **technologies는 아티클에 언급된 기술만** — 추정 금지
5. **seedQuestions는 해당 사례에 특화된 질문** — 범용 질문 금지
6. **난이도 기준**: A(기본 개념, 사례 이해), B(심화 분석, 설계 비교), C(고난도, 트레이드오프 토론)

---

### Step 4: VERIFY — URL 유효성 + 내용 정합성 검증

**적재 전 반드시 수행하는 검증 단계.**

#### 4-1. URL 유효성 검증

각 생성된 사례의 sourceUrl을 WebFetch로 접근:

```
WebFetch: "{sourceUrl}"
  prompt: "이 URL이 실제 기술 블로그 아티클인지 확인하고,
    페이지 제목과 주요 내용 키워드를 알려주세요."
```

**검증 기준:**

- ✅ HTTP 200 응답 (또는 정상 렌더링되는 페이지)
- ✅ 페이지 내용에 회사명 또는 기술 키워드 포함
- ❌ 404, 500 에러 → 해당 사례 제외
- ⚠️ 403 (WAF 차단) → 경고 표시, 사용자에게 브라우저 확인 요청

#### 4-2. 내용 정합성 검증

WebFetch로 가져온 페이지 내용과 생성된 summary 비교:

```
검증 체크리스트:
1. 회사명이 페이지에 포함되는가?
2. technologies 중 50% 이상이 페이지에 언급되는가?
3. summary의 핵심 키워드가 페이지에 존재하는가?
4. publishedAt이 실제 발행일과 일치하는가?
```

**점수 기준:**

- 50%+ 매치: ✅ 통과
- 30-49% 매치: ⚠️ 경고 (사용자에게 수동 확인 요청)
- 30% 미만: ❌ 실패 → 해당 사례 제외

#### 4-3. 검증 결과 리포트

```
🔍 검증 결과
┌───┬──────────────────────────────┬──────┬──────┬──────────┐
│ # │ 제목                          │ URL  │ 내용  │ 상태      │
├───┼──────────────────────────────┼──────┼──────┼──────────┤
│ 1 │ 토스 모노레포 전환기          │ ✅   │ 72%  │ ✅ 통과   │
│ 2 │ 카카오페이 MSA 트랜잭션       │ ✅   │ 85%  │ ✅ 통과   │
│ 3 │ Netflix Zuul 게이트웨이       │ ✅   │ 45%  │ ⚠️ 확인  │
│ 4 │ 삭제된 아티클                 │ ❌   │ -    │ ❌ 제외   │
└───┴──────────────────────────────┴──────┴──────┴──────────┘

✅ 통과: 2개 | ⚠️ 확인 필요: 1개 | ❌ 제외: 1개

⚠️ 확인이 필요한 항목을 브라우저에서 직접 확인해주세요.
제외된 항목을 제거하고 진행할까요?
```

**사용자 확인 후 다음 단계로 진행.**

---

### Step 5: DB 적재

**JSON 파일은 저장하지 않는다. 검증 통과한 사례를 바로 DB에 적재한다.**

#### DB 적재 — Supabase MCP `execute_sql`

각 검증 통과한 사례에 대해:

**Step A: slug 중복 체크**

```sql
SELECT id FROM case_studies WHERE slug = '{slug}' LIMIT 1;
```

**Step B: INSERT (중복이 아닌 경우만)**

```sql
INSERT INTO case_studies (
  title, slug, company_name, company_slug,
  source_url, source_type, source_language,
  published_at, summary, domains, technologies,
  difficulty, seed_questions,
  view_count, interview_count, is_published
) VALUES (
  '{title}', '{slug}', '{companyName}', '{companySlug}',
  '{sourceUrl}', '{sourceType}', '{sourceLanguage}',
  '{publishedAt}',
  '{summary_json}'::jsonb,
  ARRAY[{domains}],
  ARRAY[{technologies}],
  '{difficulty}',
  '{seedQuestions_json}'::jsonb,
  0, 0, true
);
```

**주의**: summary와 seedQuestions는 JSONB 타입으로 적재.

---

### Step 6: REPORT — 결과 리포트

```
✅ 기업 사례 시드 완료!

📋 생성 결과
┌──────────────────────────┬──────┬──────┬──────┬──────────┐
│ 항목                      │ 리서치 │ 검증  │ 적재  │ 중복 스킵 │
├──────────────────────────┼──────┼──────┼──────┼──────────┤
│ 토스                      │ 3    │ 3    │ 3    │ 0        │
│ 카카오페이                │ 2    │ 2    │ 1    │ 1        │
│ Netflix                  │ 3    │ 2    │ 2    │ 0        │
├──────────────────────────┼──────┼──────┼──────┼──────────┤
│ 합계                      │ 8    │ 7    │ 6    │ 1        │
└──────────────────────────┴──────┴──────┴──────┴──────────┘

🏠 홈 카드 업데이트:
  - 기존: 12개 기업 사례 → 현재: 18개 기업 사례
  - 홈 카드는 /api/case-studies/stats API로 자동 반영됨
```

---

## 기술 블로그 참조

`src/data/tech-blogs.ts`에 국내/해외 기술 블로그 목록이 정의되어 있습니다.
리서치 시 이 목록의 URL을 우선 활용합니다.

**국내 주요 블로그:**

- 카카오: tech.kakao.com
- 카카오페이: tech.kakaopay.com
- 네이버 D2: d2.naver.com
- 토스: toss.tech
- 쿠팡: medium.com/coupang-engineering
- 우아한형제들: techblog.woowahan.com
- 당근마켓: medium.com/daangn
- 컬리: helloworld.kurly.com
- SOCAR: tech.socarcorp.kr

**해외 주요 블로그:**

- Netflix: netflixtechblog.com
- Uber: uber.com/blog/engineering
- Airbnb: airbnb.tech
- Stripe: stripe.com/blog/engineering
- Discord: discord.com/blog (engineering)
- Shopify: shopify.engineering
- Spotify: engineering.atspotify.com

## Error Handling

- WebSearch 실패: 해당 회사 스킵, 나머지 계속
- WebFetch 실패: URL 검증 실패로 처리, 해당 사례 제외
- Supabase MCP 미연결: 에러 메시지 출력 후 중단
- INSERT 실패: 에러 로그 출력, 나머지 항목 계속 진행
- 부분 실패 시: 성공/실패 항목을 리포트에 구분 표시

## Notes

- **정합성 최우선**: 실제 아티클이 확인되지 않은 사례는 절대 적재하지 않음
- **유튜브 제외**: sourceType은 blog/conference/paper만 허용
- **파일 저장 안 함**: JSON 파일을 별도 저장하지 않고 DB에 바로 적재
- 같은 커맨드를 여러 번 실행해도 slug 중복 체크로 안전
- 홈 카드의 기업 사례 숫자는 `/api/case-studies/stats` API로 자동 동적 반영
- `is_published: true`로 적재되므로 즉시 서비스에 노출됨
