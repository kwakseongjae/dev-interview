# 작업 관리 시스템

> CLAUDE.md의 작업 관리 시스템 상세 설명

---

## 개요

구조화된 작업 계획 및 문서화 워크플로우를 제공합니다.

**목적**:

- 체계적인 작업 계획 수립
- Vercel React Best Practices 자동 적용
- 작업 완료 후 자동 문서화
- 계획 대비 실제 구현 추적

---

## Skills

### task-init (`.claude/skills/task-init/`)

작업 시작 시 계획 수립 및 환경 설정

#### 사용법

```bash
/task-init                           # 이슈만 분석
/task-init "추가 설명"               # 이슈 + 텍스트
/task-init [이미지 첨부]             # 이슈 + 이미지
/task-init "설명" [이미지]           # 이슈 + 텍스트 + 이미지
```

**입력 옵션**:

- 인자 없음: GitHub 이슈만 분석
- 텍스트: 추가 요구사항, 제약사항, 구현 선호도
- 이미지: 디자인 목업, 스크린샷, 다이어그램, 에러 메시지 등
- 둘 다: 텍스트 설명 + 시각적 레퍼런스

#### 단계별 프로세스

**1. 컨텍스트 수집**

**A. GitHub 이슈 분석**:

```bash
gh issue view {issue_number}
```

- 요구사항, 레이블, Acceptance Criteria 파싱
- 작업 타입 식별 (feature/bug/enhancement/refactor)

**B. 사용자 입력 처리** (제공된 경우):

- **텍스트 입력**: 추가 요구사항, 제약사항, 구현 선호도 파싱
- **이미지 입력**: 디자인 목업, 버그 재현 스크린샷, 아키텍처 다이어그램 분석

**C. 통합 분석**:

- GitHub 이슈와 사용자 컨텍스트 병합
- 충돌 또는 모호함 해결
- 명시적 사용자 지시사항 우선순위 부여

**2. 코드베이스 탐색 (Enhanced with Parallel Sub-Agents)**

🚀 **핵심 개선**: 최소 3개의 서브에이전트를 병렬로 실행하여 탐색 효율성 극대화

- **Agent 1 (Directory Explorer)**: 디렉토리 구조 매핑, 관련 파일 식별
- **Agent 2 (Similar Implementation Finder)**: 유사한 패턴, 재사용 가능한 코드 탐색
- **Agent 3 (Documentation Researcher)**: 라이브러리 문서, Best Practices 리서치

**병렬 실행 패턴**:

- 단일 메시지에서 3개의 Task tool 호출
- 각 에이전트가 독립적으로 동시 실행
- 완료 후 결과 집계 및 통합

**장점**:

- ⚡ 빠른 계획 수립 (병렬 처리)
- 🎯 포괄적인 컨텍스트 (다각도 분석)
- 💡 높은 계획 품질 (다양한 관점)

**3. 리서치**

- 생소한 라이브러리 문서 검색
- React/Next.js Best Practices 확인
- 적용 가능한 Vercel React 규칙 식별

**4. 계획 문서 생성**
위치: `docs/plans/{issue_number}-{description}.md`

템플릿 구조 (10개 섹션):

1. Overview - 문제 정의, 목표, 범위
2. Requirements - 기능/기술/비기능 요구사항
3. Architecture & Design - 설계 결정, 컴포넌트 구조
4. Implementation Plan - 작업 분해, 파일 목록
5. Quality Gates - 테스트 전략, 검증 체크리스트
6. Risks & Dependencies - 리스크, 의존성
7. Rollout & Monitoring - 배포 전략, 성공 지표
8. Timeline & Milestones - 마일스톤
9. References - 관련 이슈, 문서
10. Implementation Summary - 작업 완료 후 자동 생성

**5. 서브에이전트 설정**

생성되는 에이전트:

- `react-developer`: React/Next.js 컴포넌트 구현
  - vercel-react-best-practices skill 활성화
  - 작업 타입별 포커스 (async-_, bundle-_, rerender-_, server-_)
- `code-reviewer`: 코드 품질 및 성능 리뷰
- `test-writer`: 테스트 생성/업데이트
- `doc-writer`: 문서화 (필요 시)
- `qa-generator`: 작업 완료 시 QA 체크리스트 자동 생성 (task-done에서 호출)

