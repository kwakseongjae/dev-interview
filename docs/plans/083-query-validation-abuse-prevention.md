# 083 - 비개발 면접 쿼리 어뷰징 방지 — 쿼리 검증 강화

## Overview

**Issue**: [#83](https://github.com/kwakseongjae/dev-interview/issues/83)
**Type**: Feature (보안/비용 최적화)
**Branch**: `feat/83-query-validation-abuse-prevention`

### 문제 정의

`validateInterviewInput()`의 `techKeywords` 배열에 `"면접"`, `"준비"`, `"취업"` 같은 범용 키워드가 포함되어 있어, "카페알바 면접 대비", "삼성전자 주가예측해줘 면접질문" 같은 비개발 쿼리가 8단계 검증을 모두 통과하여 Claude API 토큰을 소비함.

### 목표

- 비개발 면접 쿼리를 API 호출 전에 차단하여 토큰 비용 절감
- 기존 정상 쿼리의 false positive 최소화
- 3-Layer Cascade 방어 체계 구축

### 범위

- `src/lib/validation.ts` — 키워드 2단계 분리 + 블랙리스트
- `src/lib/query-classifier.ts` — Haiku 기반 LLM 분류기 (신규)
- `src/lib/claude.ts` — 시스템 프롬프트 가드레일
- `src/app/api/questions/generate/route.ts` — Layer 2 통합

---

## Requirements

### 기능 요구사항

- **FR-1**: 비개발 직무 키워드(알바, 공무원, 승무원 등) 포함 + 기술 키워드 미포함 시 즉시 차단
- **FR-2**: 범용 키워드(면접, 준비, 취업)만 있고 기술 키워드가 없는 쿼리 차단
- **FR-3**: Layer 1 통과 쿼리에 대해 Haiku 분류기로 2차 검증
- **FR-4**: 프롬프트 가드레일로 최종 방어 (Layer 1, 2 우회 시)
- **FR-5**: 차단 시 사용자에게 올바른 사용 방법 안내 메시지 표시

### 기술 요구사항

- **TR-1**: Layer 2 분류기는 fail-open 패턴 (장애 시 쿼리 허용)
- **TR-2**: 분류기 타임아웃 3초, 추가 레이턴시 ~300ms 이내
- **TR-3**: 분류기 비용 ~$0.0004/쿼리 (Sonnet 생성의 1/100)
- **TR-4**: 기존 `InputValidationResult` 인터페이스와 422 응답 패턴 호환

### 비기능 요구사항

- **NFR-1**: 기존 정상 쿼리 ("프론트엔드 3년차 기술면접", "React 면접 질문") 100% 정상 통과
- **NFR-2**: 비개발 쿼리 차단율 ~99% (3개 레이어 조합)
- **NFR-3**: 빌드, 타입체크, 린트 모두 통과

---

## Architecture & Design

### 3-Layer Cascade 방어 체계

```
쿼리 입력
  │
  ▼
┌─────────────────────────────────────────────┐
│ Layer 1: 키워드 기반 사전 필터               │
│ (FREE, <1ms)                                │
│                                             │
│ ① 비개발 블랙리스트 매치 + 기술키워드 없음   │
│    → 즉시 차단                               │
│ ② 범용 키워드만 + 기술키워드 없음            │
│    → 즉시 차단                               │
│ ③ 기술키워드 1개 이상 → 통과                 │
└─────────────┬───────────────────────────────┘
              │ 통과
              ▼
┌─────────────────────────────────────────────┐
│ Layer 2: Haiku 분류기                        │
│ (~$0.0004, ~300ms)                          │
│                                             │
│ - "이 쿼리가 개발자 기술면접인가?" 이진 분류  │
│ - tool_use로 structured output 보장          │
│ - confidence > 0.7 && !isDevInterview → 차단 │
│ - 실패 시 fail-open (쿼리 허용)              │
└─────────────┬───────────────────────────────┘
              │ 통과
              ▼
┌─────────────────────────────────────────────┐
│ Layer 3: 프롬프트 가드레일                    │
│ ($0 추가비용, +0ms)                          │
│                                             │
│ - Sonnet 시스템 프롬프트에 거절 지시 추가     │
│ - 비개발 요청 시 빈 배열 반환                 │
└─────────────┬───────────────────────────────┘
              │ 통과
              ▼
         질문 생성 (Sonnet)
```

### 차단 시나리오 매핑

| 쿼리                                | L1                             | L2        | L3       |
| ----------------------------------- | ------------------------------ | --------- | -------- |
| "카페알바 면접 대비"                | **차단** (블랙리스트)          | -         | -        |
| "삼성전자 주가예측해줘 면접질문"    | **차단** (블랙리스트+기술없음) | -         | -        |
| "면접 준비" (단독)                  | **차단** (범용만)              | -         | -        |
| "승무원 서비스 면접 React"          | 통과                           | **차단**  | -        |
| "React 배우고 싶어요 주식도 알려줘" | 통과                           | **차단**  | -        |
| 정교한 프롬프트 인젝션              | 통과                           | 통과 가능 | **차단** |
| "프론트엔드 3년차 기술면접"         | 통과                           | 통과      | 통과 ✅  |
| "React 면접 질문"                   | 통과                           | 통과      | 통과 ✅  |
| "Python 알고리즘 면접"              | 통과                           | 통과      | 통과 ✅  |

### 설계 결정

**D-1: 왜 3개 레이어인가?**

- Layer 1만으로는 ~75% 차단율 (키워드 우회 쉬움)
- Layer 2만으로는 비용/레이턴시 발생 (모든 쿼리에 API 호출)
- Layer 1이 명백한 것을 걸러내고, Layer 2가 애매한 것을 처리하는 cascade가 최적

**D-2: 왜 Haiku인가?**

- 분류 작업에 Sonnet은 과잉 — Haiku로 충분한 정확도(~95%)
- 비용: ~$0.0004/쿼리 (Sonnet $0.01~0.05의 1/100)
- 레이턴시: ~300ms (Sonnet 2-5초 대비 빠름)

**D-3: 왜 fail-open인가?**

- 분류기 장애 시 정상 사용자 차단은 UX 손실이 큼
- 어뷰징 쿼리가 가끔 통과하는 것보다 정상 쿼리가 차단되는 것이 더 나쁨
- Rate limiting이 이미 존재하여 대량 어뷰징은 별도로 방어됨

**D-4: 임베딩 기반 유사도 왜 불채택?**

- mistakes.md 기록(2026-03-17): 메타 쿼리와 콘텐츠 간 시맨틱 갭 문제
- "카페 면접"과 "개발자 면접"이 임베딩 공간에서 가까워 구분 어려움

**D-5: 한국어 형태소 분석 왜 불채택?**

- JS/TS 생태계에 성숙한 한국어 NLP 라이브러리 부재
- Haiku가 한국어 네이티브 이해 — 띄어쓰기/복합어 문제 자동 해결

---

## Implementation Plan

### Phase 1: Layer 1 — 키워드 2단계 분리 + 블랙리스트

**파일**: `src/lib/validation.ts`

**작업 내용**:

1. `techKeywords`에서 범용 키워드 분리

   ```typescript
   // 범용 키워드 — 단독으로는 기술 키워드 역할 불가
   const GENERIC_KEYWORDS = [
     "면접",
     "준비",
     "취업",
     "이직",
     "신입",
     "경력",
     "기술",
   ];

   // 순수 기술 키워드 — 기존 techKeywords에서 GENERIC_KEYWORDS 제외
   const DEV_DOMAIN_KEYWORDS = [
     // 직무
     "개발",
     "개발자",
     "프론트",
     "백엔드",
     "풀스택",
     "데브옵스",
     "인프라",
     "ios",
     "android",
     "모바일",
     "코딩",
     "프로그래밍",
     // 기술 스택 (기존 유지)
     "javascript",
     "typescript",
     "react" /* ... 나머지 동일 ... */,
   ];
   ```

2. 비개발 도메인 블랙리스트 추가 (기존 Step 5 이후에 삽입)

   ```typescript
   const NON_DEV_BLACKLIST = [
     // 비개발 직무
     /(알바|아르바이트|파트타임|카페|편의점|마트|배달|서빙|캐셔|매장)/,
     // 비기술 도메인
     /(주가|주식|코인|부동산|투자|재테크|펀드|보험)/,
     /(다이어트|요리|레시피|운동|헬스|미용|네일)/,
     // 비개발 직군 면접
     /(승무원|간호사|공무원|경찰|소방|군대|입대|군인)/,
     /(마케팅|영업|회계|인사|총무|비서|사무직)/,
     // 비기술 면접 유형
     /(자소서|자기소개서|인성면접|임원면접|PT면접)/,
   ];
   ```

3. 검증 로직 변경 (Step 7, 8 리팩토링)

   ```typescript
   const hasDevKeyword = DEV_DOMAIN_KEYWORDS.some(k => queryLower.includes(k));
   const hasGenericKeyword = GENERIC_KEYWORDS.some(k => queryLower.includes(k));
   const hasNonDevBlacklist = NON_DEV_BLACKLIST.some(p => p.test(queryLower));

   // 비개발 블랙리스트 매치 + 기술 키워드 없음 → 차단
   if (hasNonDevBlacklist && !hasDevKeyword) { ... }

   // 범용 키워드만 있고 기술 키워드 없음 → 차단
   if (hasGenericKeyword && !hasDevKeyword && trimmedQuery.length < 30) { ... }
   ```

### Phase 2: Layer 2 — Haiku 분류기

**파일**: `src/lib/query-classifier.ts` (신규)

**작업 내용**:

1. `classifyQueryTopic()` 함수 구현
   - Claude Haiku `claude-haiku-4-5-20250315` 모델 사용
   - `tool_use`로 structured output 보장
   - `tool_choice: { type: "tool", name: "classify_query" }` (강제 tool 호출)

2. `safeClassifyQuery()` 래퍼 함수
   - 3초 타임아웃
   - fail-open 패턴 (에러 시 쿼리 허용)
   - 에러 로깅 (`console.warn`)

3. 분류기 시스템 프롬프트

   ```
   개발자 기술면접 서비스의 쿼리 분류기입니다.
   소프트웨어 개발/엔지니어링/CS/IT 기술직 면접 질문 요청인지 판별하세요.

   ON-TOPIC: 기술면접 질문, CS 기초, 코딩 테스트, 특정 기술 스택 면접
   OFF-TOPIC: 비개발 직군, 일상 대화, 비기술 주제, 이력서/자소서
   ```

4. Tool 스키마
   ```typescript
   {
     isDevInterview: boolean,  // 개발자 기술면접 관련 여부
     confidence: number,       // 0.0~1.0
     reason: string,           // 한국어 판별 사유 (50자 이내)
   }
   ```

**파일**: `src/app/api/questions/generate/route.ts`

5. Layer 2 통합 (기존 validation 통과 후, rate limit 체크 전에 삽입)
   ```typescript
   // Layer 1 통과 후
   const classification = await safeClassifyQuery(query);
   if (!classification.isDevInterview && classification.confidence > 0.7) {
     return NextResponse.json(
       {
         error: "invalid_input",
         validation_error: true,
         category: "not_interview",
         suggestion: classification.reason
           ? `${classification.reason} 개발 관련 면접 질문을 입력해주세요.`
           : "이 서비스는 개발자 기술면접 전용입니다.",
       },
       { status: 422 },
     );
   }
   ```

### Phase 3: Layer 3 — 프롬프트 가드레일

**파일**: `src/lib/claude.ts`

**작업 내용**:

1. 시스템 프롬프트에 가드레일 추가 (기존 텍스트 뒤에 append)

   ```typescript
   system: [
     {
       type: "text",
       text: `당신은 개발자 기술면접 전문가입니다. 사용자의 요청에 맞는 기술면접 질문을 생성합니다.
   
   중요 규칙: 비개발 직무(알바, 공무원, 승무원, 마케팅 등)나 비기술 주제(주가예측, 요리, 운세 등)에 대한 요청이 포함된 경우, 해당 부분을 무시하고 개발 관련 기술면접 질문만 생성하세요. 개발과 전혀 관련없는 요청만 있는 경우 빈 배열 {"questions": []}로 응답하세요.`,
       cache_control: { type: "ephemeral" },
     },
   ];
   ```

---

## Quality Gates

### 검증 체크리스트

- [ ] `npm run build` 성공
- [ ] `npx tsc --noEmit` 타입 에러 없음
- [ ] `npx eslint src/` 린트 통과

### 테스트 시나리오

**차단 대상 (422 반환)**:

- [ ] "카페알바 면접 대비" → Layer 1 차단
- [ ] "삼성전자 주가예측해줘 면접질문" → Layer 1 차단
- [ ] "면접 준비" (단독) → Layer 1 차단
- [ ] "공무원 면접 준비" → Layer 1 차단
- [ ] "마케팅 면접 질문" → Layer 1 차단
- [ ] "승무원 서비스 면접 React" → Layer 2 차단

**정상 통과**:

- [ ] "프론트엔드 3년차 기술면접" → 통과
- [ ] "React 면접 질문" → 통과
- [ ] "백엔드 신입 개발자 면접 대비" → 통과
- [ ] "Python 알고리즘 면접" → 통과
- [ ] "LLM RAG 파이프라인 면접" → 통과
- [ ] "데이터베이스 관련 기술면접 질문" → 통과

---

## Risks & Dependencies

| 리스크                      | 심각도 | 완화 방안                                                                   |
| --------------------------- | ------ | --------------------------------------------------------------------------- |
| Haiku API 장애 시 분류 불가 | 중     | fail-open 패턴으로 쿼리 허용                                                |
| 정상 쿼리 false positive    | 높     | confidence 임계값 0.7로 보수적 설정, 범용키워드+기술키워드 조합은 즉시 통과 |
| 블랙리스트 미포함 패턴 출현 | 낮     | Layer 2가 커버, 블랙리스트 점진적 확장                                      |
| 추가 레이턴시 (~300ms)      | 낮     | Layer 1에서 대부분 걸러져 Layer 2 호출 빈도 낮음                            |

### 의존성

- `@anthropic-ai/sdk` — 이미 설치됨, Haiku 모델 호출에 동일 SDK 사용
- `ANTHROPIC_API_KEY` — 이미 설정됨, Haiku와 Sonnet 동일 키 사용

---

## Rollout & Monitoring

### 배포 전략

- 단일 PR로 3개 Layer 모두 배포
- Layer 1, 3은 리스크 없음 (키워드 + 프롬프트 변경)
- Layer 2는 fail-open이므로 장애 시에도 기존 동작 유지

### 성공 지표

- 비개발 쿼리 차단율 향상 (현재 ~50% → 목표 ~99%)
- Claude API 불필요 호출 감소
- 정상 쿼리 false positive 0건

---

## Timeline & Milestones

| 단계    | 내용                                              | 예상 |
| ------- | ------------------------------------------------- | ---- |
| Phase 1 | Layer 1: validation.ts 키워드 분리 + 블랙리스트   | 핵심 |
| Phase 2 | Layer 2: query-classifier.ts 신규 + route.ts 통합 | 핵심 |
| Phase 3 | Layer 3: claude.ts 프롬프트 가드레일              | 보조 |
| QA      | 차단/통과 시나리오 검증 + 빌드 확인               | 필수 |

---

## References

- [Issue #83](https://github.com/kwakseongjae/dev-interview/issues/83)
- [LLM Guardrails Best Practices - Datadog](https://www.datadoghq.com/blog/llm-guardrails-best-practices/)
- [Off-Topic Prompt Guardrail - GovTech Singapore](https://medium.com/dsaid-govtech/open-sourcing-an-off-topic-prompt-guardrail-fde422a66152)
- [Claude Structured Outputs - Anthropic Docs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- mistakes.md: 임베딩 유사도 갭 (2026-03-17), Claude 모델 ID 확인 필수 (2026-03-17)

---

## Implementation Summary

**Completion Date**: 2026-04-03
**Implemented By**: Claude Opus 4.6

### Changes Made

#### Files Modified

- [src/lib/validation.ts](src/lib/validation.ts) — `techKeywords`를 `GENERIC_KEYWORDS`(7개) + `DEV_DOMAIN_KEYWORDS`(97개)로 분리, `NON_DEV_BLACKLIST`(6개 패턴) 추가, Step 7~10 리팩토링
- [src/lib/query-classifier.ts](src/lib/query-classifier.ts) — **신규** Haiku 4.5 기반 쿼리 분류기, `safeClassifyQuery()` fail-open 래퍼, `CLASSIFIER_CONFIDENCE_THRESHOLD` 상수
- [src/app/api/questions/generate/route.ts](src/app/api/questions/generate/route.ts) — Layer 2 분류기 통합 (AI Rate Limit 이후 위치)
- [src/lib/claude.ts](src/lib/claude.ts) — 시스템 프롬프트에 비개발 쿼리 거절 가드레일 추가

#### Key Implementation Details

- **Layer 1**: `GENERIC_KEYWORDS`(면접, 준비, 취업 등)는 단독으로 기술 키워드 역할 불가. `NON_DEV_BLACKLIST` + `!hasDevKeyword` 조합으로 즉시 차단
- **Layer 2**: Haiku `tool_use`로 structured output 보장, `tool_choice: { type: "tool" }` 강제 호출, 3초 타임아웃, fail-open 패턴
- **Layer 3**: 기존 시스템 프롬프트에 가드레일 append, `cache_control: ephemeral` 유지
- **코드 리뷰 반영**: Haiku 호출 위치를 Rate Limit 이후로 이동 (불필요한 API 비용 방지), confidence 임계값 상수 추출

### Quality Validation

- [x] Build: Success
- [x] Type Check: Passed (0 errors)
- [x] Lint: Passed (0 errors, 기존 warning 1건 — 본 작업과 무관)

### Deviations from Plan

**Added**:

- `CLASSIFIER_CONFIDENCE_THRESHOLD` 상수 export (코드 리뷰 반영)
- Haiku 호출 위치를 AI Rate Limit 이후로 조정 (코드 리뷰 반영)

**Changed**: 없음

**Skipped**: 없음

### Performance Impact

- Bundle size: 서버 전용 코드, 클라이언트 번들 영향 없음
- 추가 레이턴시: Layer 1 차단 시 0ms, Layer 2 호출 시 ~300ms (Layer 1 통과 쿼리만)

---

## QA Checklist

> Generated by qa-generator agent
> Date: 2026-04-03

### 테스트 요약

- **총 테스트 케이스**: 30개
- **우선순위별**: High 12, Medium 12, Low 6

### 기능 테스트 — Layer 1 차단

| #    | 테스트 시나리오                  | 예상 결과                                             | 우선순위 |
| ---- | -------------------------------- | ----------------------------------------------------- | -------- |
| FT-1 | "카페알바 면접 대비"             | 422, NON_DEV_BLACKLIST(알바) + DEV 키워드 없음 → 차단 | High     |
| FT-2 | "삼성전자 주가예측해줘 면접질문" | 422, NON_DEV_BLACKLIST(주가) + DEV 키워드 없음 → 차단 | High     |
| FT-3 | "면접 준비" (단독)               | 422, GENERIC만 + length < 30 + DEV 없음 → 차단        | High     |
| FT-4 | "공무원 면접 준비"               | 422, NON_DEV_BLACKLIST(공무원) → 차단                 | High     |
| FT-5 | "마케팅 면접 질문"               | 422, NON_DEV_BLACKLIST(마케팅) → 차단                 | High     |
| FT-6 | "자소서 작성 도와줘"             | 422, NON_DEV_BLACKLIST(자소서) → 차단                 | High     |

### 기능 테스트 — Layer 2 Haiku 차단

| #    | 테스트 시나리오            | 예상 결과                                              | 우선순위 |
| ---- | -------------------------- | ------------------------------------------------------ | -------- |
| FT-7 | "승무원 서비스 면접 React" | L1 통과(react 있음), L2 Haiku에서 off-topic 판별 → 422 | High     |

### 기능 테스트 — 정상 통과

| #     | 테스트 시나리오                | 예상 결과                     | 우선순위 |
| ----- | ------------------------------ | ----------------------------- | -------- |
| FT-8  | "프론트엔드 3년차 기술면접"    | 200, "프론트" DEV 키워드 매치 | High     |
| FT-9  | "React 면접 질문"              | 200, "react" DEV 키워드 매치  | High     |
| FT-10 | "백엔드 신입 개발자 면접 대비" | 200, "백엔드"+"개발자" 매치   | High     |
| FT-11 | "Python 알고리즘 면접"         | 200, "python"+"알고리즘" 매치 | Medium   |
| FT-12 | "LLM RAG 파이프라인 면접"      | 200, "llm"+"rag" 매치         | Medium   |

### 엣지 케이스

| #    | 테스트 시나리오                                    | 예상 결과                                         | 우선순위 |
| ---- | -------------------------------------------------- | ------------------------------------------------- | -------- |
| EC-1 | 30자+ 범용 키워드만 긴 쿼리                        | L1 규칙8 미적용, L2 Haiku에서 차단                | Medium   |
| EC-2 | "React 카페 POS 시스템 면접" (DEV+블랙리스트 혼합) | 통과 (DEV 키워드 있으므로 블랙리스트 bypass)      | Medium   |
| EC-3 | 빈 쿼리 `""`                                       | 400, "검색 쿼리는 필수입니다"                     | Medium   |
| EC-6 | Haiku 분류기 타임아웃                              | fail-open: DEFAULT_ALLOW 반환, 쿼리 정상 처리     | High     |
| EC-7 | Haiku API 에러                                     | fail-open: DEFAULT_ALLOW 반환, 서비스 가용성 유지 | High     |

### 회귀 테스트

| #    | 테스트 시나리오             | 예상 결과                                                     | 우선순위 |
| ---- | --------------------------- | ------------------------------------------------------------- | -------- |
| RT-1 | 기존 유효 쿼리 정상 작동    | 200, 기존과 동일한 응답 구조                                  | High     |
| RT-2 | Rate Limiting 정상 작동     | 429, Rate Limit이 Layer 2 이전에 실행됨                       | Medium   |
| RT-3 | 422 에러 응답 형식 유지     | `{ error, validation_error, category, suggestion }` 형식 호환 | Medium   |
| RT-4 | 클라이언트 에러 핸들링 호환 | suggestion 메시지 UI에 정상 표시                              | Medium   |

### curl 예시

```bash
# Layer 1 차단 테스트
curl -X POST http://localhost:3000/api/questions/generate \
  -H "Content-Type: application/json" \
  -d '{"query":"카페알바 면접 대비"}'

# 정상 통과 테스트
curl -X POST http://localhost:3000/api/questions/generate \
  -H "Content-Type: application/json" \
  -d '{"query":"React 면접 질문"}'
```
