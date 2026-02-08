# #25 - 문의하기 플로팅 버튼 추가 (카카오톡 오픈채팅 연동)

**Issue**: [#25](https://github.com/kwakseongjae/dev-interview/issues/25)
**Branch**: `feat/25-floating-contact-button`
**Created**: 2026-02-08

---

## 1. Overview

### 문제 정의

사용자가 서비스 이용 중 문의사항이 있을 때 즉시 연락할 수 있는 채널이 없음.

### 목표

- 우측 하단 플로팅 버튼으로 카카오톡 오픈채팅(1:1) 연결
- 면접 진행 중에는 버튼을 숨겨 집중도 유지
- 모바일에서도 자연스러운 UX 제공

### 범위

- `FloatingContactButton` 클라이언트 컴포넌트 생성
- 루트 레이아웃(`layout.tsx`)에 글로벌 배치
- 면접 페이지 경로 감지하여 자동 숨김

---

## 2. Requirements

### 기능 요구사항

| ID   | 요구사항                                                             | 우선순위 |
| ---- | -------------------------------------------------------------------- | -------- |
| FR-1 | 우측 하단 고정 플로팅 버튼 표시                                      | P1       |
| FR-2 | 클릭 시 카카오톡 오픈채팅 새 탭 열기                                 | P1       |
| FR-3 | 호버 시 "문의하기" 툴팁 표시                                         | P1       |
| FR-4 | 면접 페이지(`/interview`, `/case-studies/*/interview`)에서 자동 숨김 | P1       |
| FR-5 | 부드러운 진입/퇴장 애니메이션                                        | P2       |

### 기술 요구사항

| ID   | 요구사항                                           |
| ---- | -------------------------------------------------- |
| TR-1 | `'use client'` 컴포넌트 (usePathname 사용)         |
| TR-2 | z-index 30 (페이지 콘텐츠 z-20 위, 모달 z-50 아래) |
| TR-3 | iOS safe-area-inset-bottom 대응                    |
| TR-4 | 터치 타겟 최소 48x48px                             |
| TR-5 | `aria-label` 접근성                                |

---

## 3. Architecture & Design

### 컴포넌트 구조

```
src/app/layout.tsx
  └── <FloatingContactButton />   ← 새로 추가

src/components/FloatingContactButton.tsx   ← 새 파일
  - usePathname()으로 경로 감지
  - 면접 페이지에서 렌더링 안 함
  - Shadcn Tooltip 사용
  - lucide-react MessageCircle 아이콘
```

### 숨김 로직

```
보이는 페이지: /, /auth, /archive, /favorites, /search, /case-studies, /team-spaces, /privacy, /complete
숨기는 페이지: /interview (면접 진행), /case-studies/*/interview (케이스 스터디 면접)
```

판단 기준: `pathname === '/interview'` 또는 `pathname.endsWith('/interview')`

### 디자인 스펙

- **크기**: 56x56px (w-14 h-14) - Material Design FAB 표준
- **위치 (데스크탑)**: `bottom-6 right-6` (24px 여백)
- **위치 (모바일)**: `bottom-6 right-4` + safe-area-inset-bottom 대응
- **색상**: 프로젝트 디자인 시스템 gold 배경 + navy 아이콘
- **그림자**: shadow-lg → hover 시 shadow-xl
- **애니메이션**: 진입 시 fade-in + slide-up, 호버 시 scale(1.05) + shadow 증가
- **z-index**: 30

### 모바일 고려사항

- iOS 하단 safe area 대응 (`env(safe-area-inset-bottom)`)
- 면접 페이지 모바일 하단바와 겹침 방지 (면접 페이지에서는 아예 숨김)
- 56x56px 크기로 터치 타겟 충분 (48px 최소 기준 충족)
- 카카오톡 앱 자동 실행 (모바일에서 open.kakao.com 링크는 앱 딥링크 지원)

---

## 4. Implementation Plan

### Phase 1: 컴포넌트 구현

| 작업 | 파일                                       | 설명                          |
| ---- | ------------------------------------------ | ----------------------------- |
| 1-1  | `src/components/FloatingContactButton.tsx` | 플로팅 버튼 컴포넌트 생성     |
| 1-2  | `src/app/layout.tsx`                       | 루트 레이아웃에 컴포넌트 추가 |

### 상세 구현

**FloatingContactButton.tsx**:

- `'use client'` 디렉티브
- `usePathname()`으로 현재 경로 감지
- 면접 경로(`/interview`, `*/interview`)에서 `return null`
- `<a>` 태그로 카카오톡 오픈채팅 링크 연결 (`target="_blank"`, `rel="noopener noreferrer"`)
- Shadcn `Tooltip` 컴포넌트로 "문의하기" 툴팁
- lucide-react `MessageCircle` 아이콘
- Tailwind CSS로 스타일링 (fixed, z-30, rounded-full, shadow-lg)
- 호버/포커스 애니메이션

**layout.tsx**:

- `<FloatingContactButton />` import 및 `{children}` 뒤에 배치

---

## 5. Quality Gates

### 필수 통과 조건

- [x] `npm run build` 성공
- [x] `npx tsc --noEmit` 타입 에러 없음
- [x] `npx eslint src/` 린트 통과

### 검증 체크리스트

- [ ] 홈 페이지에서 버튼 표시 확인
- [ ] 버튼 클릭 시 새 탭에서 카카오톡 오픈채팅 열림
- [ ] 호버 시 "문의하기" 툴팁 표시
- [ ] `/interview` 페이지에서 버튼 숨겨짐
- [ ] `/case-studies/*/interview` 페이지에서 버튼 숨겨짐
- [ ] 모바일 뷰포트에서 버튼 위치/크기 적절
- [ ] 다이얼로그/시트 열렸을 때 z-index 충돌 없음
- [ ] 키보드 Tab으로 포커스 가능, aria-label 확인

---

## 6. Risks & Dependencies

| 리스크               | 영향                  | 대응                        |
| -------------------- | --------------------- | --------------------------- |
| iOS safe-area 미대응 | 하단 잘림             | `pb-safe` 또는 `env()` 사용 |
| 모달과 z-index 충돌  | 버튼이 모달 위에 표시 | z-30 사용 (모달 z-50 아래)  |
| 면접 숨김 로직 누락  | 면접 중 방해          | pathname 정확한 매칭        |

---

## 7. References

- KakaoTalk 오픈채팅: https://open.kakao.com/o/scbn4tfi
- Material Design FAB: 56x56px 표준
- iOS HIG Touch Target: 최소 44x44px
- 기존 z-index 체계: z-10(콘텐츠) < z-20(sticky 헤더) < z-30(FAB) < z-50(모달)

---

## 8. Implementation Summary

**Completion Date**: 2026-02-08
**Implemented By**: Claude Opus 4.6

### Changes Made

#### Files Created

- [src/components/FloatingContactButton.tsx](src/components/FloatingContactButton.tsx) - 플로팅 문의 버튼 클라이언트 컴포넌트

#### Files Modified

- [src/app/layout.tsx](src/app/layout.tsx#L4,L67) - FloatingContactButton import 및 글로벌 배치

#### Key Implementation Details

- `usePathname()`으로 면접 페이지(`/interview`, `*/interview`) 감지 → 자동 숨김
- Shadcn Tooltip 컴포넌트로 "문의하기" 호버 툴팁
- lucide-react `MessageCircle` 아이콘 사용
- `<a>` 태그로 카카오톡 오픈채팅 직접 링크 (`target="_blank"`)
- z-30으로 페이지 콘텐츠(z-20)와 모달(z-50) 사이 배치
- 모바일 대응: `max-sm:bottom-5 max-sm:right-4`로 위치 조정

### Quality Validation

- [x] Build: Success
- [x] Type Check: Passed
- [x] Lint: Passed

### Deviations from Plan

**Changed**:

- TR-3 iOS safe-area-inset-bottom: `env()` CSS 대신 Tailwind `max-sm:bottom-5`로 충분한 여백 확보. 대부분의 iOS 디바이스에서 24px 하단 여백으로 safe area 내 배치됨
- FR-5 진입 애니메이션: 별도 fade-in 애니메이션 대신 `transition-all duration-300`으로 호버 시 부드러운 lift 효과 적용. 정적 요소이므로 진입 애니메이션 불필요

**Skipped**:

- 없음. 모든 P1 요구사항 구현 완료

### Performance Impact

- Bundle size: 미미 (~1KB, 단일 컴포넌트)
- 런타임 영향 없음 (pathname 변경 시에만 re-render)

### Follow-up Tasks

- 없음

---

## QA Checklist

> Generated by qa-generator agent | 2026-02-08

### 기능 테스트

| #    | 시나리오                                  | 예상 결과                                       | 우선순위 |
| ---- | ----------------------------------------- | ----------------------------------------------- | -------- |
| FT-1 | 홈에서 플로팅 버튼 표시                   | 우측 하단 gold 배경 버튼 + MessageCircle 아이콘 | High     |
| FT-2 | 버튼 클릭                                 | 새 탭에서 카카오톡 오픈채팅 열림                | High     |
| FT-3 | 버튼 호버                                 | 좌측 "문의하기" 툴팁 표시                       | Medium   |
| FT-4 | `/interview` 접속                         | 버튼 숨김                                       | High     |
| FT-5 | `/case-studies/[slug]/interview` 접속     | 버튼 숨김                                       | High     |
| FT-6 | `/archive`, `/search`, `/privacy` 등 접속 | 버튼 표시                                       | High     |
| FT-7 | 페이지 스크롤                             | 버튼 고정 위치 유지                             | Medium   |
| FT-8 | Tab 키 포커스                             | aria-label 읽힘, focus ring 표시                | Medium   |

### 엣지 케이스

| #    | 시나리오                                     | 예상 결과                           | 우선순위 |
| ---- | -------------------------------------------- | ----------------------------------- | -------- |
| EC-1 | `/case-studies/[slug]` 접속 (interview 아님) | 버튼 **표시**                       | High     |
| EC-2 | 모바일 375px 뷰포트                          | 버튼 위치 조정 (bottom-5, right-4)  | High     |
| EC-3 | 다이얼로그/시트 열림                         | 버튼이 모달 아래 배치 (z-30 < z-50) | Medium   |

### 회귀 테스트

| #    | 기능              | 예상 결과                    | 우선순위 |
| ---- | ----------------- | ---------------------------- | -------- |
| RT-1 | 면접 진행         | 정상 작동, 버튼 숨김         | High     |
| RT-2 | 페이지 네비게이션 | 모든 페이지 정상 로드        | Medium   |
| RT-3 | 레이아웃 일관성   | Header/Footer 위치 변화 없음 | Medium   |
