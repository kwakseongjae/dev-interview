# Seed Questions Command

## Description

**남는 Plan 토큰을 활용해 질문 DB를 사전에 채우는 통합 커맨드**

Claude Code가 직접:

- 📊 Supabase MCP로 카테고리/트렌드 분포 분석
- 💡 부족한 영역 자동 추천
- ✍️ Claude Code 자체가 면접 질문 생성 (Plan 토큰 활용)
- 💾 JSON 파일로 저장 (감사 추적용)
- 🗄️ Supabase MCP `execute_sql`로 DB 직접 적재

**핵심**: 별도 API 서버 불필요. Claude Code의 Plan 토큰만으로 동작.

## Usage

```
/seed-questions                        # 전체 분석 → 추천 → 생성
/seed-questions frontend 20            # 특정 카테고리 바로 생성
/seed-questions --trend rag-pipeline 10 # 특정 트렌드 토픽 바로 생성
/seed-questions --balance 100          # 전체 카테고리 균등 채우기
```

## Prerequisites

- Supabase MCP 연결 활성화 (분석 + DB 적재에 필수)

## Workflow

### Step 0: Parse Arguments

- **인자 없음**: 전체 흐름 (Analyze → Recommend → Generate)
- **`{category} {count}`**: 분석 건너뛰고 해당 카테고리 직접 생성
- **`--trend {topic_id} {count}`**: 분석 건너뛰고 해당 트렌드 토픽 직접 생성
- **`--balance {total_count}`**: 분석 후 카테고리 균등하게 배분하여 생성

직접 카테고리/트렌드 지정 시 Step 1-2를 건너뛰고 Step 3으로 직행.

---

### Step 1: ANALYZE — Supabase MCP로 현황 분석

**두 개의 SQL 쿼리를 Supabase MCP `execute_sql`로 실행:**

**쿼리 1: 카테고리별 질문 분포**

```sql
SELECT
  c.name AS category,
  c.display_name,
  COUNT(q.id) AS question_count
FROM categories c
LEFT JOIN questions q ON q.category_id = c.id
GROUP BY c.id, c.name, c.display_name
ORDER BY question_count ASC;
```

**쿼리 2: 트렌드 토픽별 질문 수**

```sql
SELECT
  trend_topic,
  COUNT(*) AS question_count
FROM questions
WHERE is_trending = true AND trend_topic IS NOT NULL
GROUP BY trend_topic
ORDER BY question_count ASC;
```

**결과를 테이블로 출력:**

```
📊 카테고리별 질문 분포
┌─────────────────┬──────────┬────────┐
│ 카테고리         │ 질문 수   │ 비율   │
├─────────────────┼──────────┼────────┤
│ MOBILE          │ 3        │ 2%     │
│ SECURITY        │ 5        │ 3%     │
│ ...             │ ...      │ ...    │
│ FRONTEND        │ 45       │ 28%    │
└─────────────────┴──────────┴────────┘
전체: {total}개

🔥 트렌드 토픽별 질문 수
알려진 트렌드 토픽: llm-app-dev, rag-pipeline, ai-agent, prompt-engineering,
event-driven, cloud-native, on-device-ai, go-rust-systems, observability, ai-dev-tools

DB에 없는 토픽 = 갭으로 표시
```

---

### Step 2: RECOMMEND — 부족 영역 추천

**추천 로직:**

1. **카테고리 갭**: 전체 평균 이하인 카테고리
2. **트렌드 갭**: 0~5개 질문인 트렌드 토픽 (특히 critical: llm-app-dev, rag-pipeline, ai-agent)
3. **최근 면접 트렌드 우선**: critical > high > medium 순

**추천 출력 후 사용자 확인 대기:**

```
💡 추천 시드 계획

1. [카테고리] MOBILE (+12개) — 평균 대비 80% 부족
2. [트렌드] rag-pipeline (+10개) — Critical 트렌드, 질문 0개
3. [트렌드] ai-agent (+8개) — Critical 트렌드, 질문 부족

총 추천: 30개

이 계획으로 진행할까요? (수정 가능)
```

---

### Step 3: GENERATE — Claude Code가 직접 질문 생성

