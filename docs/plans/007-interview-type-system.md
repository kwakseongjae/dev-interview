# Plan: 면접 범주(Interview Type) 시스템 구현

**Issue**: [#7](https://github.com/kwakseongjae/dev-interview/issues/7) - 면접 범주 시스템 구현
**Branch**: `feat/7-interview-type-system`
**Created**: 2026-02-05
**Status**: Implemented

---

## 1. Overview

### Problem Statement

사용자 행동 패턴 분석 결과 세 가지 범주로 면접 사용 패턴이 나뉨:

- **CS 기초**: 운영체제, 네트워크, 알고리즘, 자료구조, 데이터베이스
- **프로젝트 기반**: 프로젝트 경험, 기술 선택 이유, 트러블슈팅
- **시스템 설계**: 대용량 트래픽, 아키텍처 설계, 확장성

### Objectives

1. 면접 범주 선택 UI 제공
2. 범주별 특화 AI 프롬프트로 맞춤 질문 생성
3. 아카이브에서 범주별 필터링

---

## 2. Implementation Summary

**Completion Date**: 2026-02-05
**Implemented By**: Claude Opus 4.5

### Changes Made

#### Database (Supabase MCP)

- `interview_types` 테이블 생성 (3개 범주 seed)
- `interview_sessions`에 `interview_type_id` FK 추가
- RLS 정책: 모든 사용자 읽기 허용

#### Files Created

- `src/app/api/interview-types/route.ts` - 면접 범주 목록 API
- `src/components/InterviewTypeSelector.tsx` - 범주 선택 카드 컴포넌트

#### Files Modified

- `src/types/database.ts` - interview_types 테이블 타입
- `src/types/interview.ts` - InterviewTypeCode, InterviewTypeInfo 인터페이스
- `src/lib/api.ts` - getInterviewTypesApi, createSessionApi 확장
- `src/lib/claude.ts` - 범주별 특화 프롬프트 (INTERVIEW_TYPE_PROMPTS)
- `src/app/page.tsx` - 홈페이지에 InterviewTypeSelector 추가
- `src/app/search/page.tsx` - interview_type 파라미터 처리
- `src/app/archive/page.tsx` - 범주별 필터 버튼
- `src/app/api/sessions/route.ts` - interview_type_id 저장/필터링
- `src/app/api/questions/generate/route.ts` - interview_type 전달

### Key Implementation Details

1. **AI 프롬프트 특화**:
   - CS 기초: 이론적 개념 설명, 장단점, 적용 상황
   - 프로젝트 기반: STAR 기법, 트레이드오프, 구체적 경험
   - 시스템 설계: 규모 고려, 아키텍처, 병목점 분석

2. **UI/UX 개선**:
   - 카드 높이 고정으로 layout shift 방지
   - 설명 항상 표시로 가독성 향상
   - "이 분야 맞춤 질문 생성" 가치 전달 문구

3. **하위 호환성**:
   - 기존 세션은 `interview_type_id = null` 유지
   - 범주 선택은 선택적 (미선택 시 기존 로직)

### Quality Validation

- [x] Build: Success
- [x] Type Check: Passed
- [x] RLS Security: interview_types 테이블 정책 적용

### Deviations from Original Plan

**Added**:

- 로딩 상태에서 스켈레톤 표시 (layout shift 방지)
- 호버/클릭 애니메이션 제거 (사용자 피드백 반영)

**Changed**:

- InterviewTypeInfo.code 타입: `InterviewTypeCode` → `string` (API 호환성)

### Follow-up Tasks

- 없음
