# Issue Start Command

## Description

**Create GitHub issue from description → analyze codebase & research → generate branch → checkout locally for immediate work**

이 커맨드는:

- 📝 작업 설명 분석 (타입, 우선순위, 영역 자동 판단)
- 🔍 코드베이스 탐색 + 웹 리서치로 이슈 내용 강화
- 🏷️ GitHub 이슈 생성 (자동 라벨링, 템플릿 적용)
- 🌿 브랜치 생성 및 로컬 체크아웃 (`{type}/{issue_number}-{slug}`)
- ✅ 바로 작업 시작 가능한 상태로 만듦

**다음 단계**: `/task-init`으로 작업 계획 수립

## Usage

```
/issue-start <task description>
```

## Workflow

### Step 1: Task Analysis

Use the `task-analyzer` skill to analyze the user's task description and extract:

- Type (feat/fix/chore/docs/refactor/test)
- Title and description
- Branch slug
- Labels (type, area, priority)
- Scope

### Step 2: Research and Codebase Exploration

Before creating the GitHub issue, perform research to enrich the issue with proper context:

**A. Directory and File Search**:

1. Use Glob tool to find relevant files based on task type:
   - For UI/component tasks: Search for related components (`**/*.tsx`, `**/*.ts` in `src/components`, `src/app`)
   - For API/backend tasks: Search for API routes, server actions (`**/api/**/*.ts`, `**/actions/**/*.ts`)
   - For styling tasks: Search for CSS/styling files (`**/*.css`, `**/globals.css`)
   - For configuration tasks: Search for config files (`*.config.*`, `.env*`, `package.json`)

2. Use Grep tool to search for keywords related to the task:
   - Search for function names, component names, or feature names mentioned in the task
   - Search for existing patterns or similar implementations
   - Example: If task is "add dark mode", search for "theme", "dark", "light" in codebase

**B. Web Research** (if needed):

1. Search for relevant documentation or best practices if:
   - The task involves unfamiliar libraries or frameworks
   - The task requires implementation of complex patterns
   - The task mentions specific technologies or APIs

2. Use WebSearch or WebFetch to:
   - Find official documentation for libraries being used
   - Search for React/Next.js best practices related to the task
   - Look up implementation examples or patterns

**C. Context Analysis**:

1. Combine findings from directory search, file search, and web research
2. Identify:
   - Existing files that will need modification
   - Similar implementations that can be referenced
   - Potential dependencies or affected areas
   - Best practices or patterns to follow
3. Use this enriched context to enhance the issue description

### Step 3: Create GitHub Issue

1. Read the issue template from `.github/ISSUE_TEMPLATE/issue_template.md`
2. Parse the template:
   - Extract YAML frontmatter (if present) - this contains default labels
   - Extract markdown body sections
3. Fill the template with analyzed information from task-analyzer (only fill relevant sections):
   - **Title**: **MUST use `[Type] {title}` format** where `{title}` comes from task-analyzer output
     - **⚠️ CRITICAL**: Title MUST start with `[Type]` prefix - this is required for consistency
     - Map type label to `[Type]` prefix:
       - `type:feature` → `[Feature]`
       - `type:bug` → `[Bug]`
       - `type:enhancement` → `[Enhancement]`
       - `type:refactor` → `[Refactor]`
       - `type:docs` → `[Docs]`
       - `type:test` → `[Test]`
       - `type:chore` → `[Chore]`
     - Example: `[Feature] 가격 페이지 요금제 비교 테이블 추가`
   - **분류 (필수) 섹션**: Always fill
     - type: Use the label from task-analyzer (e.g., `type:feature` → `type:feature`)
     - area: Use the area label from task-analyzer (e.g., `area:frontend`)
     - priority: Use the priority label from task-analyzer (e.g., `priority:medium`)
   - **배경**: Fill if task-analyzer provides context or description
   - **현상/요구사항**: Always fill - use the `title` and `description` from task-analyzer
   - **재현 방법 (버그일 때)**: **Only include this section if type is `fix` or label contains `type:bug`**. For non-bug issues, omit this section entirely from the body.
   - **기대 결과**: Fill if clear from task description - what should happen after completion
   - **영향 범위**: Fill if the task affects multiple parts of the system, otherwise omit
   - **완료 조건**: Fill if clear acceptance criteria can be derived from the task
   - **참고 링크**: Only include if task-analyzer identifies relevant links, otherwise omit

   **Important**: Do not force-fill sections. Only include sections that have meaningful content based on the task analysis. Empty sections should be omitted from the final issue body.

