# Plan: 모바일 반응형 개선 및 파일 첨부 기반 질문 생성 오류 수정

**Issue**: [#9](https://github.com/kwakseongjae/dev-interview/issues/9) - 모바일 반응형 개선 및 파일 첨부 기반 질문 생성 오류 수정
**Branch**: `feat/9-mobile-responsive-and-file-upload-fix`
**Created**: 2026-02-05
**Status**: Implemented

---

## 1. Overview

### Problem Statement

1. **모바일 반응형 부족**: 기본적인 반응형은 적용되어 있으나 모바일에서 사용하기 불편한 부분이 많음
   - 질문/답변 UI가 모바일에서 비좁음
   - 아카이브 페이지의 액션 버튼들이 hover 기반으로 모바일에서 보이지 않음
   - 터치 타겟이 너무 작음 (현재 32-36px, 권장 44px)
   - 모달/다이얼로그가 모바일에 최적화되지 않음

2. **파일 첨부 후 질문 생성 오류**: 모바일에서 파일 첨부 시 질문 생성이 막히는 경우 발생
   - FormData 헤더 처리 문제 가능성
   - 파일 크기 사전 검증 부재
   - 업로드 타임아웃/에러 핸들링 부족
   - 비ASCII 파일명 처리 문제

### Objectives

1. 모바일(~768px)에서 모든 주요 기능이 원활하게 사용 가능
2. 파일 첨부 후 질문 생성이 정상적으로 완료됨
3. 터치 인터랙션이 자연스럽고 반응적임 (터치 타겟 최소 44px)

### Scope

**In Scope**:

- 인터뷰 페이지 모바일 최적화
- 아카이브 목록/상세 페이지 모바일 최적화
- 즐겨찾기 페이지 모바일 최적화
- AI 피드백/힌트 컴포넌트 모바일 최적화
- 파일 업로드 버그 수정
- useMediaQuery 훅 추가

**Out of Scope**:

- 팀 스페이스 관련 페이지
- 설정 페이지
- 인증 관련 페이지

---

## 2. Requirements

### Functional Requirements

| ID   | 요구사항                                         | 우선순위 |
| ---- | ------------------------------------------------ | -------- |
| FR-1 | hover 기반 버튼들이 모바일에서도 항상 보여야 함  | P1       |
| FR-2 | 모달/다이얼로그가 모바일에서 적절한 크기로 표시  | P1       |
| FR-3 | 파일 업로드 시 클라이언트 사이드 크기 검증       | P1       |
| FR-4 | 업로드 실패 시 적절한 에러 메시지 및 재시도 옵션 | P1       |
| FR-5 | 터치 타겟이 최소 44x44px 확보                    | P2       |
| FR-6 | 캘린더 선택기가 모바일에서 1개월만 표시          | P2       |
| FR-7 | 파일 업로드 진행 상태 표시                       | P3       |

### Technical Requirements

| ID   | 요구사항                                       | 우선순위 |
| ---- | ---------------------------------------------- | -------- |
| TR-1 | useMediaQuery 훅으로 반응형 조건부 렌더링      | P1       |
| TR-2 | FormData 업로드 시 Content-Type 헤더 자동 설정 | P1       |
| TR-3 | 비ASCII 파일명 sanitization                    | P1       |
| TR-4 | 파일 업로드 타임아웃 처리                      | P2       |
| TR-5 | 이미지 파일 클라이언트 사이드 압축 (옵션)      | P3       |

---

## 3. Architecture & Design

### 3.1 파일 구조

```
src/
├── hooks/
│   └── useMediaQuery.ts          # 새로 생성
├── app/
│   ├── page.tsx                  # 파일 업로드 버그 수정 + 반응형
│   ├── interview/page.tsx        # 모바일 개선 (기존 양호)
│   ├── archive/
│   │   ├── page.tsx              # hover 버튼 수정 + 캘린더
│   │   └── [id]/page.tsx         # 모달 크기 + 반응형
│   └── favorites/page.tsx        # hover 버튼 수정
├── components/
│   ├── feedback/
│   │   ├── AIAnalysisSection.tsx # 모바일 최적화
│   │   └── HintSection.tsx       # 터치 타겟 확대
│   └── ui/
│       ├── button.tsx            # 터치 타겟 크기 검토
│       └── checkbox.tsx          # 터치 타겟 크기 확대
└── lib/
    └── file-utils.ts             # 새로 생성: 파일 검증 유틸리티
```

### 3.2 핵심 변경 사항

#### A. useMediaQuery 훅 (신규)

```typescript
// src/hooks/useMediaQuery.ts
"use client";

import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
```

#### B. 파일 업로드 버그 수정 (page.tsx)

**문제점**:

1. Authorization 헤더만 설정하고 FormData 전송 시 Content-Type을 수동 설정하지 않음 (올바른 방식이나 일부 모바일 브라우저에서 문제)
2. 파일 크기 사전 검증 부재
3. 업로드 실패 시 에러 복구 미흡
4. 비ASCII 파일명 처리 문제

**수정 방안**:

```typescript
// 파일 검증
const validateFile = (file: File): { valid: boolean; error?: string } => {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: `파일 크기가 10MB를 초과합니다: ${file.name}`,
    };
  }
  // 파일 타입 검증은 기존 로직 유지
  return { valid: true };
};

// 파일명 sanitization
const sanitizeFilename = (name: string): string => {
  const ext = name.split(".").pop() || "";
  const base = name.replace(/\.[^/.]+$/, "");
  const sanitized = base.replace(/[^\w\-_.]/g, "_");
  return `${sanitized}.${ext}`;
};

// 업로드 함수 개선
const uploadFile = async (file: File, token: string) => {
  const formData = new FormData();
  // 파일명 sanitization 적용
  const sanitizedFile = new File([file], sanitizeFilename(file.name), {
    type: file.type,
  });
  formData.append("file", sanitizedFile);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60초 타임아웃

  try {
    const response = await fetch("/api/references/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("업로드 시간이 초과되었습니다. 네트워크를 확인해주세요.");
    }
    throw error;
  }
};
```

#### C. Hover 기반 버튼 수정

**현재 문제** (archive/page.tsx, favorites/page.tsx):

```tsx
// 모바일에서 보이지 않음
<Button className="opacity-0 group-hover:opacity-100 ...">
```

**수정 방안**:

```tsx
// 옵션 1: 항상 표시 (단순)
<Button className="opacity-100 ...">

// 옵션 2: 모바일에서만 항상 표시
<Button className="opacity-100 md:opacity-0 md:group-hover:opacity-100 ...">

// 옵션 3: useIsMobile()로 조건부 렌더링
const isMobile = useIsMobile();
<Button className={cn(
  isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100",
  "..."
)}>
```

**권장**: 옵션 2 (CSS만으로 해결, 간단하고 SSR 안전)

#### D. 모달 크기 최적화

**현재** (archive/[id]/page.tsx):

```tsx
<DialogContent className="max-w-2xl max-h-[80vh]">
```

**수정**:

```tsx
<DialogContent className="max-w-[95vw] sm:max-w-lg md:max-w-2xl max-h-[90vh] md:max-h-[80vh]">
```

#### E. 캘린더 반응형 (archive/page.tsx)

**현재**:

```tsx
<Calendar numberOfMonths={2} />
```

**수정**:

```tsx
const isMobile = useIsMobile();
<Calendar numberOfMonths={isMobile ? 1 : 2} />;
```

#### F. 터치 타겟 크기 확대

**Checkbox** (ui/checkbox.tsx 또는 사용처):

```tsx
// 터치 영역 확대 wrapper
<label className="flex items-center min-h-[44px] min-w-[44px] cursor-pointer">
  <Checkbox className="h-5 w-5" />
</label>
```

**아이콘 버튼**:

```tsx
// 기존
<Button size="icon" className="h-8 w-8">

// 수정
<Button size="icon" className="h-11 w-11 md:h-8 md:w-8">
```

---

## 4. Implementation Plan

### Phase 1: 기반 작업 (P1)

| 작업                  | 파일                         | 예상 변경 |
| --------------------- | ---------------------------- | --------- |
| useMediaQuery 훅 생성 | `src/hooks/useMediaQuery.ts` | 신규 파일 |
| 파일 검증 유틸리티    | `src/lib/file-utils.ts`      | 신규 파일 |

### Phase 2: 파일 업로드 버그 수정 (P1)

| 작업                 | 파일               | 예상 변경                 |
| -------------------- | ------------------ | ------------------------- |
| 파일 크기 사전 검증  | `src/app/page.tsx` | handleFileSelect 수정     |
| 파일명 sanitization  | `src/app/page.tsx` | uploadFile 함수 추가/수정 |
| 업로드 타임아웃 처리 | `src/app/page.tsx` | AbortController 추가      |
| 에러 핸들링 개선     | `src/app/page.tsx` | try-catch 개선            |

### Phase 3: 아카이브 페이지 반응형 (P1)

| 작업                   | 파일                            | 예상 변경             |
| ---------------------- | ------------------------------- | --------------------- |
| hover 버튼 모바일 표시 | `src/app/archive/page.tsx`      | CSS 클래스 수정       |
| 캘린더 반응형          | `src/app/archive/page.tsx`      | numberOfMonths 조건부 |
| 모달 크기 조정         | `src/app/archive/[id]/page.tsx` | max-w 반응형          |

### Phase 4: 즐겨찾기 페이지 반응형 (P1)

| 작업                   | 파일                         | 예상 변경       |
| ---------------------- | ---------------------------- | --------------- |
| hover 버튼 모바일 표시 | `src/app/favorites/page.tsx` | CSS 클래스 수정 |
| 카드 패딩 조정         | `src/app/favorites/page.tsx` | 반응형 패딩     |

### Phase 5: 피드백/힌트 컴포넌트 (P2)

| 작업           | 파일                                            | 예상 변경      |
| -------------- | ----------------------------------------------- | -------------- |
| 버튼 터치 타겟 | `src/components/feedback/HintSection.tsx`       | 버튼 크기 조정 |
| 버튼 그룹 간격 | `src/components/feedback/AIAnalysisSection.tsx` | gap 조정       |

### Phase 6: UI 컴포넌트 터치 타겟 (P2)

| 작업               | 파일      | 예상 변경    |
| ------------------ | --------- | ------------ |
| 체크박스 터치 영역 | 각 사용처 | wrapper 추가 |
| 아이콘 버튼 크기   | 각 사용처 | 반응형 크기  |

---

## 5. Quality Gates

### Pre-Implementation Checklist

- [x] 이슈 요구사항 분석 완료
- [x] 코드베이스 탐색 완료 (3개 에이전트 병렬 실행)
- [x] 기술 리서치 완료 (모바일 best practices, 파일 업로드 이슈)
- [x] 계획 문서 작성

### Implementation Checklist

- [ ] Build 성공: `npm run build`
- [ ] TypeScript 에러 없음: `npx tsc --noEmit`
- [ ] Lint 통과: `npm run lint`

### Testing Checklist

- [ ] 데스크톱 브라우저 (Chrome, Safari, Firefox)
- [ ] 모바일 브라우저 (iOS Safari, Android Chrome)
- [ ] 파일 업로드 테스트 (이미지, PDF)
- [ ] 한글 파일명 업로드 테스트
- [ ] 대용량 파일(10MB 초과) 업로드 테스트
- [ ] 터치 타겟 크기 검증 (44px 이상)

### Acceptance Criteria

- [ ] 모바일(~768px)에서 인터뷰 진행이 원활함
- [ ] 모바일에서 아카이브 목록/상세 확인이 편리함
- [ ] 모바일에서 AI 피드백, 힌트가 잘 표시됨
- [ ] 모바일에서 파일 첨부 후 질문 생성이 정상 작동함
- [ ] 터치 타겟이 최소 44px 이상 확보됨

---

## 6. Risks & Dependencies

### Risks

| 리스크                      | 영향도 | 대응 방안                              |
| --------------------------- | ------ | -------------------------------------- |
| iOS Safari 파일 입력 quirks | HIGH   | 서버 사이드 검증 유지, 클라이언트 폴백 |
| useMediaQuery SSR 불일치    | MEDIUM | 초기값 false, hydration 후 업데이트    |
| 반응형 CSS 복잡성 증가      | LOW    | Tailwind 유틸리티 일관성 유지          |

### Dependencies

- `react-day-picker` (Calendar 컴포넌트)
- Shadcn UI 컴포넌트

---

## 7. Best Practices Applied

### Vercel React Best Practices

- **async-parallel**: 파일 업로드 시 Promise.allSettled 검토
- **bundle-barrel-imports**: 새 훅/유틸리티 named export 사용
- **rerender-memo**: useMediaQuery 결과 메모이제이션 불필요 (primitive)
- **server-serialization**: 클라이언트 컴포넌트 명시 ('use client')

### Mobile Best Practices

- **터치 타겟**: 최소 44x44px (Apple HIG)
- **모바일 우선**: Tailwind 기본 스타일 = 모바일, md: 이상에서 확장
- **폼 요소**: 모바일 키보드 최적화 (inputMode, autocomplete)

---

## 8. References

- [GitHub Issue #9](https://github.com/kwakseongjae/dev-interview/issues/9)
- [Apple HIG - Touch Targets](https://developer.apple.com/design/human-interface-guidelines/)
- [NN/G - Touch Target Size](https://www.nngroup.com/articles/touch-target-size/)
- [Next.js Issue #76893 - FormData non-ASCII](https://github.com/vercel/next.js/issues/76893)
- [Tailwind CSS - Responsive Design](https://tailwindcss.com/docs/responsive-design)

---

## 9. Implementation Summary

**Completion Date**: 2026-02-05
**Implemented By**: Claude Opus 4.5

### Changes Made

#### 신규 파일

- `src/hooks/useMediaQuery.ts` - 반응형 미디어 쿼리 훅 (useSyncExternalStore 기반)
- `src/lib/file-utils.ts` - 파일 업로드 유틸리티 (검증, sanitization, 타임아웃)

#### 수정된 파일

- `src/app/page.tsx` - 홈페이지 모바일 최적화 (레이아웃, 채팅창, 범주 선택)
- `src/app/archive/page.tsx` - hover 버튼 모바일 표시 + 캘린더 반응형
- `src/app/archive/[id]/page.tsx` - 모달 크기 반응형 + 찜 버튼 터치 타겟
- `src/app/favorites/page.tsx` - hover 버튼 모바일 표시 + 모달 반응형
- `src/components/feedback/HintSection.tsx` - 버튼 터치 타겟 확대
- `src/components/feedback/AIAnalysisSection.tsx` - 버튼 터치 타겟 확대
- `src/components/InterviewTypeSelector.tsx` - 모바일 칩 형태 레이아웃

### Key Implementation Details

1. **파일 업로드 버그 수정**:
   - 파일 크기 사전 검증 (10MB 초과 시 업로드 전 에러)
   - 비ASCII 파일명 sanitization (한글 파일명 → 안전한 영문 파일명)
   - 60초 타임아웃 처리 (AbortController 사용)
   - 개선된 에러 핸들링 (타임아웃 구분 에러 메시지)

2. **모바일 반응형 개선**:
   - hover 기반 버튼 → `opacity-100 md:opacity-0 md:group-hover:opacity-100`
   - 캘린더 `numberOfMonths` 반응형 (모바일 1개, 데스크톱 2개)
   - 모달 크기 반응형 (`max-w-[95vw] sm:max-w-lg md:max-w-2xl`)
   - 터치 타겟 최소 44px 확보 (`min-h-[44px]`, `py-2.5`)

3. **useMediaQuery 훅**:
   - `useSyncExternalStore` 사용으로 SSR 안전
   - `useIsMobile()`, `useIsTablet()`, `useIsDesktop()` 헬퍼 제공

4. **홈페이지 모바일 UX 개선**:
   - 타이틀 폰트 크기 축소 (`text-3xl sm:text-4xl md:text-6xl`)
   - 헤더 높이/패딩 축소 (로고 `w-8 h-8 md:w-12 md:h-12`)
   - 채팅창 경량화 (폰트 `text-sm md:text-lg`, 패딩 축소, placeholder 단축)
   - 면접 범주 선택 → 채팅창 위로 배치
   - 샘플 프롬프트 컴팩트화 (`line-clamp-2`)

5. **InterviewTypeSelector 모바일 최적화**:
   - 데스크톱: 기존 카드 레이아웃
   - 모바일: `flex-wrap` 칩 형태 (횡스크롤 제거)
   - 선택 시 레이아웃 밀림 방지 (`border-2` 고정, 체크 아이콘 제거)
   - 미선택 상태도 테두리+아이콘 색상으로 클릭 유도

### Quality Validation

- [x] Build: Success
- [x] Type Check: Passed (no errors)
- [x] Lint: Passed (warnings only - 기존 이슈)

### Deviations from Original Plan

**Added**:

- `useSyncExternalStore` 사용으로 기존 `useState + useEffect` 패턴의 lint 에러 해결
- 파일 삭제 버튼도 모바일에서 항상 표시되도록 수정
- 홈페이지 전체 모바일 UX 개선 (원래 계획에 없던 추가 요청)
- InterviewTypeSelector 모바일 칩 레이아웃

**Changed**:

- 면접 범주 선택 위치: 채팅창 아래 → 채팅창 위로 이동
- InterviewTypeSelector 모바일: 카드 → 칩 형태로 변경

### Follow-up Tasks

- [ ] 실제 모바일 기기에서 파일 업로드 테스트 (iOS Safari, Android Chrome)
- [ ] 터치 타겟 크기 QA 검증
- [ ] 홈페이지 모바일 레이아웃 다양한 기기에서 테스트

### QA Checklist

> 🧪 Generated by qa-generator agent on 2026-02-05 (Updated)

**총 테스트 케이스**: 50개+ (High 20, Medium 20, Low 10)

주요 테스트 영역:

- **기능 테스트 (14개)**: 파일 업로드, 모바일 반응형, 터치 타겟
- **엣지 케이스 (10개)**: 파일 크기 경계값, 네트워크 오류, SSR
- **UI/UX 테스트 (12개)**: 에러 메시지, 반응형 전환, 시각적 피드백, 홈페이지 레이아웃
- **회귀 테스트 (8개)**: 기존 기능 정상 동작 확인
- **성능 테스트 (4개)**: 검증 시간, 렌더링 영향
- **크로스 브라우저/디바이스**: Chrome, Safari, Firefox, Edge + iOS/Android 모바일

**추가된 홈페이지 테스트**:
| # | 테스트 시나리오 | 예상 결과 | 우선순위 |
|---|----------------|----------|---------|
| HP-1 | 모바일에서 채팅창이 첫 화면에 보임 | 스크롤 없이 입력창 접근 가능 | High |
| HP-2 | 면접 범주 칩 선택/해제 | 레이아웃 밀림 없이 배경/테두리 변경 | High |
| HP-3 | 면접 범주 칩이 줄바꿈됨 | 횡스크롤 없이 wrap | Medium |
| HP-4 | Placeholder 텍스트 전체 표시 | 잘리지 않음 | Medium |
| HP-5 | 샘플 프롬프트 2줄 이내 표시 | line-clamp 적용 | Low |

자세한 체크리스트는 PR 코멘트 또는 QA 팀에 공유 예정.
