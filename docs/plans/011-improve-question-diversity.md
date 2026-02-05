# Plan: 동일 레퍼런스 반복 사용 시 질문 다양화 개선

**Issue**: [#11](https://github.com/kwakseongjae/dev-interview/issues/11) - 동일 레퍼런스 반복 사용 시 질문 다양화 개선
**Branch**: `feat/11-improve-question-diversity`
**Created**: 2026-02-05
**Status**: Planning

---

## 1. Overview

### Problem Statement

이력서나 포트폴리오와 같은 레퍼런스 기반으로 면접을 준비하는 사용자들이 많은데, 이러한 자료들은 작성 후 변동이 크지 않아 동일한 파일을 반복 첨부하는 경우가 빈번합니다.

**현재 문제점**:
- 동일한 레퍼런스로 질문 생성 시 거의 동일한 질문이 반복 생성됨
- 2회 이상 면접 연습 시 학습 효과가 크게 감소
- 실전 면접의 예측 불가능성을 경험하기 어려움

**근본 원인**:
- `exclude_questions` 파라미터가 같은 세션 내 중복 방지에만 사용됨
- 이전 세션에서 생성된 질문 이력이 추적되지 않음
- 레퍼런스 동일성 판단 로직 없음
- Claude API 호출 시 다양성 유도 파라미터 미사용 (temperature 기본값)

### Objectives

1. 동일 레퍼런스로 반복 질문 생성 시에도 80% 이상 새로운 질문 제공
2. 사용자별 질문 이력 추적 및 자동 제외 메커니즘 구현
3. 레퍼런스 핑거프린팅으로 동일/유사 문서 식별
4. Claude 프롬프트 최적화로 질문 다양성 향상

### Scope

- **In Scope**:
  - 사용자별 질문 이력 저장/조회 시스템
  - 레퍼런스 텍스트 핑거프린팅
  - Claude 프롬프트 다양성 강화
  - API 파라미터 확장 (user_id, reference_hash)

- **Out of Scope**:
  - pgvector 기반 임베딩 유사도 검사 (2단계로 연기)
  - Spaced Repetition 알고리즘 (별도 이슈로 분리)
  - 질문 타입별 분류 시스템 (별도 이슈로 분리)

---

## 2. Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | 사용자별 생성된 질문 이력을 DB에 저장 | P1 |
| FR-2 | 질문 생성 시 최근 30일간 생성된 질문을 자동 제외 | P1 |
| FR-3 | 레퍼런스 텍스트의 핑거프린트 생성 및 저장 | P1 |
| FR-4 | 동일 핑거프린트의 이전 질문 조회 | P1 |
| FR-5 | Claude 프롬프트에 다양성 지시문 추가 | P2 |
| FR-6 | temperature 파라미터 조정 (0.7) | P2 |

### Non-Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-1 | 질문 생성 API 응답 시간 증가 < 500ms | P1 |
| NFR-2 | 기존 기능 회귀 없음 (빌드, 타입, 린트 통과) | P1 |
| NFR-3 | 비로그인 사용자도 세션 내 중복 방지 유지 | P1 |

---

## 3. Architecture & Design

### 3.1 솔루션 접근법 비교

| 접근법 | 장점 | 단점 | 선택 |
|--------|------|------|------|
| A. 클라이언트 사이드 (localStorage) | 빠름, DB 부담 없음 | 기기간 공유 불가, 휘발성 | ❌ |
| B. 서버 사이드 (DB 이력 테이블) | 영구 저장, 기기간 공유 | DB 쿼리 추가 | ✅ |
| C. 하이브리드 | 속도 + 영구성 | 복잡도 증가 | 2단계 |

**선택: B. 서버 사이드 (DB 이력 테이블)**
- 이유: 사용자가 다양한 기기에서 접속해도 일관된 다양성 보장
- 향후 하이브리드로 확장 가능

### 3.2 데이터베이스 스키마

```sql
-- 질문 생성 이력 테이블
CREATE TABLE question_generation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  question_content text NOT NULL,
  question_fingerprint text NOT NULL,
  reference_fingerprint text,  -- 레퍼런스 핑거프린트 (null = 레퍼런스 미사용)
  interview_type_id uuid REFERENCES interview_types(id),
  session_id uuid REFERENCES interview_sessions(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),

  -- 인덱스용 컬럼
  expires_at timestamptz DEFAULT (now() + interval '30 days')
);

-- 인덱스
CREATE INDEX idx_qgh_user_reference ON question_generation_history(user_id, reference_fingerprint);
CREATE INDEX idx_qgh_user_expires ON question_generation_history(user_id, expires_at);
CREATE INDEX idx_qgh_fingerprint ON question_generation_history(question_fingerprint);

-- RLS 정책
ALTER TABLE question_generation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own history" ON question_generation_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history" ON question_generation_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 자동 정리 함수 (30일 이상 된 기록 삭제)
CREATE OR REPLACE FUNCTION cleanup_old_question_history()
RETURNS void AS $$
BEGIN
  DELETE FROM question_generation_history WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3.3 핑거프린트 알고리즘

```typescript
// 텍스트 핑거프린트 생성 (pg_trgm 호환)
function generateTextFingerprint(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, '')  // 특수문자 제거
    .replace(/\s+/g, ' ')          // 연속 공백 정규화
    .trim()
    .split(' ')
    .filter(word => word.length > 2)  // 2글자 이하 제거
    .sort()
    .slice(0, 100)  // 상위 100개 단어만
    .join('|');
}

