# PR Command

## Description

**Extract issue & changes → generate PR description with template → push branch → create Pull Request to main with labels & assignees**

이 커맨드는:

- 📄 이슈 내용 + 변경사항 기반 PR 설명 자동 작성
- 📋 PR 템플릿 자동 적용
- 🔍 변경된 파일 목록 포함
- ✅ Test plan 자동 생성
- 🎯 Base 브랜치: `main` (자동)
- 🚀 생성 즉시 리뷰 가능한 상태

**옵션**: `--draft` 사용 시 Draft PR로 생성
**다음 단계**: PR 리뷰 후 머지, 그 다음 `/worktree-done` (워크트리 사용 시)

## Usage

```
/pr [--draft]
```

## Options

- `--draft`: Create PR as draft

## Prerequisites

- Must be on a branch created with `/issue-start` (format: `{type}/{issue_number}-{slug}`)
- Must have commits on the branch (at least one commit ahead of base branch)
- Branch must be pushed to remote

## Workflow

### Step 1: Extract Issue and Branch Context

1. Get current branch name
2. Parse branch name to extract:
   - Type: `feat`, `fix`, `chore`, etc.
   - Issue number: From branch pattern `{type}/{issue_number}-{slug}`
3. Get base branch (default: `main` or `master`)
4. Fetch issue details using GitHub MCP `issue_read`:
   - owner: From git remote
   - repo: From git remote
   - issue_number: Extracted from branch
   - method: `get`

### Step 2: Analyze Changes

1. Get commits on branch: `git log {base_branch}..HEAD --oneline`
2. Get changed files: `git diff {base_branch}..HEAD --name-status`
3. Analyze changes to understand:
   - What files/components changed
   - Type of changes (features, fixes, refactors, etc.)

### Step 3: Generate PR Content

Use the `pr-writer` skill with:

- Issue number, title, description
- Changed files
- Branch name
- Commit messages

Fill the PR template from `.github/PULL_REQUEST_TEMPLATE.md`:

- 요약: Brief summary referencing issue
- 변경 사항: List of key changes
- 체크리스트: Pre-filled standard items

### Step 4: Generate PR Title

**⚠️ CRITICAL**: PR title MUST follow this exact format for consistency.

- **PR title must be in Korean**
- **Format**: `[#이슈번호] Type: 한국어 제목`
- **Example**: `[#123] Feature: 가격 페이지 요금제 비교 테이블 추가`

**Step-by-step**:

1. Get issue number from branch (e.g., `feat/123-add-pricing` → `123`)
2. Map type label to Type name:
   - `type:feature` → `Feature`
   - `type:bug` → `Bug`
   - `type:enhancement` → `Enhancement`
   - `type:refactor` → `Refactor`
   - `type:docs` → `Docs`
   - `type:test` → `Test`
   - `type:chore` → `Chore`
3. Get Korean title from issue title by removing `[Type]` prefix
   - Issue title: `[Feature] 가격 페이지 요금제 비교 테이블 추가`
   - Korean title: `가격 페이지 요금제 비교 테이블 추가`
4. Combine: `[#123] Feature: 가격 페이지 요금제 비교 테이블 추가`

**Title Pattern Summary**:
| 항목 | 형식 | 예시 |
|------|------|------|
| Issue | `[Type] 한국어 제목` | `[Feature] 가격 페이지 요금제 비교 테이블 추가` |
| PR | `[#번호] Type: 한국어 제목` | `[#123] Feature: 가격 페이지 요금제 비교 테이블 추가` |

### Step 5: Check if Branch is Pushed

1. Check if branch exists on remote: `git ls-remote --heads origin {branch_name}`
2. If not pushed, push branch: `git push -u origin {branch_name}`
3. If push fails, show error and stop

### Step 6: Create Pull Request

Use GitHub MCP `create_pull_request`:

- owner: From git remote
- repo: From git remote
- title: Generated PR title
- head: Current branch name
- base: Base branch (main/master)
- body: Filled PR template
- draft: true if `--draft` flag used

### Step 7: Apply Assignee and Labels

**⚠️ CRITICAL**: Always set assignee to the current user.

1. **Get current user login first**: Call GitHub MCP `get_me` to fetch the current user's login
2. Extract labels from the issue (from Step 1)
3. Use GitHub MCP `issue_write` with method `update`:
   - owner: From git remote
   - repo: From git remote
   - issue_number: PR number from Step 6
   - labels: Same as issue labels
   - **assignees**: `["{current_user_login}"]` - **MUST include, never skip**

### Step 8: Report Results

Display:

- PR number and URL
- PR title
- Issue reference
- Draft status (if applicable)

## Example

**Input:**

```
/pr
```

**Current branch:** `feat/123-add-pricing-table`
**Base branch:** `main`

**Output:**

```
✅ Pull Request 생성 완료: #45
   https://github.com/kwakseongjae/mochabun/pull/45

제목: [#123] Feature: 가격 페이지 요금제 비교 테이블 추가
이슈 참조: Closes #123
```

## Error Handling

- If not on a valid branch format, show error
- If branch not pushed, attempt to push (may require user confirmation)
- If no commits on branch, show error
- If PR creation fails, show error details

## Notes

- PR title is written in Korean and references the issue
- Always references the related issue
- Template is automatically filled based on changes
- Can create as draft for review before requesting review
