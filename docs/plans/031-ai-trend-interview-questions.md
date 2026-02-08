# 031 - AI/최신 기술 트렌드 면접 질문 지원

> **Issue**: [#31](https://github.com/kwakseongjae/dev-interview/issues/31)
> **Branch**: `feat/31-ai-trend-interview-questions`
> **Created**: 2026-02-09

---

## 1. Overview

### 문제 정의

현재 mochabun은 CS, PROJECT, SYSTEM_DESIGN, CASE_STUDY 4가지 면접 유형을 지원하지만, **최신 기술 트렌드(AI/LLM, RAG, Agent 등)를 체계적으로 반영하는 메커니즘이 없다.** 사용자가 "AI 면접"이라고 입력하면 Claude의 내재 지식에만 의존하여 질문이 생성되며, 트렌드 토픽에 대한 전문적인 가이드나 구조화된 프롬프트가 부재하다.

### 목표

1. 트렌드 토픽 데이터를 체계적으로 관리하고 프롬프트에 주입
2. 사용자가 트렌드 토픽을 쉽게 발견하고 선택할 수 있는 UI 제공
3. 지속적으로 트렌드를 업데이트할 수 있는 관리 체계 수립

### 범위

- **In-Scope**: 트렌드 토픽 데이터 정의, 프롬프트 강화, 홈페이지 UI 추가, 질문 생성 플로우 확장
- **Out-of-Scope**: 자동 크롤링/실시간 트렌드 수집, 관리자 대시보드, 트렌드별 전용 페이지

---

## 2. Requirements

### 기능 요구사항 (FR)

| ID   | 요구사항                                                      | 우선순위 |
| ---- | ------------------------------------------------------------- | -------- |
| FR-1 | 트렌드 토픽 데이터를 TypeScript config 파일로 관리            | P1       |
| FR-2 | 홈페이지에 트렌드 토픽 칩 UI 표시, 클릭 시 쿼리 자동 설정     | P1       |
| FR-3 | 질문 생성 시 트렌드 토픽 컨텍스트를 프롬프트에 주입           | P1       |
| FR-4 | 생성된 질문에 `isTrending` 플래그 추가, UI에 트렌드 배지 표시 | P1       |
| FR-5 | 기존 면접 유형(CS, PROJECT 등)과 트렌드 토픽 조합 가능        | P2       |
| FR-6 | SAMPLE_PROMPTS에 트렌드 관련 예시 추가                        | P2       |
| FR-7 | validation.ts에 트렌드 키워드 인식 추가                       | P2       |

### 기술 요구사항 (TR)

| ID   | 요구사항                                                                     | 우선순위 |
| ---- | ---------------------------------------------------------------------------- | -------- |
| TR-1 | 트렌드 데이터는 `src/data/trend-topics.ts`에 타입 세이프하게 관리            | P1       |
| TR-2 | 프롬프트 주입은 기존 `INTERVIEW_TYPE_PROMPTS` 패턴 재사용                    | P1       |
| TR-3 | 기존 API 인터페이스(`/api/questions/generate`)에 `trend_topic` 파라미터 추가 | P1       |
| TR-4 | `GeneratedQuestion` 인터페이스에 `isTrending`, `trendTopic` 필드 추가        | P1       |
| TR-5 | 빌드/타입체크/린트 통과 필수                                                 | P1       |

### 비기능 요구사항 (NFR)

| ID    | 요구사항                                                                       |
| ----- | ------------------------------------------------------------------------------ |
| NFR-1 | 트렌드 토픽 선택으로 인한 질문 생성 지연 없음 (추가 API 호출 없음)             |
| NFR-2 | 트렌드 데이터 업데이트 시 코드 변경 + 빌드만으로 반영 (DB 마이그레이션 불필요) |
| NFR-3 | 모바일/데스크톱 모두에서 트렌드 칩 UI 정상 표시                                |

---

## 3. Architecture & Design

### 3.1 트렌드 반영 전략 결정: 하이브리드 접근

| 방식                               | 역할                                            | 주기      | 비용         |
| ---------------------------------- | ----------------------------------------------- | --------- | ------------ |
| **프롬프트 강화** (Phase 1)        | Claude 내재 지식 + 구조화된 컨텍스트로 80% 커버 | 즉시      | 낮음         |
| **Config 파일 큐레이션** (Phase 1) | 트렌드 토픽 메타데이터를 TS 파일로 관리         | 분기별 PR | 낮음         |
| **DB 저장** (Phase 2, 추후)        | 사용량 분석, 관리자 UI 용                       | 추후      | 중간         |
| **실시간 크롤링** (비추천)         | 완전 자동화                                     | -         | 높음, 비추천 |

**결정 근거:**

- Claude 모델(2025.05 학습)이 이미 AI/트렌드 지식을 풍부히 보유
- 프롬프트에 구조화된 컨텍스트만 주입해도 질문 품질이 크게 향상
- Config 파일은 Git 버전 관리 가능, 타입 안전, DB 의존성 없음
- **분기별 Claude Code 웹서핑으로 트렌드 리포트 작성 → Config 업데이트 PR**이 가장 효율적

### 3.2 데이터 구조

```
src/
├── data/
│   └── trend-topics.ts       # 🆕 트렌드 토픽 데이터 + 타입 + 헬퍼 함수
├── lib/
│   ├── claude.ts              # ✏️ TREND_TOPIC_PROMPTS 추가, 프롬프트 주입 로직
│   └── validation.ts          # ✏️ 트렌드 키워드 추가
├── components/
│   ├── TrendTopicChips.tsx    # 🆕 트렌드 토픽 칩 컴포넌트
│   └── InterviewTypeSelector.tsx  # (참고용, 패턴 재사용)
├── app/
│   ├── page.tsx               # ✏️ 트렌드 칩 UI 통합
│   └── api/questions/generate/route.ts  # ✏️ trend_topic 파라미터 지원
└── types/
    └── interview.ts           # ✏️ TrendTopicId 타입, Question에 isTrending 추가
```

### 3.3 프롬프트 주입 흐름

```
사용자 입력 (query + interview_type + trend_topic)
    ↓
API Route: trend_topic 파라미터 수신
    ↓
claude.ts > generateQuestions():
    1. GENERATE_QUESTIONS_PROMPT (기본 프롬프트)
    2. + INTERVIEW_TYPE_PROMPTS[type] (면접 유형, 기존)
    3. + buildTrendInstruction(trendTopic) (🆕 트렌드 컨텍스트)
    4. + referenceInstruction (레퍼런스, 기존)
    5. + diversityPrompt (다양성, 기존)
    ↓
Claude API 호출 (temperature 0.7)
    ↓
응답 파싱: isTrending, trendTopic 필드 포함
```

### 3.4 트렌드 토픽 초기 세트 (2026 Q1)

| ID                   | 토픽                      | 한국어명            | 우선순위 | 적용 면접유형              |
| -------------------- | ------------------------- | ------------------- | -------- | -------------------------- |
| `llm-app-dev`        | LLM Application Dev       | LLM 활용 개발       | CRITICAL | CS, PROJECT, SYSTEM_DESIGN |
| `rag-pipeline`       | RAG Pipeline              | RAG 파이프라인      | CRITICAL | SYSTEM_DESIGN, PROJECT     |
| `ai-agent`           | AI Agent Architecture     | AI 에이전트         | CRITICAL | SYSTEM_DESIGN, PROJECT     |
| `prompt-engineering` | Prompt Engineering        | 프롬프트 엔지니어링 | HIGH     | CS, PROJECT                |
| `event-driven`       | Event-Driven Architecture | 이벤트 드리븐       | HIGH     | SYSTEM_DESIGN              |
| `cloud-native`       | Cloud-Native & K8s        | 클라우드 네이티브   | HIGH     | SYSTEM_DESIGN              |
| `on-device-ai`       | On-Device AI              | 온디바이스 AI       | HIGH     | SYSTEM_DESIGN, CS          |
| `go-rust-systems`    | Go/Rust Systems           | Go/Rust 시스템      | MEDIUM   | CS, SYSTEM_DESIGN          |
| `observability`      | Observability             | 옵저버빌리티        | MEDIUM   | SYSTEM_DESIGN              |
| `ai-dev-tools`       | AI-Assisted Dev           | AI 활용 개발 도구   | MEDIUM   | PROJECT                    |

### 3.5 컴포넌트 구조

```
<Home>
  └── <TrendTopicChips>           # 🆕 트렌드 칩 (홈 상단)
        ├── 칩 클릭 → setQuery() + setSelectedTrendTopicId()
        └── "🔥 LLM 활용 개발"  "RAG 파이프라인"  "AI 에이전트" ...
  └── <InterviewTypeSelector>     # (기존) 면접 유형 선택
  └── <SearchInput>               # (기존) 검색 입력
```

---

## 4. Implementation Plan

### Phase 1: 코어 기능 (MVP)

#### Task 1-1: 트렌드 토픽 데이터 정의

**파일**: `src/data/trend-topics.ts` (신규)

- `TrendTopic` 인터페이스 정의
  - `id`, `name`, `nameKo`, `category`, `relevance`, `description`, `sampleAngles`, `applicableTypes`, `tags`, `chipQuery`(클릭 시 자동 설정할 검색어)
- `TREND_TOPICS` 상수 배열: 10개 초기 토픽 데이터
- `getTrendTopicById()`, `getTopicsForType()`, `getCriticalTopics()` 헬퍼 함수

#### Task 1-2: 타입 확장

**파일**: `src/types/interview.ts` (수정)

- `TrendTopicId` 타입 추가 (리터럴 유니온)
- `Question` 인터페이스에 `isTrending?: boolean`, `trendTopic?: string` 추가

**파일**: `src/lib/claude.ts` (수정)

- `GeneratedQuestion` 인터페이스에 `isTrending?: boolean`, `trendTopic?: string` 추가

#### Task 1-3: 프롬프트 강화

**파일**: `src/lib/claude.ts` (수정)

- `TREND_TOPIC_PROMPTS` 객체 추가: 각 트렌드 토픽별 구조화된 프롬프트
  - 토픽 설명, 출제 범위, 질문 각도(sampleAngles), 질문 스타일 가이드
  - 기존 `INTERVIEW_TYPE_PROMPTS` 패턴과 동일한 구조
- `buildTrendInstruction(trendTopicId)` 함수: 트렌드 컨텍스트 문자열 생성
- `generateQuestions()` 함수 시그니처에 `trendTopic?: string` 파라미터 추가
- 프롬프트 조립 로직에 `trendInstruction` 삽입 (line 451~457 확장)
- JSON 출력 형식에 `isTrending`, `trendTopic` 필드 안내 추가

#### Task 1-4: API Route 확장

**파일**: `src/app/api/questions/generate/route.ts` (수정)

- Request body에 `trend_topic?: string` 추가
- `generateQuestions()` 호출 시 `trendTopic` 전달
- Response에 `trendTopicUsed: boolean` 추가

#### Task 1-5: 트렌드 토픽 칩 UI

**파일**: `src/components/TrendTopicChips.tsx` (신규)

- `InterviewTypeSelector` 패턴 재사용 (모바일: flex-wrap, 데스크톱: 가로 스크롤)
- 각 칩: 🔥 아이콘 + 토픽명 (한국어)
- 선택 시 `onSelect(topicId)` 콜백
- relevance별 색상 구분 (critical: amber, high: blue, medium: gray)
- 모바일 반응형 지원 (`useIsMobile()` 훅 활용)

**파일**: `src/app/page.tsx` (수정)

- `TrendTopicChips` 컴포넌트 통합
- 칩 클릭 시: `setQuery(topic.chipQuery)` + `setSelectedTrendTopicId(topic.id)`
- 트렌드 토픽 상태 관리: `selectedTrendTopicId`
- 검색 요청 시 `trend_topic` 파라미터 전달

#### Task 1-6: 질문 목록 트렌드 배지

**파일**: `src/app/search/page.tsx` (수정)

- 트렌드 질문에 `Badge` 컴포넌트로 "트렌드" 표시
- 기존 `isReferenceBased` 배지 패턴 재사용

#### Task 1-7: SAMPLE_PROMPTS & 검증 업데이트

**파일**: `src/app/page.tsx` (수정)

- `SAMPLE_PROMPTS`에 트렌드 예시 추가: "LLM 활용 개발자 면접 준비", "RAG 시스템 설계 면접"

**파일**: `src/lib/validation.ts` (수정)

- 트렌드 키워드 추가: `LLM`, `RAG`, `에이전트`, `프롬프트`, `벡터DB` 등
- `SUGGESTION_EXAMPLES`에 트렌드 예시 추가

### Phase 2: 트렌드 컨텍스트 전파 (Tier 1 — 기존 기능 완성)

> 현재 트렌드 컨텍스트가 질문 생성까지만 살아있고, 교체/면접/완료에서 소실됨. 이를 수정.

#### Task 2-1: 질문 교체 시 트렌드 컨텍스트 유지

**문제**: `handleReplaceSelected`에서 `/api/questions/replace`로 요청 시 `trend_topic` 미전달. 교체된 질문이 일반 질문으로 바뀜.

**파일 1**: `src/app/api/questions/replace/route.ts` (수정)

- Request body에 `trend_topic?: string` 파라미터 추가
- `generateQuestions()` 호출 시 `trendTopicId` 인자 전달

**파일 2**: `src/app/search/page.tsx` (수정)

- `handleReplaceSelected` 함수: `/api/questions/replace` 요청 body에 `trend_topic: trendTopicParam` 추가

#### Task 2-2: 면접 페이지 트렌드 배지 표시

**문제**: `interview/page.tsx`의 `convertApiSession`에서 `isTrending`, `trendTopic` 필드 미매핑. 면접 중 트렌드 표시 없음.

**파일**: `src/app/interview/page.tsx` (수정)

- `convertApiSession` 함수의 question 매핑에 `isTrending`, `trendTopic` 추가
- 질문 헤더 Badge 영역에 트렌드 배지 추가 (기존 category Badge 옆)

#### Task 2-3: 완료 페이지 트렌드 요약 + 재도전 컨텍스트 유지

**파일**: `src/app/complete/page.tsx` (수정)

- `convertApiSession`에 `isTrending`, `trendTopic` 매핑 추가
- 통계 카드에 트렌드 질문 수 표시: "트렌드 질문 N개 포함"
- "다시 풀기" 링크에 `trend_topic` 파라미터 유지

### Phase 3: 피드백 시스템 트렌드 인식 (Tier 3-A)

> 트렌드 질문에 대한 피드백이 일반 질문과 동일함. 트렌드 컨텍스트를 주입하여 전문적 피드백 제공.

#### Task 3-1: 피드백 프롬프트에 트렌드 컨텍스트 주입

**핵심 아이디어**: 피드백 프롬프트 함수에 선택적 `trendContext` 파라미터를 추가. 트렌드 질문일 때만 추가 컨텍스트 주입.

**파일 1**: `src/lib/ai/feedback-prompts.ts` (수정)

- 각 프롬프트 템플릿에 `{trend_context}` 플레이스홀더 추가
- 트렌드 질문: 해당 토픽의 `description` + `sampleAngles`를 컨텍스트로 주입
  - 예: "이 질문은 RAG 파이프라인 트렌드 토픽입니다. 벡터DB, 임베딩, 청킹 전략 관련 키워드에 주목하세요."
- 일반 질문: `{trend_context}` → 빈 문자열 (기존 동작 유지)

**파일 2**: `src/lib/ai/feedback-generator.ts` (수정)

- `generateQuickFeedback`, `generateFullFeedback`, `generateModelAnswer` 함수 시그니처에 `trendTopicId?: string` 추가
- 내부에서 `getTrendTopicById()`로 토픽 조회 → `fillPromptTemplate`에 `trend_context` 전달
- 호출부(feedback API routes)에서 answer의 question에 연결된 `trend_topic` 전달

**파일 3**: `src/app/api/answers/[id]/feedback/quick/route.ts` (수정)

- answer → question 조회 시 `trend_topic` 필드도 함께 가져옴
- `generateQuickFeedback()` 호출 시 `trendTopicId` 전달

**파일 4**: `src/app/api/answers/[id]/feedback/full/route.ts` (수정)

- 동일하게 `trend_topic` 전달

**파일 5**: `src/app/api/answers/[id]/model-answer/route.ts` (수정)

- 모범 답안 생성 시에도 트렌드 컨텍스트 반영

**예시 — 트렌드 피드백 차이:**

일반 질문 피드백:

> 기대 키워드: TCP, 3-way handshake, SYN, ACK

트렌드(RAG) 질문 피드백:

> 기대 키워드: 벡터DB, 임베딩 모델, 청킹 전략, 하이브리드 검색, 리랭킹
> 트렌드 포인트: 프로덕션 환경에서의 RAG 레이턴시 최적화와 비용 관리 관점이 부족합니다.

### Phase 4: 트렌드 랜딩 페이지 (Tier 3-B)

> SEO + 사용자 유입 퍼널. 각 트렌드 토픽의 가치를 설명하고 연습으로 연결.

#### Task 4-1: `/trends` 페이지 구현

**파일**: `src/app/trends/page.tsx` (신규)

- `case-studies/page.tsx` 패턴 참조 (필터링 + 카드 그리드)
- 각 토픽 카드에:
  - 토픽명 (한/영) + relevance 배지 (CRITICAL/HIGH/MEDIUM)
  - 설명 (`description`)
  - 질문 각도 목록 (`sampleAngles`) — "이런 질문이 나옵니다"
  - 적용 가능 면접 유형 태그
  - "연습 시작" 버튼 → `/search?trend_topic={id}` + `chipQuery`
- relevance별 필터 (전체 / CRITICAL / HIGH / MEDIUM)
- 헤더: "2026 Q1 기술면접 트렌드" + 간단한 설명

**파일**: `src/app/page.tsx` (수정)

- Quick Links에 `/trends` 링크 추가 (아카이브, 찜한 질문 옆)

### Phase 5: 트렌드 관리 체계 (추후)

- 분기별 트렌드 업데이트 프로세스 문서화
- Claude Code 웹서핑 → 트렌드 리포트 → Config PR 워크플로우
- `docs/trends/YYYY-QN-trend-report.md` 리포트 템플릿

---

## 5. Quality Gates

### 테스트 체크리스트

**Phase 1 (완료)**:

- [x] 트렌드 토픽 없이 기존 질문 생성 정상 작동 (회귀 없음)
- [x] 트렌드 토픽 선택 시 관련 컨텍스트가 프롬프트에 포함 확인
- [x] `isTrending: true` 질문이 응답에 포함 확인
- [x] 트렌드 Popover 선택 → pill 표시 → 질문 생성 E2E 확인
- [x] 모바일/데스크톱 UI 정상 표시
- [x] 타입 체크, 빌드, 린트 통과

**Phase 2 (Tier 1)**:

- [ ] 질문 교체(handleReplaceSelected) 후에도 트렌드 질문 유지
- [ ] 전체 재생성(handleRegenerateAll) 시 트렌드 컨텍스트 유지 확인
- [ ] 면접 페이지에서 트렌드 배지 표시 확인
- [ ] 완료 페이지에서 트렌드 질문 수 표시 확인
- [ ] "다시 풀기" 시 trend_topic 파라미터 유지 확인

**Phase 3 (Tier 3-A)**:

- [ ] 트렌드 질문 피드백에 토픽 관련 키워드가 기대 키워드에 포함
- [ ] 일반 질문 피드백은 기존과 동일 (회귀 없음)
- [ ] 모범 답안에 트렌드 관점 반영 확인

**Phase 4 (Tier 3-B)**:

- [ ] `/trends` 페이지 정상 렌더링
- [ ] 토픽 카드 "연습 시작" → 검색 페이지로 정상 이동
- [ ] relevance 필터 동작 확인
- [ ] 모바일 반응형 확인

### 품질 검증 명령

```bash
npm run build
npx tsc --noEmit
npx eslint src/
```

---

## 6. Risks & Dependencies

| 리스크                                                      | 영향 | 완화 방안                                                |
| ----------------------------------------------------------- | ---- | -------------------------------------------------------- |
| Claude가 `isTrending` 필드를 일관되게 반환하지 않을 수 있음 | 중간 | 프롬프트에 명시적 예시 추가 + 파싱 시 기본값 처리        |
| 트렌드 토픽이 빠르게 구식화될 수 있음                       | 낮음 | 분기별 업데이트 프로세스 + `reviewDate` 필드로 관리      |
| 프롬프트 길이 증가로 토큰 비용 상승                         | 낮음 | 트렌드 컨텍스트는 200~300 토큰 수준으로 제한             |
| 기존 면접 유형과 트렌드 선택 UX 혼동                        | 중간 | 면접 유형은 "범주", 트렌드는 "추천 토픽"으로 명확히 구분 |

### 의존성

- 기존 `InterviewTypeSelector` 컴포넌트 패턴 참조
- 기존 `Badge` 컴포넌트 (shadcn) 재사용
- `useIsMobile()` 훅 재사용

---

## 7. Rollout & Monitoring

### 배포 전략

1. Phase 1 완료 후 PR 생성
2. 코드 리뷰 후 main 머지
3. Vercel 자동 배포

### 성공 지표

- 트렌드 토픽 관련 질문 생성 요청 수 (서버 로그)
- 트렌드 칩 클릭률 (추후 이벤트 트래킹 시)
- 사용자 피드백 (카카오 오픈채팅)

---

## 8. Timeline & Milestones

| Phase | 태스크       | 작업 내용                                  | 파일 수         | 상태    |
| ----- | ------------ | ------------------------------------------ | --------------- | ------- |
| **1** | Task 1-1~1-7 | 데이터 정의, 타입, 프롬프트, API, UI, 검증 | 신규 2 + 수정 6 | ✅ 완료 |
| **2** | Task 2-1     | 질문 교체 시 trend_topic 전달              | 수정 2          |         |
| **2** | Task 2-2     | 면접 페이지 트렌드 배지                    | 수정 1          |         |
| **2** | Task 2-3     | 완료 페이지 트렌드 요약 + 재도전           | 수정 1          |         |
| **3** | Task 3-1     | 피드백 프롬프트 트렌드 컨텍스트            | 수정 5          |         |
| **4** | Task 4-1     | `/trends` 랜딩 페이지                      | 신규 1 + 수정 1 |         |

**총 변경 파일**: 신규 3개 + 수정 14개 (일부 중복)

---

## 9. References

- GitHub Issue: [#31](https://github.com/kwakseongjae/dev-interview/issues/31)
- [AI Interview Trends 2025-2026](https://www.interviewquery.com/p/ai-interview-trends-tech-hiring-2025)
- [2026년 면접장의 AI 질문 (Tech42)](https://www.tech42.co.kr)
- [한국 개발자 채용 트렌드 (Codeit Sprint)](https://sprint.codeit.kr/blog/developer-hiring-market-trends-ai-data)
- [2026 코딩 스킬 트렌드 (Codepresso)](https://blog.codepresso.io/dev-hiring-skills-2026-trend/)
- [Anthropic Prompt Engineering Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering)
- 기존 패턴 참조: `src/lib/claude.ts` (INTERVIEW_TYPE_PROMPTS), `src/components/InterviewTypeSelector.tsx`

---

## 10. Implementation Summary

**Completion Date**: 2026-02-09
**Implemented By**: Claude Opus 4.6

### Changes Made

#### 신규 파일 (4개)

- `src/data/trend-topics.ts` — 10개 트렌드 토픽 데이터, TrendTopic 인터페이스, 헬퍼 함수
- `src/components/TrendTopicChips.tsx` — TrendTopicSelector(Popover), SelectedTrendPill, TrendBadge 컴포넌트
- `src/app/trends/page.tsx` — 트렌드 랜딩 페이지 (토픽 카드 그리드, relevance 필터)
- `src/app/trends/layout.tsx` — 트렌드 페이지 SEO 메타데이터

#### 수정 파일 (18개)

**코어 — 질문 생성 파이프라인**:

- `src/types/interview.ts` — Question에 `isTrending`, `trendTopic` 필드 추가
- `src/lib/claude.ts` — `GeneratedQuestion` 타입 확장, `buildTrendInstruction()` 함수, `generateQuestions()` 시그니처에 `trendTopicId` 추가
- `src/app/api/questions/generate/route.ts` — `trend_topic` 파라미터 수신 및 전달 (초기 + 다양성 재생성)
- `src/app/api/questions/replace/route.ts` — `trend_topic` 파라미터 추가, `generateQuestions()`에 전달

**UI — 홈/검색/면접/완료**:

- `src/app/page.tsx` — TrendTopicSelector 통합 (검색 폼 내 Popover), 피처 카드 2열 (기업 사례 로고 스택 + 트렌드 칩), SAMPLE_PROMPTS 업데이트
- `src/app/search/page.tsx` — `trend_topic` URL 파라미터 수신/API 전달, 트렌드 배지 표시, `fetchQuestions` 의존성 업데이트
- `src/app/interview/page.tsx` — `convertApiSession`에 `isTrending`/`trendTopic` 매핑, 질문 헤더 트렌드 배지
- `src/app/complete/page.tsx` — 트렌드 질문 수 표시, "다시 풀기" 링크에 `trend_topic` 유지

**피드백 시스템**:

- `src/lib/ai/feedback-prompts.ts` — QUICK/FULL/MODEL_ANSWER 프롬프트에 `{trend_context}` 플레이스홀더 추가
- `src/lib/ai/feedback-generator.ts` — `buildFeedbackTrendContext()`, 함수 시그니처에 `trendTopicId?` 추가
- `src/app/api/answers/[id]/feedback/quick/route.ts` — question 조회에 `trend_topic` 포함, 피드백 함수에 전달
- `src/app/api/answers/[id]/feedback/full/route.ts` — 동일
- `src/app/api/answers/[id]/model-answer/route.ts` — 동일

**데이터 계층**:

- `src/lib/api.ts` — `ApiSessionDetail` 타입에 `is_trending`/`trend_topic` 추가
- `src/app/api/sessions/route.ts` — 질문 저장 시 `is_trending`/`trend_topic` 포함, 조회 select 확장
- `src/app/api/sessions/[id]/route.ts` — 세션 상세 조회 select에 `is_trending`/`trend_topic` 추가

**기타**:

- `src/lib/validation.ts` — AI/트렌드 키워드 18개 추가, SUGGESTION_EXAMPLES 2개 추가
- `src/app/sitemap.ts` — `/case-studies`, `/trends` 경로 추가

#### DB 마이그레이션

- `questions` 테이블에 `is_trending` (boolean, default false) + `trend_topic` (text) 컬럼 추가
- `idx_questions_is_trending` 인덱스 추가

### Quality Validation

- [x] Build: Success
- [x] Type Check: Passed
- [x] Lint: Passed (변경 파일 에러 0)
- [x] DB Migration: Applied (`add_trend_topic_to_questions`)

### Deviations from Plan

**Added** (계획에 없었으나 추가):

- 피처 카드 2열 디자인 (기업 사례 로고 스택 + 트렌드 칩) — 기존 단일 케이스 스터디 카드를 교체
- Popover 모바일 대응 (`w-[calc(100vw-2rem)] max-w-[420px]`)
- `/trends` SEO layout.tsx
- sitemap에 `/case-studies`, `/trends` 추가
- DB 마이그레이션 (질문 영속화)
- 세션 저장/조회 코드에 trend 필드 반영

**Changed** (계획과 다른 접근):

- 트렌드 칩 UI: 별도 섹션 → 검색 폼 내부 Popover + Pill 태그로 변경 (UI 정돈)
- 트렌드 선택 시 쿼리 자동 채우기 → Pill 태그 + 빈 쿼리 시 chipQuery 폴백으로 변경

**Skipped** (추후 작업):

- 트렌드 사용량 분석용 Supabase 테이블 (Tier 2)
- 아카이브 트렌드 필터 (별도 이슈)
- 분기별 트렌드 업데이트 프로세스 문서화 (Phase 5)

### Follow-up Tasks

- [ ] 트렌드 사용량 분석 테이블 추가 (어떤 토픽이 인기 있는지 데이터 수집)
- [ ] 아카이브 페이지 트렌드 필터/배지 추가
- [ ] 분기별 트렌드 업데이트 워크플로우 문서화 (`docs/trends/`)
- [ ] 2026 Q2 트렌드 토픽 업데이트

---

## QA Checklist

> Generated by qa-generator agent
> Date: 2026-02-09

### 테스트 요약

- **총 테스트 케이스**: 32개
- **우선순위별**: High 14, Medium 12, Low 6
- **예상 테스트 시간**: 50분

---

### 기능 테스트

| #     | 테스트 시나리오                           | 사전 조건                              | 테스트 단계                                                                                                     | 예상 결과                                                                           | 우선순위 |
| ----- | ----------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------- |
| FT-1  | 트렌드 토픽 선택 후 질문 생성             | 홈 페이지 접속                         | 1. 검색 폼의 트렌드 Popover 클릭<br>2. "LLM 활용 개발" 토픽 선택<br>3. Pill 태그 표시 확인<br>4. 검색 버튼 클릭 | 검색 결과 페이지에 트렌드 배지("트렌드")가 붙은 질문 표시, URL에 `trend_topic` 포함 | High     |
| FT-2  | 트렌드 토픽 미선택 시 일반 질문 생성      | 홈 페이지 접속                         | 1. 트렌드 토픽을 선택하지 않음<br>2. "React 면접 준비" 입력<br>3. 검색 버튼 클릭                                | 트렌드 배지 없는 일반 질문 생성, 기존 동작과 동일                                   | High     |
| FT-3  | 선택한 트렌드 Pill 제거                   | 트렌드 토픽 "RAG 파이프라인" 선택 상태 | 1. Pill 태그의 X 버튼 클릭                                                                                      | Pill 제거됨, 트렌드 선택 해제, 일반 질문 생성 모드로 복귀                           | High     |
| FT-4  | 질문 교체 시 트렌드 컨텍스트 유지         | 트렌드 질문이 포함된 검색 결과 페이지  | 1. 트렌드 질문 체크박스 선택<br>2. "선택 교체" 버튼 클릭                                                        | 교체된 질문에도 트렌드 배지 유지, `isTrending: true`                                | High     |
| FT-5  | 전체 재생성 시 트렌드 컨텍스트 유지       | 트렌드 토픽으로 질문 생성 완료         | 1. "전체 재생성" 버튼 클릭                                                                                      | 재생성된 질문에도 트렌드 배지 유지, `trend_topic` 파라미터 전달됨                   | High     |
| FT-6  | 면접 페이지에서 트렌드 배지 표시          | 트렌드 질문 포함 세션으로 면접 시작    | 1. 면접 시작 버튼 클릭<br>2. 질문 헤더 영역 확인                                                                | 트렌드 질문에 "트렌드" 배지 표시 (카테고리 배지 옆)                                 | High     |
| FT-7  | 완료 페이지 트렌드 요약 표시              | 트렌드 질문 포함 면접 완료             | 1. 마지막 질문 답변 후 제출<br>2. 완료 페이지 확인                                                              | "트렌드 질문 N개 포함" 통계 표시                                                    | High     |
| FT-8  | 완료 페이지 "다시 풀기" 트렌드 유지       | 트렌드 질문 포함 면접 완료 페이지      | 1. "다시 풀기" 링크 클릭                                                                                        | 검색 페이지로 이동, URL에 `trend_topic` 파라미터 포함                               | High     |
| FT-9  | 트렌드 질문에 대한 피드백 (Quick)         | 트렌드 질문에 답변 완료                | 1. 빠른 피드백 요청                                                                                             | 피드백에 트렌드 토픽 관련 키워드 포함 (예: RAG → "벡터DB", "임베딩")                | High     |
| FT-10 | 트렌드 질문에 대한 피드백 (Full)          | 트렌드 질문에 답변 완료                | 1. 상세 피드백 요청                                                                                             | 피드백에 트렌드 관점의 분석 포함, "트렌드 포인트" 코멘트 존재                       | Medium   |
| FT-11 | 트렌드 질문에 대한 모범 답안              | 트렌드 질문에 답변 완료                | 1. 모범 답안 요청                                                                                               | 모범 답안에 트렌드 토픽 키워드와 최신 관점 반영                                     | Medium   |
| FT-12 | /trends 랜딩 페이지 렌더링                | 없음                                   | 1. `/trends` 접속<br>2. 페이지 내용 확인                                                                        | "2026 Q1 기술면접 트렌드" 헤더, 10개 토픽 카드 그리드 표시                          | High     |
| FT-13 | /trends 페이지 relevance 필터             | `/trends` 접속                         | 1. "CRITICAL" 필터 클릭<br>2. "HIGH" 필터 클릭<br>3. "전체" 필터 클릭                                           | 각 필터에 맞는 토픽만 표시, 전체 클릭 시 모든 토픽 표시                             | Medium   |
| FT-14 | /trends 페이지 "연습 시작" 버튼           | `/trends` 접속                         | 1. 임의 토픽 카드의 "연습 시작" 클릭                                                                            | `/search?trend_topic={id}` + `chipQuery`로 이동, 해당 트렌드 질문 생성              | High     |
| FT-15 | 홈 피처 카드 — 기업 사례 로고 + 트렌드 칩 | 홈 페이지 접속                         | 1. 피처 카드 섹션 스크롤<br>2. 기업 사례 카드와 트렌드 카드 확인                                                | 2열 레이아웃, 기업 사례 카드에 로고 스택, 트렌드 카드에 칩 표시                     | Medium   |
| FT-16 | 검색 결과에서 트렌드 배지 표시            | 트렌드 토픽으로 질문 생성 완료         | 1. 각 질문 카드에 배지 확인                                                                                     | `isTrending: true`인 질문에만 "트렌드" 배지 표시                                    | Medium   |
| FT-17 | 트렌드 토픽 + 면접 유형 조합              | 홈 페이지 접속                         | 1. 면접 유형 "SYSTEM_DESIGN" 선택<br>2. 트렌드 토픽 "AI 에이전트" 선택<br>3. 검색 실행                          | 시스템 설계 관점의 AI 에이전트 질문 생성, 두 배지 모두 표시                         | Medium   |
| FT-18 | Popover에서 트렌드 토픽 변경              | 트렌드 토픽 "LLM 활용 개발" 선택 상태  | 1. Popover 다시 열기<br>2. "프롬프트 엔지니어링" 선택                                                           | 기존 Pill 제거, 새 Pill 표시, 새 토픽 반영                                          | Medium   |

---

### 엣지 케이스

| #    | 시나리오                                     | 테스트 단계                                                                      | 예상 결과                                                         | 우선순위 |
| ---- | -------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------- |
| EC-1 | 빈 쿼리 + 트렌드 토픽만 선택                 | 1. 검색 입력 필드 비우기<br>2. 트렌드 토픽 "RAG 파이프라인" 선택<br>3. 검색 실행 | `chipQuery` 폴백으로 자동 쿼리 설정, 질문 정상 생성               | High     |
| EC-2 | 존재하지 않는 trend_topic URL 파라미터       | 1. 브라우저 주소창에 `/search?trend_topic=invalid-topic` 직접 입력               | 에러 없이 일반 질문 생성, 트렌드 배지 미표시                      | Medium   |
| EC-3 | 트렌드 토픽 선택 후 브라우저 뒤로가기        | 1. 트렌드 질문 생성<br>2. 면접 시작<br>3. 브라우저 뒤로가기                      | 검색 결과 페이지로 복귀, 트렌드 컨텍스트 유지 또는 정상 상태 표시 | Medium   |
| EC-4 | 동시에 여러 트렌드 토픽 빠르게 전환          | 1. Popover에서 토픽 A 선택<br>2. 즉시 Popover 재열기<br>3. 토픽 B 선택           | 마지막 선택된 토픽 B만 Pill에 표시, 상태 충돌 없음                | Low      |
| EC-5 | DB에 is_trending 컬럼 없는 기존 세션 조회    | 1. 마이그레이션 이전에 생성된 세션 ID로 `/interview` 접속                        | 에러 없이 정상 렌더링, `isTrending` 기본값 false 처리             | Medium   |
| EC-6 | Claude API가 isTrending 필드를 누락하여 반환 | 1. 트렌드 토픽 선택 후 질문 생성                                                 | 파싱 시 기본값 처리 (`isTrending: false`), 앱 크래시 없음         | Medium   |
| EC-7 | 질문 0개 생성 시 트렌드 관련 UI 처리         | 1. 매우 특수한 트렌드 토픽 + 좁은 쿼리 조합<br>2. 질문 0개 반환                  | "질문을 생성하지 못했습니다" 메시지, 트렌드 관련 UI 에러 없음     | Low      |

---

### UI/UX 테스트

| #    | 확인 항목                         | 검증 방법                                        | 예상 결과                                                         | 우선순위 |
| ---- | --------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------- | -------- |
| UI-1 | Popover 모바일 반응형             | 모바일 뷰포트(375px)에서 Popover 열기            | `w-[calc(100vw-2rem)]` 적용, 화면 밖으로 넘치지 않음              | High     |
| UI-2 | Pill 태그 모바일 표시             | 모바일 뷰포트에서 트렌드 선택 후 Pill 확인       | Pill이 검색 폼 내에서 적절히 줄바꿈 또는 축소됨                   | Medium   |
| UI-3 | /trends 페이지 모바일 반응형      | 모바일 뷰포트에서 `/trends` 접속                 | 카드 그리드가 1열로 전환, 필터 버튼 가로 스크롤                   | Medium   |
| UI-4 | 피처 카드 2열 레이아웃 (데스크톱) | 1024px+ 뷰포트에서 홈 페이지 피처 카드 섹션 확인 | 기업 사례 카드와 트렌드 카드가 2열로 배치                         | Medium   |
| UI-5 | 피처 카드 모바일 (1열)            | 375px 뷰포트에서 피처 카드 섹션 확인             | 1열로 세로 배치, 로고 스택과 트렌드 칩 정상 표시                  | Low      |
| UI-6 | 트렌드 배지 색상 및 위치          | 검색 결과, 면접 페이지에서 트렌드 배지 확인      | 기존 카테고리 배지와 구분 가능, 적절한 간격                       | Low      |
| UI-7 | /trends 토픽 카드 정보 표시       | `/trends`에서 각 카드 내용 확인                  | 토픽명(한/영), relevance 배지, 설명, sampleAngles, 면접 유형 태그 | Medium   |

---

### 회귀 테스트

| #    | 기능                                   | 테스트 단계                                                                       | 예상 결과                                                  | 우선순위 |
| ---- | -------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------- | -------- |
| RT-1 | 일반 질문 생성 (트렌드 미사용)         | 1. 홈에서 트렌드 토픽 선택 없이 검색<br>2. 질문 생성 확인                         | 기존과 동일하게 질문 생성, 트렌드 배지 없음                | High     |
| RT-2 | 면접 유형 선택 기능                    | 1. CS, PROJECT, SYSTEM_DESIGN, CASE_STUDY 각각 선택<br>2. 질문 생성               | 기존 면접 유형별 질문 정상 생성                            | High     |
| RT-3 | 질문 교체 (트렌드 미사용 시)           | 1. 일반 질문 생성<br>2. 질문 선택 후 교체                                         | 교체 정상 작동, 트렌드 관련 부작용 없음                    | Medium   |
| RT-4 | 일반 질문 피드백 (Quick/Full/모범답안) | 1. 일반 질문(비트렌드)에 답변<br>2. 빠른 피드백, 상세 피드백, 모범 답안 각각 요청 | 기존과 동일한 피드백, `{trend_context}` 빈 문자열 처리     | High     |
| RT-5 | 세션 저장/조회                         | 1. 일반 질문으로 면접 완료<br>2. 아카이브에서 해당 세션 조회                      | `is_trending` default false, 세션 데이터 정상 로드         | Medium   |
| RT-6 | sitemap 기존 경로 유지                 | 1. `/sitemap.xml` 접속<br>2. 기존 경로 존재 확인                                  | 기존 페이지 경로 유지 + `/case-studies`, `/trends` 추가    | Low      |
| RT-7 | validation 기존 키워드 인식            | 1. "React hooks 면접" 검색<br>2. "TCP 네트워크 면접" 검색                         | 기존 키워드 정상 인식, 트렌드 키워드 추가로 인한 충돌 없음 | Low      |
| RT-8 | 완료 페이지 (일반 질문)                | 1. 트렌드 없이 면접 완료<br>2. 완료 페이지 확인                                   | "트렌드 질문 N개" 미표시 또는 0개로 표시, 레이아웃 정상    | Medium   |

---

### 성능 테스트

| #    | 측정 항목                        | 측정 방법                                | 기준값          | 우선순위 |
| ---- | -------------------------------- | ---------------------------------------- | --------------- | -------- |
| PT-1 | 트렌드 프롬프트 추가에 따른 지연 | 트렌드/비트렌드 질문 생성 소요 시간 비교 | 차이 500ms 이내 | Medium   |
| PT-2 | /trends 페이지 초기 로드         | DevTools Network 탭                      | FCP < 1.5s      | Low      |
| PT-3 | Popover 열기/닫기 반응성         | 트렌드 Popover 클릭 시 렌더링 시간       | < 100ms         | Low      |

---

### 크로스 브라우저/디바이스 테스트

| 브라우저      | 버전        | Popover | /trends | 트렌드 배지 | Pill 태그 |
| ------------- | ----------- | ------- | ------- | ----------- | --------- |
| Chrome        | 최신        | ⬜      | ⬜      | ⬜          | ⬜        |
| Safari        | 최신        | ⬜      | ⬜      | ⬜          | ⬜        |
| Firefox       | 최신        | ⬜      | ⬜      | ⬜          | ⬜        |
| Edge          | 최신        | ⬜      | ⬜      | ⬜          | ⬜        |
| Mobile Safari | iOS 16+     | ⬜      | ⬜      | ⬜          | ⬜        |
| Chrome Mobile | Android 12+ | ⬜      | ⬜      | ⬜          | ⬜        |

---

### 테스트 실행 가이드

1. 로컬 개발 서버 실행: `npm run dev`
2. DB 마이그레이션 적용 확인: `questions` 테이블에 `is_trending`, `trend_topic` 컬럼 존재
3. High 우선순위 테스트부터 순서대로 진행 (FT-1 ~ FT-9, EC-1, UI-1, RT-1 ~ RT-4)
4. 각 테스트 결과를 체크박스에 기록
5. 실패 시 이슈 번호와 함께 기록
6. 모바일 테스트는 Chrome DevTools 반응형 모드 또는 실제 디바이스 사용
