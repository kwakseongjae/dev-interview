# CLAUDE.md

> Claude Code가 이 프로젝트에서 작업할 때 따라야 할 핵심 규칙입니다.
> 자세한 내용은 `.claude/rules/`를 참조하세요.

---

## WHY: 프로젝트 목적

**mochabun (DevInterview)**: AI 기반 개발자 기술면접 준비 서비스

- 개발자가 기술면접을 효과적으로 준비할 수 있도록 AI 기반 맞춤형 질문 생성
- 경력, 포지션, 기술 스택에 맞는 면접 질문 자동 생성
- 타이머, 힌트 기능을 통한 실전 연습 환경 제공
- 팀 스페이스를 통한 협업 학습 지원

---

## WHAT: 기술 스택 & 구조

### Stack

- **Framework**: Next.js 16 (App Router) + React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4
- **UI**: Radix UI, Shadcn
- **Database**: Supabase
- **AI**: Anthropic Claude

### Structure

```
src/
├── app/           # Next.js App Router (pages, layouts, API routes)
├── components/    # React 컴포넌트
│   └── ui/        # UI 컴포넌트 (Shadcn)
├── lib/           # 유틸리티, API, 인증, AI 로직
├── hooks/         # React hooks
├── data/          # 더미 데이터
├── types/         # TypeScript 타입
└── assets/        # 이미지 등 자산
```

---

## HOW: 작업 방법

### 1. 품질 검증

모든 코드 변경 후 반드시:

```bash
npm run build      # 빌드 성공 필수
npm run lint       # 린트 오류 수정 필수
npx tsc --noEmit   # 타입 오류 수정 필수
```

### 2. 워크플로우

**전통적인 브랜치 방식**:

```bash
/issue-start <description>  # 이슈 생성 + 브랜치 생성
/task-init ["설명"] [이미지] # 작업 계획 수립 (+ 추가 컨텍스트)
# ... 구현 ...
/task-done                  # 작업 완료 문서화 + QA 체크리스트 생성
/commit                     # 커밋
/pr                         # PR 생성
/commit-push-pr             # 커밋 + 푸시 + PR (원스텝)
```

**Worktree 방식 (병렬 작업 가능)**:

```bash
/issue-start <description>     # 이슈 생성 + 브랜치 생성
# "워크트리로 만들어줘" 요청     # worktree skill 적용
/task-init ["설명"] [이미지]   # 작업 계획 수립 (3+ 서브에이전트 병렬 실행)
# ... 구현 ...
/task-done                     # 작업 완료 문서화 + QA 체크리스트 생성
/commit                        # 커밋
/pr                            # PR 생성
/commit-push-pr                # 커밋 + 푸시 + PR (원스텝)
/worktree-done                 # 워크트리 제거 + main 복귀
```

**task-init 특징**:

- 텍스트 설명, 이미지(디자인 목업/스크린샷), 또는 둘 다 추가 가능
- **3+ 서브에이전트를 병렬로 실행**하여 더 빠르고 철저한 계획 수립

자세한 워크플로우는 [.claude/rules/workflows.md](.claude/rules/workflows.md) 참조

### 3. React Best Practices

**자동 적용**: 모든 React/Next.js 코드는 Vercel React Best Practices를 따름

- Skills: `.claude/skills/vercel-react-best-practices/`
- 규칙: 45개 규칙 (8개 카테고리)
- 우선순위: async-_, bundle-_ (CRITICAL) → server-_ (HIGH) → rerender-_ (MEDIUM)

**서브에이전트**:

- `react-developer`: 코드 작성 시 자동 적용
- `code-reviewer`: 리뷰 시 규칙 검증
- `qa-generator`: 작업 완료 시 QA 체크리스트 자동 생성

### 4. 컨벤션

- **브랜치**: `{type}/{issue_number}-{slug}` (예: `feat/25-add-feature`)
- **커밋**: `type(scope): subject` + `Closes #123`
- **라벨**: `type:*`, `area:*`, `priority:*` (3개 필수)
- **계획 문서**: `docs/plans/{issue_number}-{description}.md`
- **스펙 문서**: `specs/{feature-name}/spec.md` (API/스키마 관련 이슈만, GitHub Issue 자동 링크)
- **이슈 제목**: `[Type] 한국어 제목` (예: `[Feature] 가격 페이지 추가`)
- **PR 제목**: `[#번호] Type: 한국어 제목` (예: `[#25] Feature: 가격 페이지 추가`)

### 5. Spec-Driven Development (선택적)

API/스키마 관련 작업 시 스펙 문서 자동 생성:

- `/task-init` 실행 시 트리거 조건 충족하면 `specs/{feature}/spec.md` 자동 생성 (GitHub Issue 자동 링크)
- `/spec {자연어 요청}`: 자연어로 스펙 관련 작업 요청 (예: "/spec 홈 배너 스펙 다시 작성해줘")
- `/task-done` 실행 시 스펙 문서 자동 업데이트

자세한 내용: `.claude/skills/speckit/SKILL.md`

---

## 참조 문서

### 작업 관리

- [작업 플래닝 상세 가이드](.claude/rules/task-management.md)

### 실수 & 해결

- [실수 기록 및 규칙](.claude/rules/mistakes.md)

### 데이터베이스

- [Supabase Timezone 규칙](.claude/rules/database.md)

### 프로젝트

- [PRD 문서](docs/PRD.md)

### Custom Commands

**Claude Code 커맨드** (`.claude/commands/`):

- `/issue-start`: 이슈 생성 + 브랜치 생성 (웹서핑/코드베이스 탐색 포함, worktree skill과 연동)
- `/task-init`: 작업 계획 수립 (텍스트/이미지 입력, 3+ 서브에이전트 병렬 실행, 조건부 스펙 생성)
- `/task-done`: 작업 완료 문서화 (품질 게이트 검증, QA 체크리스트 자동 생성, 스펙 업데이트)
- `/spec`: 스펙 문서 관리 (generate/validate/sync)
- `/commit`: Conventional Commits 커밋 생성
- `/pr`: Pull Request 생성
- `/commit-push-pr`: 커밋 + 푸시 + PR 원스텝 (빠른 작업 완료 시)
- `/worktree-done`: 워크트리 제거 + main 복귀 (worktree 사용 시)

**참고**: `.cursor/commands/`에도 동일한 커맨드 파일이 있어 Cursor IDE와 호환됩니다.

### Skills

- `vercel-react-best-practices`: React 성능 최적화 (`.claude/skills/vercel-react-best-practices/`)
- `speckit`: Spec-Driven Development 워크플로우 (`.claude/skills/speckit/`)
- `agentation`: UI 요소 시각적 피드백 및 CSS 셀렉터 추출 (`.claude/skills/agentation/`)
- `worktree`: Git worktree 병렬 작업 지원 (issue-start와 연동) (`.claude/skills/worktree/`)

---

**마지막 업데이트**: 2026-02-04