**이 단계가 핵심입니다. Claude Code 자체가 면접 질문을 생성합니다.**

승인된 각 항목(카테고리 또는 트렌드)에 대해:

#### 3-1. 질문 생성

Claude Code가 직접 면접 질문을 생성합니다. 다음 형식의 JSON 배열로 생성:

```json
[
  {
    "content": "React의 Concurrent Mode에서 Suspense와 useTransition의 차이점과 각각의 사용 사례를 설명해주세요.",
    "hint": "Suspense, useTransition, startTransition, 긴급/비긴급 업데이트, UX 최적화",
    "category": "FRONTEND",
    "subcategory": "REACT",
    "difficulty": "MEDIUM",
    "is_trending": false,
    "trend_topic": null
  }
]
```

**질문 생성 시 반드시 따라야 할 규칙:**

1. **실전 면접 수준**: 단순 정의 질문 금지. "왜", "트레이드오프", "비교", "상황 판단" 위주
2. **hint는 답변 키워드 가이드**: 답변에 포함해야 할 핵심 개념 나열
3. **category는 DB categories 테이블의 name과 정확히 일치**: FRONTEND, BACKEND, DATABASE, CS, DEVOPS, AI/ML, ARCHITECTURE, SYSTEM_DESIGN, NETWORK, SECURITY, MOBILE
4. **subcategory 예시**: JAVASCRIPT, REACT, NODEJS, SQL, HTTP, DATA_STRUCTURE, PYTHON, DOCKER 등
5. **difficulty**: EASY(개념 설명), MEDIUM(비교/적용), HARD(설계/트레이드오프)
6. **트렌드 질문**: is_trending=true, trend_topic=해당 토픽 ID
7. **난이도 분포**: EASY 20%, MEDIUM 50%, HARD 30% 권장
8. **중복 방지**: 같은 주제를 다른 각도에서 질문 (개념, 비교, 실무, 설계)

#### 3-2. JSON 파일 저장

생성된 질문을 감사 추적용으로 파일에 저장:

```
data/seeds/seed-{날짜}-{카테고리/토픽}.json
```

예: `data/seeds/seed-2026-03-17-frontend.json`

Write 도구로 저장합니다.

#### 3-3. DB 적재 — Supabase MCP `execute_sql`

생성된 질문을 DB에 직접 INSERT합니다.

**중요**: 임베딩은 이 단계에서 생성하지 않습니다. 임베딩은 나중에 사용자가 검색할 때 또는 별도 배치로 처리합니다. 대신 `content_normalized`를 사용한 텍스트 중복 체크를 수행합니다.

**Step A: 카테고리 ID 조회**

```sql
SELECT id, name FROM categories WHERE name = '{CATEGORY_NAME}';
```

**Step B: 기존 질문과 텍스트 중복 체크**

각 질문에 대해 정규화된 텍스트로 중복 확인:

```sql
SELECT id, content FROM questions
WHERE content_normalized = '{normalized_content}'
LIMIT 1;
```

`content_normalized` = 소문자 변환 + 특수문자 제거 (`content.toLowerCase().replace(/[^a-z0-9가-힣\s]/g, "")`)

**Step C: 유니크 질문만 INSERT**

```sql
INSERT INTO questions (content, content_normalized, hint, category_id, difficulty, is_trending, trend_topic, is_verified)
VALUES
  ('질문 내용', '정규화된 내용', '힌트', '{category_id}', 'MEDIUM', false, null, false);
```

**한 번에 여러 개 INSERT 가능 (VALUES 절에 여러 행).**

중복인 질문은 INSERT에서 제외하고 스킵 카운트에 추가합니다.

---

### Step 4: REPORT — 결과 리포트

```
✅ 질문 시드 완료!

📋 생성 결과
┌──────────────────┬──────┬──────┬──────────┐
│ 항목              │ 생성  │ 저장  │ 중복 스킵 │
├──────────────────┼──────┼──────┼──────────┤
│ MOBILE           │ 12   │ 11   │ 1        │
│ rag-pipeline     │ 10   │ 10   │ 0        │
├──────────────────┼──────┼──────┼──────────┤
│ 합계              │ 22   │ 21   │ 1        │
└──────────────────┴──────┴──────┴──────────┘

💾 저장된 파일:
  - data/seeds/seed-2026-03-17-mobile.json
  - data/seeds/seed-2026-03-17-rag-pipeline.json
```

