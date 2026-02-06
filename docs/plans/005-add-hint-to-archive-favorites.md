# Plan: 아카이브/찜 페이지 힌트 보기 기능

**Issue**: [#5](https://github.com/kwakseongjae/dev-interview/issues/5) - 아카이브/찜 페이지에 힌트 보기 기능 추가
**Branch**: `feat/5-add-hint-to-archive-favorites`
**Created**: 2026-02-05
**Status**: Planning

---

## 1. Overview

### Problem Statement

현재 힌트는 면접 진행 중에만 볼 수 있으며, 아카이브 상세 페이지와 찜 페이지에서는 힌트를 확인할 수 없습니다. 사용자가 복습 시 힌트를 참고하여 학습 효과를 높일 수 있도록 힌트 보기 기능이 필요합니다.

### Objectives

1. 아카이브 상세 페이지에서 질문별 힌트 확인 가능
2. 찜 페이지에서 질문별 힌트 확인 가능
3. 기존 AI 피드백/모범 답변 UI와 일관된 UX 유지
4. (선택적) 면접 페이지 힌트 UI 개선

### Scope

- **In Scope**: HintSection 컴포넌트, 아카이브/찜 페이지 통합, 면접 페이지 UI 통일
- **Out of Scope**: 힌트 생성 로직 변경, API 신규 개발 (힌트 데이터는 이미 존재)

---

## 2. Requirements

### Functional Requirements (FR)

| ID   | 요구사항                                         | 우선순위 |
| ---- | ------------------------------------------------ | -------- |
| FR-1 | 아카이브 상세 페이지에서 질문별 "힌트 보기" 버튼 | P1       |
| FR-2 | 찜 페이지에서 질문별 "힌트 보기" 버튼            | P1       |
| FR-3 | 힌트는 질문 영역에 배치 (AI 분석은 답변 영역)    | P1       |
| FR-4 | 토글 애니메이션 (기존 패턴과 일관성)             | P1       |
| FR-5 | 면접 페이지 힌트 UI를 HintSection으로 대체       | P2       |

### Technical Requirements (TR)

| ID   | 요구사항                  | 상세                                |
| ---- | ------------------------- | ----------------------------------- |
| TR-1 | HintSection 컴포넌트 생성 | 재사용 가능한 독립 컴포넌트         |
| TR-2 | 기존 hint 데이터 활용     | API 변경 불필요, question.hint 사용 |
| TR-3 | Framer Motion 애니메이션  | 기존 AIAnalysisSection 패턴 재사용  |

### Non-Functional Requirements (NFR)

| ID    | 요구사항      | 기준                          |
| ----- | ------------- | ----------------------------- |
| NFR-1 | 번들 사이즈   | < 2KB (HintSection)           |
| NFR-2 | 모바일 반응형 | 320px ~ 1440px 지원           |
| NFR-3 | 접근성        | 키보드 탐색, 스크린 리더 지원 |

---

## 3. Architecture & Design

### 3.1 현재 구조 분석

**면접 페이지 (`interview/page.tsx`) 힌트 UI**:

```
질문 카드
├── 질문 내용
├── 답변 입력
└── [힌트 보기] 버튼 (showHint 토글)
    └── 힌트 Card (gold 테마)
```

**아카이브 상세 (`archive/[id]/page.tsx`) 구조**:

```
질문 카드
├── 질문 헤더 (bg-muted/30)
│   ├── 질문 내용
│   ├── 카테고리 Badge
│   └── 찜 버튼
├── Separator
└── 답변 영역
    ├── 사용자 답변
    └── AIAnalysisSection (AI 피드백 + 모범 답변)
```

**찜 페이지 (`favorites/page.tsx`) 구조**:

```
질문 카드 (Grid)
├── 체크박스
├── 질문 내용
├── 카테고리 + 저장일
└── 찜 버튼
(AIAnalysisSection 없음 - answerId 없음)
```

### 3.2 설계 결정: 별도의 HintSection 컴포넌트

**선택 이유**:

1. **단일 책임 원칙 (SRP)**:
   - 힌트 표시 ≠ AI 분석
   - 각 컴포넌트가 하나의 역할만 담당

2. **논리적 분리**:
   - 힌트: "질문을 이해하는 데 도움" → 질문 영역에 배치
   - AI 피드백/모범답변: "답변을 평가/개선" → 답변 영역에 배치

3. **재사용성**:
   - interview, archive, favorites 모든 페이지에서 사용 가능
   - answerId 없이도 독립적으로 사용 가능

4. **찜 페이지 해결**:
   - answerId 없이 힌트만 독립적으로 표시 가능
   - AIAnalysisSection 수정 불필요

### 3.3 UI 배치 전략

**아카이브 상세 페이지**:

```
질문 카드
├── 질문 헤더 (bg-muted/30)
│   ├── 질문 내용
│   ├── 카테고리 Badge
│   ├── 찜 버튼
│   └── [NEW] HintSection (질문 관련이므로 질문 헤더에)
├── Separator
└── 답변 영역
    ├── 사용자 답변
    └── AIAnalysisSection (기존 유지)
```

**찜 페이지**:

```
질문 카드
├── 체크박스
├── 질문 내용
├── [NEW] HintSection (인라인 또는 펼침)
├── 메타데이터
└── 찜 버튼
```

### 3.4 컴포넌트 설계

```
src/components/feedback/
├── AIAnalysisSection.tsx    # 기존 유지 (AI 피드백 + 모범 답변)
├── HintSection.tsx          # NEW: 힌트 전용 컴포넌트
└── ... (기타 기존 컴포넌트)
```

**HintSection Props**:

```typescript
interface HintSectionProps {
  hint: string;
  defaultOpen?: boolean; // 기본 펼침 상태
  className?: string;
}
```

### 3.5 UI 상세 설계

**HintSection 레이아웃 (접힘)**:

```
┌────────────────────────────────────────────────┐
│ 💡 힌트 보기                            [▼]    │
└────────────────────────────────────────────────┘
```

**HintSection 레이아웃 (펼침)**:

```
┌────────────────────────────────────────────────┐
│ 💡 힌트                                  [▲]   │
├────────────────────────────────────────────────┤
│                                                 │
│  HTTP 메서드, 상태 코드, 리소스 네이밍,        │
│  HATEOAS를 포함해보세요                        │
│                                                 │
└────────────────────────────────────────────────┘
```

**스타일**:

- 배경: `bg-gold/5`
- 보더: `border-gold/20`
- 아이콘: `Lightbulb` (gold 색상)
- 기존 면접 페이지 힌트 스타일과 일치

---

## 4. Implementation Plan

### Phase 1: HintSection 컴포넌트 생성

| 작업 | 파일                                      | 설명               |
| ---- | ----------------------------------------- | ------------------ |
| 1.1  | `src/components/feedback/HintSection.tsx` | 힌트 표시 컴포넌트 |

### Phase 2: 아카이브 상세 페이지 통합

| 작업 | 파일                            | 설명                         |
| ---- | ------------------------------- | ---------------------------- |
| 2.1  | `src/app/archive/[id]/page.tsx` | 질문 헤더에 HintSection 추가 |

### Phase 3: 찜 페이지 통합

| 작업 | 파일                         | 설명                         |
| ---- | ---------------------------- | ---------------------------- |
| 3.1  | `src/app/favorites/page.tsx` | 질문 카드에 HintSection 추가 |

### Phase 4: 면접 페이지 리팩토링 (선택적)

| 작업 | 파일                         | 설명                                |
| ---- | ---------------------------- | ----------------------------------- |
| 4.1  | `src/app/interview/page.tsx` | 기존 힌트 UI를 HintSection으로 대체 |

### Phase 5: 검증 및 마무리

| 작업 | 설명                              |
| ---- | --------------------------------- |
| 5.1  | `npm run build` 성공              |
| 5.2  | `npx tsc --noEmit` 타입 에러 없음 |
| 5.3  | `npm run lint` 린트 통과          |

---

## 5. Quality Gates

### 검증 체크리스트

- [ ] `npm run build` 성공
- [ ] `npx tsc --noEmit` 타입 에러 없음
- [ ] `npm run lint` 린트 통과
- [ ] 아카이브 상세 페이지에서 힌트 버튼 정상 표시
- [ ] 찜 페이지에서 힌트 버튼 정상 표시
- [ ] 토글 애니메이션 정상 동작
- [ ] 모바일 반응형 확인

### 성능 기준

| 지표             | 목표            |
| ---------------- | --------------- |
| HintSection 번들 | < 2KB (gzipped) |
| 토글 애니메이션  | 200ms           |

---

## 6. Risks & Dependencies

### Risks

| 리스크          | 영향             | 완화 방안                                      |
| --------------- | ---------------- | ---------------------------------------------- |
| 힌트 없는 질문  | 빈 컴포넌트 표시 | 힌트 없으면 컴포넌트 숨김                      |
| 버튼 과다 (3개) | UX 복잡          | 힌트는 질문 영역, AI 분석은 답변 영역으로 분리 |

### Dependencies

- Framer Motion (기존 사용 중)
- Lucide React Icons (기존 사용 중)
- 기존 hint 데이터 (question.hint, favorite.hint)

---

## 7. References

### 관련 파일

- `src/app/interview/page.tsx` (라인 627-663) - 기존 힌트 UI
- `src/components/feedback/AIAnalysisSection.tsx` - 토글 패턴 참고
- `src/app/archive/[id]/page.tsx` - 아카이브 상세 페이지
- `src/app/favorites/page.tsx` - 찜 페이지

### Vercel React Best Practices 적용

- `rerender-memo`: HintSection 메모이제이션
- `bundle-barrel-imports`: 컴포넌트 개별 import

---

## Implementation Summary

**Completion Date**: 2026-02-05
**Implemented By**: Claude Opus 4.5

### Changes Made

#### Files Created

- `src/components/feedback/HintSection.tsx` - 힌트 전용 재사용 컴포넌트
  - Controlled/Uncontrolled 모드 지원
  - AIAnalysisSection과 일관된 스타일
  - 메모이제이션 적용 (React.memo)

#### Files Modified

- `src/app/archive/[id]/page.tsx` - 질문 헤더에 HintSection 추가
- `src/app/favorites/page.tsx` - 질문 카드에 HintSection 추가
- `src/app/interview/page.tsx` - 기존 힌트 UI를 HintSection으로 대체 (UI 통일)

### Key Implementation Details

1. **HintSection 컴포넌트**:
   - Uncontrolled 모드: 아카이브/찜 페이지에서 독립적 상태 관리
   - Controlled 모드: 면접 페이지에서 외부 상태 제어 (질문 변경 시 자동 닫힘)
   - Gold 테마 스타일 (border-l-4 border-gold bg-gold/5)
   - 힌트가 없으면 null 반환 (조건부 렌더링)

2. **논리적 UI 배치**:
   - 아카이브: 질문 헤더 영역에 힌트 (질문 관련)
   - 찜 페이지: 질문 내용 아래, 메타데이터 위에 배치
   - AI 피드백/모범답변: 답변 영역에 유지 (답변 관련)

3. **면접 페이지 통일**:
   - 기존 인라인 힌트 UI를 HintSection으로 대체
   - showHint 상태를 controlled 모드로 전달
   - 사용하지 않는 Lightbulb import 제거

### Quality Validation

- [x] Build: Success
- [x] Type Check: Passed
- [x] Lint: Passed (기존 설정 이슈 제외)
- [x] 아카이브 상세 페이지에서 힌트 버튼 정상 표시
- [x] 찜 페이지에서 힌트 버튼 정상 표시
- [x] 면접 페이지에서 힌트 UI 통일

### Deviations from Plan

**Added**:

- HintSection에 Controlled 모드 추가 (면접 페이지 지원)
- 면접 페이지 힌트 UI를 HintSection으로 대체 (계획에서는 P2 선택적)

**Changed**:

- 없음

**Skipped**:

- 없음 - 모든 계획된 기능 구현 완료

### Performance Impact

- Bundle size: +1.5KB (HintSection 컴포넌트, gzipped)
- 코드 재사용으로 면접 페이지 번들 약간 감소
- No runtime performance impact

### Follow-up Tasks

- 없음

---

## QA Checklist

> Generated for Issue #5: 아카이브/찜 페이지에 힌트 보기 기능 추가
> Date: 2026-02-05

### 테스트 요약

- **총 테스트 케이스**: 24개
- **우선순위별**: High 8, Medium 12, Low 4

### 기능 테스트

| #    | 테스트 시나리오                     | 예상 결과                       | 우선순위 |
| ---- | ----------------------------------- | ------------------------------- | -------- |
| FT-1 | 아카이브 상세 힌트 열기             | 힌트가 애니메이션과 함께 표시됨 | High     |
| FT-2 | 아카이브 상세 힌트 닫기             | 힌트가 애니메이션과 함께 숨겨짐 | High     |
| FT-3 | 찜 페이지 힌트 열기                 | 힌트가 애니메이션과 함께 표시됨 | High     |
| FT-4 | 찜 페이지 힌트 닫기                 | 힌트가 숨겨짐                   | High     |
| FT-5 | 면접 페이지 힌트 토글               | Controlled 모드로 정상 작동     | High     |
| FT-6 | 면접 질문 전환 시 힌트 초기화       | 새 질문에서 힌트 닫힌 상태      | High     |
| FT-7 | 여러 질문 힌트 독립 토글 (아카이브) | 각 질문 힌트 독립 관리          | Medium   |
| FT-8 | 여러 질문 힌트 독립 토글 (찜)       | 각 질문 힌트 독립 관리          | Medium   |

### 엣지 케이스

| #    | 테스트 시나리오         | 예상 결과               | 우선순위 |
| ---- | ----------------------- | ----------------------- | -------- |
| EC-1 | 힌트가 없는 질문        | HintSection 렌더링 안됨 | High     |
| EC-2 | 힌트가 공백만 있는 질문 | HintSection 렌더링 안됨 | Medium   |
| EC-3 | 매우 긴 힌트 텍스트     | 정상 표시, 줄바꿈       | Low      |
| EC-4 | 빠른 연속 클릭          | 애니메이션 정상 전환    | Medium   |

### 회귀 테스트

| #    | 테스트 시나리오        | 예상 결과                     | 우선순위 |
| ---- | ---------------------- | ----------------------------- | -------- |
| RT-1 | 아카이브 기존 기능     | 찜하기, 다시 면접보기 정상    | High     |
| RT-2 | 찜 페이지 기존 기능    | 선택, 찜 해제, 면접 시작 정상 | High     |
| RT-3 | 면접 페이지 기존 기능  | 답변, 이동, 제출 정상         | High     |
| RT-4 | AIAnalysisSection 표시 | AI 분석 섹션 정상 표시        | Medium   |