**6. 사용자 승인**

- 계획 요약 제시
- 서브에이전트 목록 표시
- "Plan created. Ready to start implementation?" 확인

### task-done (`.claude/skills/task-done/`)

작업 완료 시 문서화 및 정리

#### 단계별 프로세스

**1. 계획 문서 찾기**

```bash
# 현재 브랜치에서 이슈 번호 추출
git branch --show-current
# feat/25-add-feature → 25

# 계획 문서 찾기
ls docs/plans/025-*.md
```

**2. 구현 요약 생성**

자동 수집 정보:

```bash
# 변경된 파일
git diff --name-only main...HEAD

# 커밋 히스토리
git log main..HEAD --oneline

# 품질 메트릭
npm run build
npx tsc --noEmit
npm run lint
```

**3. Summary 구조**

```markdown
---

## Implementation Summary

**Completion Date**: 2026-01-22
**Implemented By**: Claude Sonnet 4.5

### Changes Made

- [file1.ts](path/to/file1.ts#L42-51) - 변경 내용

### Quality Validation

- [x] Build: Success
- [x] Type Check: Passed
- [x] Lint: Passed

### Deviations from Plan

**Added**: 계획에 없던 추가 사항
**Changed**: 계획과 다른 접근
**Skipped**: 미뤄진 작업 (follow-up 이슈 생성)

### Performance Impact

- Bundle size: +2.3KB
- No runtime impact

### Commits

\`\`\`
abc1234 - feat: Add dark mode toggle
def5678 - style: Update theme colors
\`\`\`

### Follow-up Tasks

- [ ] #26 - Add theme transition animation
```

**4. 품질 게이트 검증**

필수 통과 조건:

1. ✅ Build 성공
2. ✅ TypeScript 에러 없음
3. ✅ Lint 통과
4. ✅ 계획 문서 존재
5. ✅ 최소 1개 파일 변경

실패 시:

- 구체적 에러 메시지 제공
- 작업 완료 불가
- 수정 후 재시도 안내

**5. 서브에이전트 정리**

- 생성된 에이전트 목록 표시
- 각 에이전트가 완료한 작업 요약
- 에이전트 레퍼런스 제거

**6. 다음 단계 안내**

```
Task completed and documented!

Next steps:
- Review: docs/plans/{issue_number}-*.md
- Run `/commit` to create commit
- Run `/pr` to create pull request

Would you like me to proceed with creating a PR?
```

---

## 계획 문서 템플릿

위치: `docs/plans/TEMPLATE.md`

### 핵심 원칙

1. **구체성**: 모호한 표현 금지, 명확한 파일 경로와 함수명
2. **측정 가능성**: Success Criteria는 검증 가능해야 함
3. **Best Practices 참조**: 적용할 Vercel React 규칙 명시
4. **Trade-offs 문서화**: 설계 결정의 근거와 대안

### 섹션별 작성 가이드

**Overview**: 3-5문장으로 문제와 목표 설명
**Requirements**: 각 요구사항에 ID 부여 (FR-1, TR-1, NFR-1)
**Architecture**: 다이어그램 또는 코드 구조도 포함
**Implementation Plan**: 3단계로 분해 (Setup, Core, Polish)
**Quality Gates**: 테스트 케이스와 검증 방법 구체화

---

## 통합 포인트

### /commit과의 통합

- Implementation Summary에서 커밋 메시지 생성
- 변경 파일 목록 자동 참조

### /pr과의 통합

- 계획 문서 Summary를 PR 본문으로 활용
- Test plan 자동 생성

### vercel-react-best-practices와의 통합

- 계획 단계에서 적용할 규칙 식별
- 구현 단계에서 자동 적용
- 완료 단계에서 적용 여부 검증

---

## 히스토리 관리

계획 문서는 Git으로 버전 관리:

- 프로젝트 진행 과정 추적
- 의사 결정 근거 보존
- 팀 지식 베이스 구축

검색 방법:

```bash
# 모든 계획 문서 목록
ls docs/plans/

# 특정 이슈 번호로 검색
ls docs/plans/025-*.md

# 내용 검색
grep -r "dark mode" docs/plans/
```

---

**마지막 업데이트**: 2026-02-03
