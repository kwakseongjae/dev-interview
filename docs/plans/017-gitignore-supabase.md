# [#17] supabase 폴더 .gitignore 추가 및 트래킹 제거

## Overview

Supabase 로컬 설정 폴더(`supabase/`)가 Git에 트래킹되고 있어, 로컬 마이그레이션 파일이 레포에 포함되고 있음.
`.gitignore`에 추가하고 Git 캐시에서 제거하여 이후 supabase 관련 파일이 레포에 올라가지 않도록 함.

## Requirements

### 기능 요구사항

- FR-1: `.gitignore`에 `supabase/` 항목 추가
- FR-2: Git 캐시에서 supabase 폴더 제거 (`git rm --cached -r supabase/`)
- FR-3: 로컬 `supabase/` 폴더는 유지 (삭제하지 않음)

## Implementation Plan

### Phase 1: .gitignore 수정

1. `.gitignore` 파일에 `# supabase` 섹션 추가
2. `/supabase` 항목 추가

### Phase 2: Git 캐시 제거

1. `git rm --cached -r supabase/` 실행하여 트래킹 해제
2. 로컬 파일은 그대로 유지됨

### 변경 파일

| 파일               | 변경 내용             |
| ------------------ | --------------------- |
| `.gitignore`       | `supabase/` 항목 추가 |
| `supabase/` (삭제) | Git 캐시에서만 제거   |

## Quality Gates

- [x] `.gitignore`에 supabase 항목 존재
- [x] `git ls-files supabase/` 결과가 비어있음
- [x] 로컬 `supabase/` 폴더 존재 확인

---

## Implementation Summary

**Completion Date**: 2026-02-06
**Implemented By**: Claude Opus 4.6

### Changes Made

- `.gitignore` - `# supabase` 섹션 및 `/supabase` 항목 추가
- `supabase/migrations/20260205_add_model_answer.sql` - Git 캐시에서 제거
- `supabase/migrations/20260205_answer_feedback.sql` - Git 캐시에서 제거

### Quality Validation

- [x] Build: Success
- [x] Type Check: Passed
- [x] Lint: 기존 경고만 존재 (이번 변경과 무관)

### Deviations from Plan

None - 계획대로 구현 완료

### Notes

- 로컬 `supabase/` 폴더는 그대로 유지됨
- 이후 supabase 관련 파일은 Git에 트래킹되지 않음