### Step 5: VERIFY (선택) — 업데이트된 분포 확인

Step 1의 쿼리를 다시 실행하여 변경 전후 비교를 보여줍니다.

---

## 질문 생성 가이드 (카테고리별)

Claude Code가 질문을 생성할 때 참고할 카테고리별 핵심 주제:

| 카테고리      | 핵심 주제                                                      |
| ------------- | -------------------------------------------------------------- |
| FRONTEND      | React, Vue, Next.js, CSS, DOM, 렌더링 최적화, 상태관리, 번들링 |
| BACKEND       | Node.js, Spring, Django, API 설계, 인증, 미들웨어, ORM         |
| DATABASE      | SQL, NoSQL, 인덱싱, 트랜잭션, 정규화, 쿼리 최적화, 캐싱        |
| CS            | 자료구조, 알고리즘, OS, 네트워크, 시간복잡도, 메모리           |
| DEVOPS        | Docker, K8s, CI/CD, AWS/GCP, IaC, 모니터링                     |
| AI/ML         | LLM, RAG, 에이전트, 임베딩, 프롬프트 엔지니어링, 파인튜닝      |
| ARCHITECTURE  | 디자인패턴, SOLID, DDD, 클린아키텍처, 이벤트 드리븐            |
| SYSTEM_DESIGN | 확장성, 캐싱, 로드밸런싱, 샤딩, 분산시스템, CAP                |
| NETWORK       | TCP/IP, HTTP/HTTPS, DNS, CDN, WebSocket, TLS                   |
| SECURITY      | OAuth, JWT, XSS, CSRF, SQL Injection, 암호화                   |
| MOBILE        | iOS, Android, React Native, Flutter, 앱 생명주기               |

## 트렌드 토픽 참조 (2026 Q1)

| ID                 | 이름                | 중요도   | 질문 각도 예시                           |
| ------------------ | ------------------- | -------- | ---------------------------------------- |
| llm-app-dev        | LLM 활용 개발       | critical | API 통합, 토큰 최적화, 할루시네이션 방지 |
| rag-pipeline       | RAG 파이프라인      | critical | 벡터 검색, 청킹, 리트리벌 설계           |
| ai-agent           | AI 에이전트         | critical | 툴 사용, 플래닝, 멀티에이전트            |
| prompt-engineering | 프롬프트 엔지니어링 | high     | Few-shot, CoT, 인젝션 방어               |
| event-driven       | 이벤트 드리븐       | high     | Kafka, CQRS, Saga, 이벤트 소싱           |
| cloud-native       | 클라우드 네이티브   | high     | K8s, IaC, 서비스 메시                    |
| on-device-ai       | 온디바이스 AI       | medium   | 양자화, 에지 추론, 모델 경량화           |
| go-rust-systems    | Go/Rust 시스템      | medium   | 고루틴, 오너십, gRPC                     |
| observability      | 관측 가능성         | medium   | OpenTelemetry, 분산 트레이싱             |
| ai-dev-tools       | AI 개발 도구        | medium   | AI 코딩 어시스턴트, 코드 품질            |

## Error Handling

- Supabase MCP 미연결: 에러 메시지 출력 후 중단
- 카테고리 ID 조회 실패: 해당 항목 스킵, 나머지 계속
- INSERT 실패: 에러 로그 출력, 나머지 항목 계속 진행
- 부분 실패 시: 성공/실패 항목을 리포트에 구분 표시

## Notes

- 임베딩은 이 커맨드에서 생성하지 않음 (Voyage API 호출 절약)
  - 사용자가 해당 카테고리를 검색할 때 시맨틱 캐시 시스템이 자동으로 임베딩 매칭
  - 필요시 별도 배치로 임베딩 추가 가능
- `data/seeds/` 디렉토리의 JSON 파일은 git에 커밋하여 이력 관리
- 같은 커맨드를 여러 번 실행해도 `content_normalized` 중복 체크로 안전
- 생성된 질문은 `is_verified: false`로 저장 (추후 검증 가능)
