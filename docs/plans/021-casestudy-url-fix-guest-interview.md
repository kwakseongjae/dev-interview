# Plan: 케이스 스터디 원문 URL 수정 및 비로그인 면접 허용

**Issue**: [#21](https://github.com/kwakseongjae/dev-interview/issues/21) - 케이스 스터디 원문 URL 수정 및 비로그인 면접 허용
**Branch**: `enhance/21-casestudy-url-fix-guest-interview`
**Created**: 2026-02-08
**Status**: Completed

---

## 1. Overview

### Problem Statement

1. **원문 URL 문제**: 케이스 스터디 18개 중 일부의 `source_url`이 404, 블로그 홈페이지, 또는 존재하지 않는 URL로 연결됨
2. **높은 진입 장벽**: 케이스 스터디 면접 시작 시 로그인을 필수로 요구하여, 서비스에 관심이 있는 비로그인 사용자가 이탈할 가능성이 높음

### Objectives

1. 깨진/부정확한 원문 URL을 실제 글이 존재하는 정확한 URL로 교체
2. 비로그인 사용자도 케이스 스터디 면접을 자유롭게 진행할 수 있도록 인증 흐름 변경
3. 면접 완료 후 아카이빙(제출) 단계에서만 로그인 요구 → 로그인 후 정상 저장

### Scope

- **In Scope**: DB source_url 업데이트, 프론트엔드 인증 분기 변경, 비로그인 면접 흐름 구현
- **Out of Scope**: 새 케이스 스터디 추가, AI 질문 생성 로직 변경, 아카이브 UI 변경

---

## 2. Requirements

### Functional Requirements

| ID   | 요구사항                                                      | 우선순위 |
| ---- | ------------------------------------------------------------- | -------- |
| FR-1 | 깨진 원문 URL 5건 이상 정확한 URL로 업데이트                  | P1       |
| FR-2 | 비로그인 사용자가 케이스 스터디 면접 페이지 진입 가능         | P1       |
| FR-3 | 비로그인 상태에서 질문 답변, 타이머, 힌트, 자동저장 정상 동작 | P1       |
| FR-4 | 제출 시 비로그인이면 로그인 유도 모달 표시                    | P1       |
| FR-5 | 로그인/회원가입 완료 후 답변이 정상 아카이빙됨                | P1       |
| FR-6 | 비로그인 사용자의 찜하기 시도 시 로그인 유도                  | P2       |

### Technical Requirements

| ID   | 요구사항                                                       | 우선순위 |
| ---- | -------------------------------------------------------------- | -------- |
| TR-1 | Supabase case_studies 테이블 source_url 업데이트 (SQL)         | P1       |
| TR-2 | interview/page.tsx에서 초기 인증 체크 제거                     | P1       |
| TR-3 | 비로그인 시 면접 데이터를 localStorage에만 저장하는 Guest 모드 | P1       |
| TR-4 | 제출 시 로그인 여부 분기: 로그인 → API 제출, 비로그인 → 모달   | P1       |
| TR-5 | 로그인 후 localStorage → API 세션 생성 + 답변 제출 파이프라인  | P1       |

### Non-Functional Requirements

| ID    | 요구사항                                 |
| ----- | ---------------------------------------- |
| NFR-1 | 로그인 전후로 면접 답변 데이터 유실 없음 |
| NFR-2 | localStorage 24시간 만료 정책 유지       |
| NFR-3 | 기존 로그인 사용자 면접 흐름에 영향 없음 |

---

## 3. Architecture & Design

### 3.1 원문 URL 수정

Supabase에 직접 SQL UPDATE로 source_url 교체:

| 회사     | 제목                                           | 현재 URL                          | 수정 URL                                                                                     |
| -------- | ---------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------- |
| Netflix  | 6,500만 동시 스트림을 처리하는 Netflix Live    | `netflixtechblog.com/` (홈페이지) | `netflixtechblog.com/netflix-live-origin-41f1b0ad5371`                                       |
| Coupang  | 쿠팡 로켓배송의 실시간 물류 경로 최적화 시스템 | 403 Forbidden                     | `medium.com/coupang-engineering/쿠팡-로켓배송-공간-색인-...-a59006bc4b6e`                    |
| LINE     | LINE 메시징 플랫폼의 대규모 푸시 알림 아키텍처 | 경로 없음                         | `engineering.linecorp.com/en/blog/how-line-messaging-servers-prepare-for-new-years-traffic/` |
| 당근마켓 | 당근마켓 실시간 채팅 시스템 아키텍처 진화      | 경로 없음                         | 대안 URL 조사 후 결정                                                                        |
| Naver    | 네이버 검색의 실시간 인덱싱 파이프라인 혁신    | 검증 필요                         | 수동 검증 후 결정                                                                            |

### 3.2 비로그인 면접 흐름 설계

#### 현재 흐름 (로그인 필수)

```
면접 페이지 진입 → isLoggedIn() 체크 → ❌ → /auth 리다이렉트
                                       → ✅ → startCaseStudyInterviewApi() → 면접 진행 → 제출 → /complete
```

#### 변경 흐름 (Guest 모드)

```
면접 페이지 진입 → isLoggedIn() 체크
  → ✅ 로그인 상태: 기존과 동일 (API 세션 생성 → 면접 → 제출 → /complete)
  → ❌ 비로그인 상태: Guest 모드 진입
      → 케이스 스터디 데이터 fetch (인증 불필요)
      → seedQuestions로 로컬 세션 구성
      → localStorage에 진행 상황 자동저장
      → 면접 진행 (타이머, 힌트, 답변 모두 정상)
      → 제출 클릭 시:
          → 로그인 유도 모달 표시 (LoginPromptModal 재활용)
          → "로그인하고 저장하기" → /auth?redirect=/case-studies/{slug}/interview
          → "나중에 하기" → localStorage에만 보존, /complete로 이동 (세션 없음)
      → 로그인 후 돌아오면:
          → localStorage에서 답변 복원
          → startCaseStudyInterviewApi() → 세션 생성
          → 답변 일괄 제출 → completeSessionApi()
          → /complete?session={id}
```

#### 핵심 설계 결정

1. **Guest 모드에서 세션 ID**: 로컬에서 임시 ID 생성 (crypto.randomUUID())하여 localStorage 키로 활용. 실제 DB 세션은 로그인 후 생성.

2. **seedQuestions 직접 활용**: 비로그인 시 `/api/case-studies/[slug]` API는 인증 불필요하므로 케이스 스터디 데이터(seedQuestions 포함)를 가져와 로컬에서 면접 구성. 별도 API 호출 없이 클라이언트에서 직접 질문 세팅.

3. **LoginPromptModal 확장**: 기존 `type: "complete" | "archive"`에 `"interview"` 추가하여 면접 중 제출 시 사용.

4. **로그인 후 자동 저장**: 기존 `/complete` 페이지의 `handleSaveSession()` 패턴을 `interview/page.tsx`에 적용. 로그인 감지 → API 세션 생성 → 답변 제출 → 완료 처리.

---

## 4. Implementation Plan

### Phase 1: 원문 URL 수정 (DB)

**작업 1.1**: Supabase SQL로 source_url 업데이트

- 파일: 없음 (DB 직접 업데이트)
- Supabase MCP `execute_sql` 사용

### Phase 2: 비로그인 면접 흐름 (Core)

**작업 2.1**: `interview/page.tsx` - 인증 체크 제거 및 Guest 모드 분기

- 파일: `src/app/case-studies/[slug]/interview/page.tsx`
- 변경 내용:
  - `isLoggedIn()` 체크로 리다이렉트하는 코드 제거 (line 204-208)
  - Guest 모드 초기화 로직 추가: `isLoggedIn()` false일 때 seedQuestions로 로컬 세션 구성
  - `isGuestMode` 상태 추가
  - Guest 모드 시 자동저장은 localStorage만 사용 (API 호출 없음)

**작업 2.2**: `interview/page.tsx` - 제출 시 로그인 분기

- 파일: `src/app/case-studies/[slug]/interview/page.tsx`
- 변경 내용:
  - `handleSubmit()` 수정: `isLoggedIn()` false면 로그인 모달 표시
  - `showLoginModal` 상태 추가
  - `LoginPromptModal` import 및 렌더링 추가

**작업 2.3**: `LoginPromptModal` 확장

- 파일: `src/components/LoginPromptModal.tsx`
- 변경 내용:
  - `type`에 `"interview"` 추가
  - interview용 텍스트: "면접 결과를 저장하려면 로그인이 필요합니다" 등

**작업 2.4**: 로그인 후 자동 세션 생성 및 아카이빙

- 파일: `src/app/case-studies/[slug]/interview/page.tsx`
- 변경 내용:
  - 로그인 후 돌아왔을 때 `isLoggedIn()` 감지
  - localStorage에서 답변 복원
  - `startCaseStudyInterviewApi()` 호출 → 세션 생성
  - 답변 일괄 제출 → `submitAnswerApi()` × N
  - `completeSessionApi()` 호출
  - `/complete?session={id}` 리다이렉트

**작업 2.5**: Guest 모드에서 찜하기 처리

- 파일: `src/app/case-studies/[slug]/interview/page.tsx`
- 변경 내용:
  - `handleToggleFavorite()` 수정: Guest 모드면 "로그인이 필요합니다" alert

### Phase 3: 케이스 스터디 상세 페이지 텍스트 업데이트

**작업 3.1**: 상세 페이지 CTA 텍스트 수정

- 파일: `src/app/case-studies/[slug]/page.tsx`
- 변경 내용:
  - "로그인 후 면접 결과가 자동으로 저장됩니다" → "로그인 없이 바로 면접을 시작할 수 있습니다"

---

## 5. Quality Gates

### 빌드 & 린트

```bash
npm run build        # 필수 통과
npx tsc --noEmit     # 필수 통과
npx eslint src/      # 필수 통과
```

### 기능 검증 체크리스트

- [ ] 깨진 URL 수정 확인 (DB 쿼리로 검증)
- [ ] 비로그인 상태에서 면접 페이지 정상 진입
- [ ] 비로그인 상태에서 질문 답변 입력 및 네비게이션
- [ ] 비로그인 상태에서 타이머, 힌트, 자동저장 동작
- [ ] 비로그인 제출 시 로그인 모달 표시
- [ ] 모달에서 "로그인하고 저장하기" 클릭 → /auth 이동
- [ ] 로그인 후 면접 페이지 복귀 → 답변 복원 확인
- [ ] 로그인 후 자동 세션 생성 + 아카이빙 완료 확인
- [ ] 모달에서 "나중에 하기" → localStorage 보존 확인
- [ ] 로그인 상태 사용자의 기존 면접 흐름 영향 없음
- [ ] 찜하기 → 비로그인 시 안내 메시지

---

## 6. Risks & Dependencies

| 리스크                                           | 영향 | 완화                                                      |
| ------------------------------------------------ | ---- | --------------------------------------------------------- |
| 일부 원문 URL이 영구적으로 사라짐                | 낮음 | 대안 URL 또는 가장 가까운 관련 글로 대체                  |
| Guest 모드에서 seedQuestions 구조 불일치         | 중간 | 타입 검증 추가, 기존 SessionQuestion 인터페이스 재활용    |
| 로그인 후 리다이렉트 시 localStorage 데이터 유실 | 높음 | beforeunload에서 저장, 리다이렉트 전 명시적 saveToLocal() |

---

## 7. File Change Summary

| 파일                                             | 변경 유형 | 설명                                       |
| ------------------------------------------------ | --------- | ------------------------------------------ |
| Supabase DB                                      | UPDATE    | source_url 5건 수정                        |
| `src/app/case-studies/[slug]/interview/page.tsx` | 수정      | Guest 모드 로직, 제출 분기, 로그인 후 저장 |
| `src/components/LoginPromptModal.tsx`            | 수정      | "interview" 타입 추가                      |
| `src/app/case-studies/[slug]/page.tsx`           | 수정      | CTA 텍스트 변경                            |

---

## 8. References

- [#19](https://github.com/kwakseongjae/dev-interview/issues/19) - 케이스 스터디 기능 원본 이슈
- [#20](https://github.com/kwakseongjae/dev-interview/pull/20) - 케이스 스터디 기능 PR
- `src/app/complete/page.tsx` - 기존 비로그인 → 로그인 후 저장 패턴 참조
- `src/components/LoginPromptModal.tsx` - 로그인 유도 모달 컴포넌트

---

## Implementation Summary

**Completion Date**: 2026-02-08
**Implemented By**: Claude Opus 4.6

### Changes Made

#### Files Modified

- [src/app/case-studies/[slug]/interview/page.tsx](src/app/case-studies/[slug]/interview/page.tsx) - Guest 모드 전체 구현 (initGuestMode, migrateGuestSession, 제출 분기, 찜하기 분기)
- [src/components/LoginPromptModal.tsx](src/components/LoginPromptModal.tsx) - "interview" 타입 추가, 로그인 혜택 체크리스트 + 미저장 경고 UI, 기존 lint 에러 수정
- [src/app/case-studies/[slug]/page.tsx](src/app/case-studies/[slug]/page.tsx) - CTA 텍스트 변경
- [src/app/page.tsx](src/app/page.tsx) - 홈 히어로 섹션 상단 여백 조정 (모바일/데스크톱)

#### DB Migrations

- `fix_danggeun_chat_source_url`: 당근마켓 채팅 시스템 source_url → AWS Summit 발표 PDF
- `fix_toss_fds_source_url`: Toss FDS source_url → toss.im/tossfeed 블로그

#### Key Implementation Details

- **Guest 모드**: `isGuestMode` 상태 + `isGuestModeRef`로 seedQuestions 기반 로컬 세션 구성
- **세션 마이그레이션**: 로그인 후 돌아오면 `migrateGuestSession()`이 localStorage → API 세션 자동 변환
- **LoginPromptModal 개선**: interview 타입에 혜택 체크리스트(AI 피드백, 모범 답변, 아카이브) + "저장하지 않고 나가기" 경고
- **URL 검증**: 18개 URL 전체 HTTP 상태 코드 검증, 2건 수정 (당근마켓 403, Toss FDS 404)

### Quality Validation

- [x] Build: Success
- [x] Type Check: Passed
- [x] Lint: Passed (기존 LoginPromptModal lint 에러도 함께 수정)

### Deviations from Plan

**Added**:

- LoginPromptModal에 로그인 혜택 체크리스트 + 미저장 경고 UI (사용자 피드백 반영)
- 홈 페이지 히어로 섹션 상단 여백 조정 (`pt-12 md:pt-20`, 모바일 justify-start)
- LoginPromptModal 기존 lint 에러 수정 (미사용 `X` import, `useState` 제거)

**Changed**:

- 계획에서 "나중에 하기" → `/complete` 이동으로 설계했으나, 사용자 피드백 반영하여 `/case-studies/{slug}` (상세 페이지)로 변경
- 계획의 URL 수정 대상 5건 중 실제 깨진 URL은 2건 (당근마켓, Toss FDS). 나머지 3건(Netflix, Coupang, LINE)은 이미 정상 URL로 등록되어 있었음

**Skipped**:

- 없음. 모든 계획 항목 구현 완료

### Performance Impact

- Bundle size: 미미한 증가 (Guest 모드 분기 로직 추가)
- 기존 로그인 사용자 경로에는 영향 없음

### Follow-up Tasks

- [ ] Guest 모드에서 "나중에 하기" 후 재방문 시 이전 답변 복원 UX 안내 개선

---

## QA Checklist

> 🧪 Generated by qa-generator agent
> Date: 2026-02-08

### 테스트 요약

- **총 테스트 케이스**: 18개
- **우선순위별**: High 8, Medium 7, Low 3
- **예상 테스트 시간**: 45분

---

### 1. 기능 테스트 (Functional Tests)

| #     | 테스트 시나리오                                  | 사전 조건                        | 테스트 단계                                                                | 예상 결과                                                                            | 우선순위 |
| ----- | ------------------------------------------------ | -------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------- |
| FT-1  | 비로그인 상태에서 케이스 스터디 면접 페이지 진입 | 로그인하지 않은 상태             | 1. `/case-studies/[slug]/interview` 접속                                   | 페이지가 정상 로드되고 Guest 모드 UI 표시                                            | High     |
| FT-2  | Guest 모드에서 첫 번째 질문 로드                 | 비로그인 면접 페이지 진입 후     | 1. 페이지 로드 완료 대기                                                   | seedQuestions 기반으로 첫 질문이 표시됨                                              | High     |
| FT-3  | Guest 모드에서 질문 답변 입력                    | 첫 번째 질문 표시 상태           | 1. 답변 textarea에 텍스트 입력                                             | 답변이 정상 입력되고 다음 버튼 활성화됨                                              | High     |
| FT-4  | Guest 모드에서 이전/다음 네비게이션              | 두 번째 질문 이상 상태           | 1. "이전" 버튼 클릭<br>2. "다음" 버튼 클릭                                 | 질문이 정상 전환되고 각 질문의 답변 유지됨                                           | High     |
| FT-5  | Guest 모드에서 타이머 작동                       | 면접 시작 후                     | 1. 타이머 시간 확인<br>2. 3초 대기                                         | 타이머가 초 단위로 증가함                                                            | High     |
| FT-6  | Guest 모드에서 자동저장 동작                     | 답변 입력 후                     | 1. 10초 대기<br>2. 브라우저 개발자도구 Storage 확인                        | localStorage에 `casestudy_interview_{slug}` 키로 진행상황이 저장됨                   | High     |
| FT-7  | Guest 모드에서 힌트 표시                         | 질문 표시 상태                   | 1. 힌트 버튼 클릭<br>2. 힌트 표시 확인<br>3. 다시 클릭                     | 힌트가 토글되어 표시/숨김됨                                                          | Medium   |
| FT-8  | 제출 버튼 클릭 시 로그인 모달 표시               | 마지막 질문 상태, Guest 모드     | 1. "제출하기" 버튼 클릭                                                    | LoginPromptModal이 표시되고 로그인 혜택 체크리스트 노출                              | High     |
| FT-9  | 로그인 모달에서 "로그인하고 저장하기" 클릭       | 로그인 모달 표시 상태            | 1. "로그인하고 저장하기" 버튼 클릭                                         | `/auth?redirect=/case-studies/{slug}/interview`로 이동                               | High     |
| FT-10 | 로그인 모달에서 "저장하지 않고 나가기" 클릭      | 로그인 모달 표시 상태            | 1. "저장하지 않고 나가기" 버튼 클릭                                        | `/case-studies/{slug}` 상세 페이지로 이동                                            | High     |
| FT-11 | 로그인 후 Guest 답변 자동 마이그레이션           | 로그인 모달에서 로그인 진행      | 1. `/auth` 로그인 완료<br>2. `/case-studies/{slug}/interview`로 리다이렉트 | localStorage의 답변이 자동으로 API 세션으로 변환되어 `/complete?session={id}`로 이동 | High     |
| FT-12 | 로그인 상태 사용자의 기존 면접 흐름              | 로그인 상태로 케이스 스터디 진입 | 1. 로그인 후 케이스 스터디 면접 진입                                       | API 세션 생성 후 정상 진행, Guest 모드 영향 없음                                     | High     |
| FT-13 | 케이스 스터디 상세 페이지 CTA 텍스트             | 케이스 스터디 상세 페이지 방문   | 1. 페이지 로드<br>2. "면접 시작하기" 버튼 아래 텍스트 확인                 | "로그인 없이 바로 면접을 시작할 수 있습니다" 표시됨                                  | Medium   |
| FT-14 | 원문 URL 검증 - 당근마켓                         | 케이스 스터디 상세 페이지        | 1. "원문 보기" 링크 클릭 (당근마켓 케이스)                                 | AWS Summit PDF 또는 유효한 URL로 이동 (403 에러 없음)                                | High     |
| FT-15 | 원문 URL 검증 - Toss FDS                         | 케이스 스터디 상세 페이지        | 1. "원문 보기" 링크 클릭 (Toss FDS 케이스)                                 | toss.im/tossfeed 또는 유효한 URL로 이동 (404 에러 없음)                              | High     |

---

### 2. 엣지 케이스 테스트 (Edge Cases)

| #    | 시나리오                             | 테스트 단계                                    | 예상 결과                                                           | 우선순위 |
| ---- | ------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------- | -------- |
| EC-1 | localStorage가 가득 찬 상태          | 1. 데이터 입력 후 로컬저장 시도                | 에러 처리되고 콘솔에 로그 출력, 사용자에게 알림 없음 (조용한 실패)  | Low      |
| EC-2 | 24시간 이후 저장된 Guest 데이터 접근 | 1. 24시간 이상 경과 후 면접 페이지 재방문      | localStorage 데이터가 자동 삭제되고 새 Guest 세션 시작              | Medium   |
| EC-3 | Guest 모드에서 찜하기 시도           | 1. 하트 아이콘 클릭                            | alert("로그인 후 찜하기 기능을 이용할 수 있습니다.") 표시           | Medium   |
| EC-4 | 비정상 리다이렉트 후 답변 복구       | 1. 면접 중 페이지 강제 새로고침                | beforeunload 이벤트로 localStorage에 저장 후 재로드, 이전 답변 복원 | Medium   |
| EC-5 | seedQuestions가 없는 케이스 스터디   | 1. seedQuestions 길이가 0인 케이스 페이지 방문 | `/case-studies/{slug}` 상세 페이지로 리다이렉트                     | Low      |

---

### 3. UI/UX 테스트 (Visual & Interaction Tests)

| #    | 확인 항목                    | 테스트 단계                                                             | 예상 결과                                                         | 우선순위 |
| ---- | ---------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------- | -------- |
| UI-1 | LoginPromptModal 스타일      | 1. 제출 시 모달 표시<br>2. 모달 UI 확인                                 | 모달이 중앙에 표시되고, 혜택 체크리스트(✓)가 표시됨               | Medium   |
| UI-2 | 로컬 저장 인디케이터         | 1. 면접 진행 중 관찰<br>2. 자동저장 확인                                | 헤더에 "자동 저장됨" 표시, "진행상황 복원됨" 표시가 3초 후 사라짐 | Medium   |
| UI-3 | 답변 완료 상태 표시          | 1. 각 질문마다 답변 입력<br>2. 하단 도트 인디케이터 확인                | 답변한 질문은 초록색 도트, 미답변은 회색 도트로 표시              | Medium   |
| UI-4 | 모바일 레이아웃 (아코디언)   | 1. 모바일 화면에서 면접 페이지 접속<br>2. "사례 참고자료" 아코디언 확인 | 아코디언이 정상 작동하고, 펼침/접힘 가능                          | Low      |
| UI-5 | 히어로 섹션 여백 (홈 페이지) | 1. 홈 페이지 방문<br>2. 모바일/데스크톱 모두 확인                       | 모바일: pt-12, 데스크톱: md:pt-20 여백 적용되어 있음              | Low      |

---

### 4. 회귀 테스트 (Regression Tests)

| #    | 기능                        | 테스트 단계                                                                          | 예상 결과                                                                   | 우선순위 |
| ---- | --------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | -------- |
| RT-1 | 로그인 사용자 면접 흐름     | 1. 로그인 후 케이스 스터디 진입<br>2. 면접 진행 후 제출                              | API 세션 정상 생성, 제출 후 `/complete?session={id}` 이동                   | High     |
| RT-2 | 케이스 스터디 목록 페이지   | 1. `/case-studies` 방문<br>2. 목록 로드 확인                                         | 모든 케이스 스터디가 정상 표시, 클릭 시 상세 페이지 이동                    | Medium   |
| RT-3 | Complete 페이지 로그인 모달 | 1. 로그인하지 않은 상태에서 완료 페이지 접속                                         | 기존 complete 타입 로그인 모달 정상 표시, 새로운 interview 타입에 영향 없음 | Medium   |
| RT-4 | 기존 세션 복원              | 1. 로그인 상태로 면접 진행<br>2. 페이지 새로고침<br>3. localStorage의 세션 ID로 복원 | 이전 답변과 경과 시간이 정상 복원됨                                         | Medium   |

---

### 5. 데이터 무결성 테스트 (Data Integrity)

| #    | 테스트 항목                    | 검증 방법                                                                              | 예상 결과                                                    | 우선순위 |
| ---- | ------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------- |
| DI-1 | Guest 답변 유실 방지           | 1. Guest로 모든 질문 답변 입력<br>2. localStorage 확인<br>3. 로그인 후 복구 확인       | localStorage에 모든 답변이 저장되고, 로그인 후 완전히 복구됨 | High     |
| DI-2 | 경과 시간 정확성               | 1. 면접 진행 중 타이머 확인<br>2. 제출 후 DB 저장 시간 확인                            | 자동저장 시간 >= 실제 경과 시간                              | Medium   |
| DI-3 | 다중 태스크 저장 (로그인 전후) | 1. 비로그인으로 3개 질문 답변<br>2. 로그인 및 리다이렉트<br>3. 마이그레이션 후 DB 확인 | 모든 답변이 API 세션에 정상 저장됨                           | High     |

---

### 6. 성능 테스트 (Performance Tests)

| #    | 측정 항목                     | 측정 방법                                                                              | 기준값                  | 우선순위 |
| ---- | ----------------------------- | -------------------------------------------------------------------------------------- | ----------------------- | -------- |
| PT-1 | 페이지 초기 로드 시간         | 1. Lighthouse 또는 DevTools 사용<br>2. `/case-studies/[slug]/interview` 로드 시간 측정 | FCP < 2s, LCP < 3s      | Low      |
| PT-2 | 질문 전환 애니메이션 부드러움 | 1. 다음 버튼 클릭 후 애니메이션 관찰                                                   | 60fps 유지, 깜빡임 없음 | Low      |
| PT-3 | localStorage 저장 시간        | 1. 답변 입력 후 자동저장 시간 측정                                                     | < 50ms                  | Low      |

---

### 7. 크로스 브라우저 테스트

| 브라우저      | 버전        | Interview 페이지 | 로그인 모달 | Guest 모드 | 테스트 결과 |
| ------------- | ----------- | ---------------- | ----------- | ---------- | ----------- |
| Chrome        | 최신        | ⬜               | ⬜          | ⬜         |             |
| Safari        | 최신        | ⬜               | ⬜          | ⬜         |             |
| Firefox       | 최신        | ⬜               | ⬜          | ⬜         |             |
| Edge          | 최신        | ⬜               | ⬜          | ⬜         |             |
| Mobile Safari | iOS 16+     | ⬜               | ⬜          | ⬜         |             |
| Chrome Mobile | Android 12+ | ⬜               | ⬜          | ⬜         |             |

---

### 테스트 실행 가이드

#### 준비 단계

1. 로컬 개발 서버 실행: `npm run dev`
2. 한국어 브라우저 설정 확인
3. 개발자도구 Storage(localStorage) 접근 가능 확인

#### 테스트 시나리오별 실행 순서

**1단계: 비로그인 Guest 모드 (15분)**

- FT-1 ~ FT-7: Guest 모드 기본 기능
- EC-2, EC-3, EC-4: 엣지 케이스
- UI-1 ~ UI-4: UI/UX 검증

**2단계: 로그인 모달 및 마이그레이션 (10분)**

- FT-8 ~ FT-11: 모달 동작 및 마이그레이션
- DI-1, DI-3: 데이터 무결성

**3단계: 회귀 테스트 및 기존 기능 (15분)**

- RT-1 ~ RT-4: 기존 면접 흐름 영향 없음
- FT-12, FT-14, FT-15: URL 및 CTA 텍스트

**4단계: 크로스 브라우저 (5분)**

- 각 브라우저에서 FT-1, FT-8, FT-9 선택 테스트

#### 검증 체크리스트

- [ ] localStorage에 Guest 세션 데이터가 `casestudy_interview_{slug}` 키로 저장됨
- [ ] LoginPromptModal에서 interview 타입 텍스트 표시 확인
- [ ] 당근마켓 URL이 정상 URL로 수정됨 (403 에러 해결)
- [ ] Toss FDS URL이 정상 URL로 수정됨 (404 에러 해결)
- [ ] CTA 텍스트가 "로그인 없이 바로 면접을 시작할 수 있습니다"로 변경됨
- [ ] 로그인 후 Guest 답변이 자동 마이그레이션되어 아카이브에 저장됨
- [ ] 로그인 사용자의 기존 면접 흐름에 영향 없음

#### 실패 시 대응

- **Guest 모드 로드 실패**: `getCaseStudyBySlugApi()` 응답 확인, seedQuestions 존재 여부 확인
- **localStorage 저장 실패**: 브라우저 저장소 용량 확인, 콘솔 에러 로그 확인
- **마이그레이션 실패**: 로그인 상태 확인, 리다이렉트 URL 파라미터 확인
- **URL 이동 실패**: 원문 URL이 실제 유효한지 각 URL을 직접 방문하여 확인
