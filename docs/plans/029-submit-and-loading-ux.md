# #29 면접 제출 실패 및 질문 생성 로딩 UX 개선

## Overview

면접 페이지에서 제출하기 버튼이 동작하지 않는 버그 수정 및 질문 생성 시 로딩 UX 개선.

### 문제 정의

1. **제출 실패**: `isLoggedIn()` 함수의 race condition으로 인해 로그인 상태에서도 제출이 안 됨
2. **로딩 UX 부족**: 질문 생성 시 1.8초만에 애니메이션 종료, 실제 API 8-20초+ 소요 → UX 공백

### 목표

- 면접 제출이 안정적으로 동작하도록 인증 방식 변경
- AI 사고 과정 스타일의 로딩 UX로 대기 경험 개선

## Requirements

### 기능 요구사항

- FR-1: 로그인된 상태에서 제출하기 클릭 시 정상적으로 제출
- FR-2: 제출 중 로딩 표시 및 중복 클릭 방지
- FR-3: 질문 생성 시 6단계 자연스러운 진행 표시

### 기술 요구사항

- TR-1: `isLoggedIn()` 대신 `supabase.auth.getUser()` 비동기 호출
- TR-2: `isSubmitting` 상태로 모든 제출 버튼 비활성화
- TR-3: SEARCH_STEPS를 API 응답시간에 동기화

## Implementation Plan

### Phase 1: 제출 버그 수정

- `handleSubmit`에서 동기적 `isLoggedIn()` → 비동기 `supabase.auth.getUser()`
- `isSubmitting` 상태 추가
- 3개 제출 버튼 (사이드바, 내비게이션, 모바일) 모두 업데이트

### Phase 2: 로딩 UX 개선

- SEARCH_STEPS 6단계로 확장
- 타이밍: 2초 간격 자동 진행, API 완료 시 잔여 단계 빠르게 마무리
- 헤더: Sparkles 아이콘 + ping 애니메이션
- 완료된 단계: "~하고 있어요" → "~완료" 텍스트 변환

## Quality Gates

- [x] Build: Success
- [x] Type Check: Passed
- [x] Lint: Passed (0 new errors)

## References

- Issue: #29
- Related: #27 (auth session race condition - 동일 근본 원인)

---

## Implementation Summary

**Completion Date**: 2026-02-09
**Implemented By**: Claude Opus 4.6

### Changes Made

#### Files Modified

- [src/app/interview/page.tsx](src/app/interview/page.tsx) - 제출 인증을 비동기 `getUser()`로 변경, `isSubmitting` 상태 추가, 3개 버튼 모두 로딩 UI 적용
- [src/app/search/page.tsx](src/app/search/page.tsx) - 로딩 진행 타이밍을 API 응답에 동기화, 헤더 디자인 개선, 완료 단계 텍스트 전환
- [src/data/dummy-questions.ts](src/data/dummy-questions.ts) - SEARCH_STEPS를 3단계 → 6단계로 확장 (AI 사고 과정 스타일)

#### Key Implementation Details

- `isLoggedIn()` (동기, race condition) → `supabase.auth.getUser()` (비동기, 확실한 인증 확인)
- 기존 600ms 고정 인터벌 → 2초 인터벌 + API 완료 시 잔여 단계 300ms 마무리
- Sparkles 아이콘 + `animate-ping` 효과로 "AI 작업 중" 시각적 피드백 강화

### Quality Validation

- [x] Build: Success
- [x] Type Check: Passed
- [x] Lint: Passed (0 new errors, 1 pre-existing warning)

### Deviations from Plan

**None** - 계획대로 구현됨

### Performance Impact

- 번들 크기 변화 없음 (기존 import 재활용)
- 런타임 성능 영향 없음

### Notes

- `isLoggedIn()` race condition은 #27에서 수정한 Google 로그인 세션 문제와 같은 근본 원인
- 케이스 스터디 면접 페이지는 이미 `isSubmitting` 상태가 있어 수정 불필요