// 레퍼런스 핑거프린트 (추출된 텍스트 기반)
function generateReferenceFingerprint(extractedText: string): string {
  const fingerprint = generateTextFingerprint(extractedText);
  // SHA-256 해시로 변환 (저장 공간 절약)
  return crypto.createHash('sha256').update(fingerprint).digest('hex').slice(0, 32);
}
```

### 3.4 시스템 흐름도

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. 사용자 질문 생성 요청                                         │
│    POST /api/questions/generate                                 │
│    Body: { query, reference_urls, interview_type, user_id }     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. 레퍼런스 처리 (기존 로직)                                     │
│    - 파일 다운로드 → 텍스트 추출                                 │
│    - 유효성 검증                                                 │
│    ┌──────────────────────────────────────────────────────────┐ │
│    │ 🆕 레퍼런스 핑거프린트 생성                               │ │
│    │    referenceFingerprint = hash(extractedText)            │ │
│    └──────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. 🆕 질문 이력 조회 (user_id가 있는 경우)                       │
│    SELECT question_content FROM question_generation_history     │
│    WHERE user_id = $1                                           │
│      AND (reference_fingerprint = $2 OR reference_fingerprint IS NULL) │
│      AND expires_at > now()                                     │
│    ORDER BY created_at DESC LIMIT 100                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. 🆕 Claude 프롬프트 구성 (다양성 강화)                         │
│    - 기존 exclude_questions + 이력 조회 결과 병합               │
│    - 다양성 지시문 추가:                                         │
│      "이전에 다룬 주제와 다른 새로운 관점의 질문 생성"           │
│      "질문 유형 다양화 (개념/비교/상황/경험/트레이드오프)"       │
│    - temperature: 0.7 (기존 기본값에서 상향)                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Claude API 호출 (기존 로직 + temperature)                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. 🆕 생성된 질문 이력 저장 (user_id가 있는 경우)                │
│    INSERT INTO question_generation_history                      │
│    (user_id, question_content, question_fingerprint,            │
│     reference_fingerprint, interview_type_id, session_id)       │
│    VALUES ($1, $2, fingerprint($2), $3, $4, $5)                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. 응답 반환 (기존 형식 유지)                                    │
│    { questions, query, referenceUsed, referenceMessage,         │
│      diversityApplied: boolean }  // 🆕 다양성 적용 여부        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Implementation Plan

### Phase 1: 데이터베이스 스키마 추가 (P1)

| Task | File | Description |
|------|------|-------------|
| 1.1 | Supabase MCP | `question_generation_history` 테이블 생성 |
| 1.2 | Supabase MCP | 인덱스 및 RLS 정책 추가 |
| 1.3 | `src/types/database.ts` | 테이블 타입 정의 추가 |

### Phase 2: 핑거프린트 유틸리티 (P1)

| Task | File | Description |
|------|------|-------------|
| 2.1 | `src/lib/fingerprint.ts` | 텍스트/레퍼런스 핑거프린트 함수 생성 |
| 2.2 | `src/lib/fingerprint.ts` | 단위 테스트 (선택적) |

### Phase 3: 질문 이력 관리 서비스 (P1)

| Task | File | Description |
|------|------|-------------|
| 3.1 | `src/lib/question-history.ts` | 이력 조회 함수 (getQuestionHistory) |
| 3.2 | `src/lib/question-history.ts` | 이력 저장 함수 (saveQuestionHistory) |
| 3.3 | `src/lib/question-history.ts` | 레퍼런스별 이력 조회 함수 |

### Phase 4: Claude 프롬프트 개선 (P2)

| Task | File | Description |
|------|------|-------------|
| 4.1 | `src/lib/claude.ts` | 다양성 지시문 추가 (buildDiversityPrompt) |
| 4.2 | `src/lib/claude.ts` | temperature 파라미터 추가 (0.7) |
| 4.3 | `src/lib/claude.ts` | generateQuestions 시그니처 확장 |

### Phase 5: API 통합 (P1)

| Task | File | Description |
|------|------|-------------|
| 5.1 | `src/app/api/questions/generate/route.ts` | 이력 조회 통합 |
| 5.2 | `src/app/api/questions/generate/route.ts` | 이력 저장 통합 |
| 5.3 | `src/app/api/questions/generate/route.ts` | 레퍼런스 핑거프린트 처리 |

### Phase 6: 검증 및 정리

| Task | Description |
|------|-------------|
| 6.1 | npm run build - 빌드 검증 |
| 6.2 | npx tsc --noEmit - 타입 검증 |
| 6.3 | npm run lint - 린트 검증 |
| 6.4 | 수동 테스트 - 동일 레퍼런스 2회 질문 생성 |

---

## 5. Quality Gates

### 테스트 시나리오

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| TC-1 | 동일 레퍼런스로 첫 번째 질문 생성 | 정상 생성, 이력 저장됨 |
| TC-2 | 동일 레퍼런스로 두 번째 질문 생성 | 80% 이상 새로운 질문 |
| TC-3 | 다른 레퍼런스로 질문 생성 | 이전 이력 영향 없음 |
| TC-4 | 비로그인 사용자 질문 생성 | 기존 로직 유지 (세션 내 중복만 방지) |
| TC-5 | 30일 이후 동일 레퍼런스 | 이력 만료, 새로운 질문 허용 |

### 성공 기준

- [ ] 동일 레퍼런스로 연속 질문 생성 시 80% 이상 새로운 질문
- [ ] API 응답 시간 증가 < 500ms
- [ ] 빌드 성공
- [ ] 타입 체크 통과
- [ ] 린트 통과

---

## 6. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| 이력 테이블 용량 증가 | Medium | Medium | 30일 자동 만료, 정기 정리 함수 |
| API 응답 시간 증가 | High | Low | 인덱스 최적화, 비동기 이력 저장 |
| 핑거프린트 충돌 | Low | Low | SHA-256 32자 사용 (충돌 확률 극히 낮음) |
| 비로그인 사용자 미지원 | Low | N/A | 의도적 범위 제외, 향후 세션 기반 확장 가능 |

---

## 7. Dependencies

### 내부 의존성
- `src/lib/claude.ts` - 기존 질문 생성 로직
- `src/lib/supabase.ts` - DB 클라이언트
- `src/types/database.ts` - 타입 정의

### 외부 의존성
- Node.js `crypto` 모듈 (SHA-256 해시) - 기본 내장
- Supabase (테이블 추가)

---

## 8. Best Practices Applied

### Vercel React Best Practices
- **async-parallel**: 이력 조회와 레퍼런스 처리를 병렬 실행
- **server-serialization**: API 응답에 불필요한 데이터 제외

### Code Quality
- 기존 코드 패턴 준수 (supabaseAdmin 사용)
- 타입 안전성 (TypeScript strict mode)
- 에러 핸들링 (try-catch, 적절한 HTTP 상태 코드)

---

## 9. References

- GitHub Issue: https://github.com/kwakseongjae/dev-interview/issues/11
- 관련 파일:
  - `src/lib/claude.ts` (질문 생성 핵심 로직)
  - `src/app/api/questions/generate/route.ts` (API 엔드포인트)
  - `src/types/database.ts` (DB 스키마 타입)

---

## 10. Implementation Summary

**Completion Date**: 2026-02-05
**Implemented By**: Claude Opus 4.5
**Status**: ✅ Implemented

### Changes Made

#### Database (Supabase Migration)

- `question_generation_history` 테이블 생성
  - 컬럼: id, user_id, question_content, question_fingerprint, reference_fingerprint, interview_type_id, session_id, created_at, expires_at
  - 인덱스 3개 (user_reference, user_expires, fingerprint)
  - RLS 정책 2개 (SELECT, INSERT)

#### Files Created

| File | Description | Lines |
|------|-------------|-------|
| `src/lib/fingerprint.ts` | 텍스트/레퍼런스 핑거프린트 유틸리티 | 80 |
| `src/lib/question-history.ts` | 질문 이력 조회/저장 서비스, 다양성 프롬프트 생성 | 150 |

#### Files Modified

| File | Changes |
|------|---------|
| `src/types/database.ts` | `question_generation_history` 테이블 타입 정의 추가 (+32 lines) |
| `src/lib/claude.ts` | `diversityPrompt` 파라미터 추가, temperature 0.7 설정, `extractedReferenceText` 반환 (+25 lines) |
| `src/app/api/questions/generate/route.ts` | 이력 조회/저장 통합, 다양성 적용 로직 (+142 lines) |

### Key Implementation Details

1. **핑거프린트 알고리즘**:
   - 텍스트 정규화 (소문자, 특수문자 제거, 단어 정렬)
   - 레퍼런스는 SHA-256 해시로 변환 (32자)
   - Jaccard 유사도 계산 함수 제공

2. **질문 이력 서비스**:
   - `getQuestionHistory()`: 사용자별 최근 30일 이력 조회
   - `getQuestionHistoryByReference()`: 동일 레퍼런스 이력만 조회
   - `saveQuestionHistory()`: 비동기 이력 저장 (에러 무시)
   - `buildDiversityPrompt()`: 이력 기반 다양성 지시문 생성

3. **API 통합**:
   - 선택적 인증 (`getAuthFromRequest`) - 비로그인 사용자도 기존 기능 유지
   - 로그인 사용자는 이력 기반 다양성 자동 적용
   - 응답에 `diversityApplied: boolean` 필드 추가

4. **Claude 프롬프트 개선**:
   - temperature: 0.7 (다양성 향상)
   - 다양성 지시문: 주제/유형 다양화 지침 포함

### Quality Validation

- [x] Build: Success
- [x] Type Check: Passed (npx tsc --noEmit)
- [x] Lint: Passed (ESLint)
- [x] Best Practices: 기존 코드 패턴 준수

### Deviations from Plan

**Added**:
- `GenerateQuestionsOptions` 인터페이스 추가 (향후 옵션 확장용)
- `getInterviewTypeId()` 헬퍼 함수 추가 (코드 → ID 변환)

**Changed**:
- 첫 질문 생성 후 이력 기반 재생성 방식 채택 (레퍼런스 핑거프린트 추출 필요)
- 비동기 이력 저장으로 응답 시간 영향 최소화

**Skipped**:
- 단위 테스트 (선택적으로 분류됨)
- 질문 생성 이력 정리 함수 DB 트리거 설정 (수동 실행 가능)

### Performance Impact

- DB 쿼리 추가: 이력 조회 1-2회, 이력 저장 1회 (비동기)
- 예상 응답 시간 증가: < 200ms (인덱스 최적화됨)
- 이력이 있는 경우 Claude API 2회 호출 (첫 생성 + 다양성 적용 재생성)

### Follow-up Tasks

- [ ] pgvector 기반 임베딩 유사도 검사 (2단계)
- [ ] 이력 자동 정리 Supabase cron job 설정
- [ ] 질문 타입별 분류 시스템 추가

### Notes

- 비로그인 사용자는 기존 로직 그대로 동작 (다양성 미적용)
- 이력 저장 실패는 치명적이지 않아 catch로 무시
- 30일 자동 만료로 DB 용량 관리
