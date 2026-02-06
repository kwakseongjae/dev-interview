# 실수 기록 및 규칙

> Claude가 실수할 때마다 이 파일에 규칙을 추가합니다.
> 같은 실수를 반복하지 않기 위한 학습 문서입니다.

---

## 규칙 추가 형식

```markdown
### YYYY-MM-DD: [카테고리] 규칙 제목

- **실수**: 무엇을 잘못했는지
- **원인**: 왜 그런 실수가 발생했는지
- **규칙**: 앞으로 지켜야 할 규칙
- **참조**: 관련 문서 또는 이슈 번호
```

---

## 실수 기록

### 2026-01-22: [Settings] Claude Code 설정 형식

- **실수**: settings.json에서 잘못된 hooks/permissions 형식 사용
- **원인**: 새로운 Claude Code 설정 형식을 숙지하지 못함
- **규칙**:
  - Hooks: `PostToolUse`, `Stop` 등 PascalCase 사용
  - Permissions: `Bash(command:*)` 형식, prefix matching은 `:*` 사용
  - 공식 문서 참조: https://docs.anthropic.com/claude-code/hooks
- **참조**: `.claude/settings.json`

---

### 2026-01-22: [Task Management] 작업 관리 시스템 추가

- **추가**: `/task-init`, `/task-done` 커스텀 skill 생성
- **목적**: 구조화된 작업 계획 및 문서화 워크플로우 구축
- **혜택**:
  - 체계적인 작업 계획 수립 (GitHub 이슈 분석, 코드베이스 탐색, 레퍼런스 조사)
  - Vercel React best practices를 적용하는 서브에이전트 자동 설정
  - 작업 완료 후 자동 문서화 및 품질 검증
  - 계획 대비 실제 구현 내용 추적
  - `docs/plans/` 디렉토리에 히스토리 관리
- **참조**:
  - `.claude/skills/task-init/`
  - `.claude/skills/task-done/`
  - `docs/plans/TEMPLATE.md`

---

### 2026-01-22: [Documentation] CLAUDE.md 구조 개선

- **개선**: CLAUDE.md를 WHY-WHAT-HOW 구조로 재구성
- **원인**: 기존 문서가 너무 길고 구조가 불명확함
- **규칙**:
  - CLAUDE.md는 300줄 미만 유지 (60줄이 이상적)
  - WHY (프로젝트 목적), WHAT (기술 스택), HOW (작업 방법) 구조
  - Progressive Disclosure: 자세한 내용은 `.claude/rules/`로 분리
  - Instruction 개수 제한 (150-200개 이하)
  - 코드 스타일 가이드는 린터로 처리 (CLAUDE.md에 포함하지 않음)
- **참조**:
  - [Using CLAUDE.MD files](https://claude.com/blog/using-claude-md-files)
  - [Writing a good CLAUDE.md](https://www.humanlayer.dev/blog/writing-a-good-claude-md)
  - `.claude/rules/` 디렉토리

---

### 2026-02-03: [GitHub] 이슈/PR 제목 패턴 및 Assignee 필수화

- **실수**: 이슈와 PR 제목이 일관되지 않고, assignee가 설정되지 않음
- **원인**: 명시적인 패턴 규칙이 없었음
- **규칙**:
  - 이슈 제목: `[Type] 한국어 제목` (예: `[Feature] 가격 페이지 추가`)
  - PR 제목: `[#번호] Type: 한국어 제목` (예: `[#25] Feature: 가격 페이지 추가`)
  - Assignee: 반드시 `get_me` 호출 후 현재 사용자 설정
- **참조**: #79, `.claude/commands/issue-start.md`, `.claude/commands/pr.md`

---

### 2026-02-03: [GitHub] Repository Owner 확인

- **실수**: GitHub MCP 호출 시 잘못된 owner 사용
- **원인**: git remote에서 owner를 확인하지 않음
- **규칙**:
  - GitHub MCP 호출 전 `gh repo view --json name,owner` 또는 `git remote -v`로 owner 확인
  - 브랜치 파싱 시 remote URL에서 추출
- **참조**: #79

---

### 2026-02-03: [Branch] dev → main 브랜치 전환

- **실수**: 더 이상 사용하지 않는 `dev` 브랜치 참조가 프롬프트에 남아있음
- **원인**: 브랜치 전략 변경 후 문서 업데이트 누락
- **규칙**:
  - 베이스 브랜치는 `main` 사용
  - `git diff dev..HEAD` → `git diff main..HEAD`
  - 브랜치 전략 변경 시 모든 프롬프트 파일 일괄 검색/수정
- **참조**: #79

---

### 2026-02-06: [GitHub] Repository Name 확인 (owner뿐 아니라 repo도)

- **실수**: GitHub 이슈 생성 시 repo name을 `mochabun`으로 사용했으나 실제 remote repo name은 `dev-interview`
- **원인**: 프로젝트 디렉토리명(`mochabun`)과 GitHub repo name(`dev-interview`)이 다름
- **규칙**:
  - GitHub MCP 호출 전 반드시 `git remote -v`로 owner **와 repo name** 모두 확인
  - 디렉토리명을 repo name으로 추측하지 않기
- **참조**: #13

---

### 2026-02-06: [SEO] 프로덕션 도메인 하드코딩 주의

- **실수**: 코드 전반에 `mochabun.com`을 하드코딩했으나 실제 프로덕션 도메인은 `mochabun.co.kr`
- **원인**: 프로젝트 초기 설정 시 도메인을 확인하지 않고 추정으로 작성
- **규칙**:
  - SEO 관련 URL(canonical, sitemap, robots, og:url)은 반드시 실제 프로덕션 도메인 확인 후 설정
  - 가능하면 환경변수(`NEXT_PUBLIC_SITE_URL`)로 관리하여 하드코딩 방지
  - 도메인 리다이렉트(www ↔ non-www) 설정도 검색엔진 인증에 영향을 줌
- **참조**: #13, #15

---

### 2026-02-06: [SEO] verification.other에 spread 연산자 사용 지양

- **실수**: `verification.other`에서 `...(condition && { key: value })` 패턴 사용
- **원인**: 환경변수가 없을 때 빈 키를 방지하려는 의도였으나 불필요한 복잡성
- **규칙**:
  - Next.js metadata의 `verification.other`는 직접 할당 + nullish coalescing 사용
  - `"naver-site-verification": process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION ?? ""`
  - 공식 문서 패턴을 따르는 것이 가장 안전
- **참조**: #15, Next.js generate-metadata 문서

---

## 향후 개선 사항

### 추가할 규칙

- [ ] 성능 최적화 실수 패턴
- [ ] 타입스크립트 일반적인 오류
- [ ] Next.js App Router 실수 사례
- [ ] Stripe 통합 주의사항

### 문서 구조 개선

- [ ] 카테고리별 분류 (Settings, Documentation, Code Quality, etc.)
- [ ] 검색 가능한 태그 시스템
- [ ] 자주 발생하는 실수 TOP 10

---

**마지막 업데이트**: 2026-02-06
