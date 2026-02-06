# Commit Command

## Description

**Validate build → analyze changes → auto-generate Conventional Commit messages from issue context → commit with proper references**

이 커맨드는:

- ✅ 빌드 검증 (`npm run build`) - 실패 시 커밋 중단
- 📊 변경된 파일 분석 및 자동 그룹핑
- 📝 이슈 번호 기반 커밋 메시지 자동 생성
- 🔗 `Closes #{issue_number}` 자동 추가
- 🎯 Conventional Commits 형식 준수 (`type(scope): subject`)

**현재 브랜치**: 이슈 번호를 브랜치명에서 자동 추출
**다음 단계**: `/pr`로 Pull Request 생성

## Usage

```
/commit
```

## Prerequisites

- Must be on a branch created with `/issue-start` (format: `{type}/{issue_number}-{slug}`)
- Must have file changes to commit

## Workflow

### Step 0: Validate Build

1. Run build script first: `npm run build`
2. If build fails:
   - Stop the commit flow immediately
   - Analyze and report the build error cause
   - Do not stage or commit any changes

### Step 1: Extract Issue Context

1. Get current branch name
2. Parse branch name to extract:
   - Type: `feat`, `fix`, `chore`, etc.
   - Issue number: From branch pattern `{type}/{issue_number}-{slug}`
3. Fetch issue details using GitHub MCP `issue_read`:
   - owner: From git remote
   - repo: From git remote
   - issue_number: Extracted from branch
   - method: `get`

### Step 2: Analyze Changes

1. Run `git status` to see staged and unstaged changes
2. Get the full list of changed files:
   - Use `git diff --name-only --cached` and `git diff --name-only`
3. Group files into commit batches based on their actual locations and intent:
   - Prefer grouping by top-level area (e.g. `src/app`, `src/lib`, `.cursor`, `docs`, `scripts`)
   - If a change clearly spans multiple areas but is a single intent, keep it in one batch
   - If a file set mixes unrelated intents, split into separate batches
4. Determine scope and commit type per batch:
   - Scope from dominant folder/feature
   - Type from changes (override branch type if needed)

### Step 3: Generate Commit Messages

Use the `commit-writer` skill with:

- Issue number
- Changed files (per batch)
- Issue title/description
- Commit type (from batch analysis)

Generate message in format:

```
type(scope): subject

[body if needed]

Closes #123
```

### Step 4: Commit Changes (Per Batch)

For each batch:

1. Stage only the files in the batch
2. Create commit: `git commit -m "{subject}" -m "{body}" -m "Closes #{issue_number}"`
   - Use multi-line format if body exists
3. Display commit hash and message

### Step 5: Report Results

Display:

- List of commits created (hash + title)
- Issue reference

## Example

**Input:**

```
/commit
```

**Current branch:** `feat/123-add-pricing-table`
**Changed files:** `src/app/pricing/page.tsx`, `src/components/pricing/TierTable.tsx`, `.cursor/commands/pr.md`

**Output:**

```
✅ 커밋 생성 완료 (2개)

커밋 해시: a1b2c3d
커밋 메시지:
feat(pricing): add tier comparison table

Add a comparison table component to the pricing page that displays
all available tiers side by side with their features.

Closes #123

커밋 해시: d4e5f6g
커밋 메시지:
chore(github): update pr command rules

Closes #123
```

## Error Handling

- If `npm run build` fails, stop and analyze the build error
- If not on a valid branch format, show error and suggest using `/issue-start` first
- If no changes detected, ask user to make changes first
- If issue fetch fails, still create commit but without issue reference

## Notes

- Always reference the issue in commit footer: `Closes #123` or `Refs #123`
- Use imperative mood in commit message
- Keep subject line under 72 characters
- Scope is optional but recommended
- Split commits by actual file groupings and intent, not by diff size