4. Apply labels from task-analyzer output (these override any default labels from template frontmatter)
   - **Must include exactly 3 labels**: one from each tier (type, area, priority)
   - Example: `["type:feature", "area:frontend", "priority:medium"]`
   - Ensure all three tiers are present: type, area, and priority
5. Use GitHub MCP `issue_write` with method `create`:
   - owner: Extract from current git remote (or use `kwakseongjae` if in that repo)
   - repo: Extract from current git remote (or use `mochabun` if in that repo)
   - title: Generated title with `[Type]` prefix (e.g., `[Feature] 가격 페이지 요금제 비교 테이블 추가`)
   - body: Filled template with all sections properly formatted
   - labels: Array of exactly 3 labels from task-analyzer (one type, one area, one priority)
   - **assignees**: **MUST always include the current user**
     - First call GitHub MCP `get_me` to fetch the current user's login
     - Then include `["{login}"]` in assignees parameter
     - **⚠️ CRITICAL**: Never skip this step - every issue must have an assignee

### Step 4: Create Branch Linked to Issue and Checkout

1. **Extract issue number** from the created issue (returned from Step 3)
2. Generate branch name: `{type}/{issue_number}-{branchSlug}`
   - The issue number in the branch name automatically links the branch to the issue on GitHub
   - Example: `feat/123-add-pricing-table` (issue #123 is linked)
3. Get current default branch (usually `main` or `master`)
4. Create branch using GitHub MCP `create_branch`:
   - owner: Same as issue
   - repo: Same as issue
   - branch: Generated branch name (contains issue number for automatic linking)
   - from_branch: Default branch
5. **Fetch the branch from remote**:
   - Run: `git fetch origin {branch_name}` to fetch the newly created branch
6. **Checkout the branch locally**:
   - Run: `git checkout {branch_name}` to switch to the branch
   - If the branch doesn't exist locally yet, create and track it: `git checkout -b {branch_name} origin/{branch_name}`

### Step 5: Report Results

Display to user:

- Issue number and URL
- Branch name created
- Confirmation of local checkout
- **Stop here**: Do not start implementation work unless the user explicitly requests it

## Example

**Input:**

```
/issue-start 가격 페이지에 요금표 추가
```

**Output:**

```
🔍 작업 분석 중...
   - 타입: Feature
   - 영역: Frontend
   - 우선순위: Medium

📂 코드베이스 탐색 중...
   - 발견: src/app/pricing/page.tsx
   - 발견: src/components/pricing/
   - 유사 구현: src/components/features/FeatureTable.tsx

🌐 리서치 완료
   - Radix UI table components
   - Next.js 16 best practices for pricing tables

✅ 이슈 생성 완료: #123
   https://github.com/kwakseongjae/mochabun/issues/123

✅ 브랜치 생성 완료: feat/123-add-pricing-table
✅ 로컬 브랜치 체크아웃 완료

이 단계에서 작업을 멈춥니다. 이후 작업은 사용자의 추가 요청이 있을 때 진행합니다.
```

## Error Handling

- If issue creation fails, show error and stop
- If branch creation fails, show error but keep issue
- If local checkout fails, show warning but continue (user can manually checkout)

## Notes

- Always use the current repository's remote to determine owner/repo
- Branch naming follows: `{type}/{issue_number}-{kebab-case-slug}`
- Labels are automatically applied based on task analysis
