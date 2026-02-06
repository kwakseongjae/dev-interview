# Commit Push PR Command

## Description

**Build validation → commit → push → create PR in one step**

이 커맨드는 `/commit` + `/pr`을 한 번에 실행하는 통합 커맨드입니다:

- ✅ 빌드 검증 (`npm run build`) - 실패 시 중단
- 📝 변경사항 분석 및 Conventional Commit 자동 생성
- 🚀 브랜치 자동 푸시
- 📄 PR 자동 생성 (템플릿 적용, 라벨/assignee 설정)

**사용 시점**: 작업 완료 후 빠르게 커밋 → 푸시 → PR까지 원스텝으로 처리하고 싶을 때
**주의사항**: `/task-done`으로 품질 게이트를 먼저 통과해야 합니다

## Usage

```
/commit-push-pr [--draft]
```

## Options

- `--draft`: Draft PR로 생성

## Prerequisites

- Must be on a branch created with `/issue-start` (format: `{type}/{issue_number}-{slug}`)
- Must have file changes to commit
- Recommended: Run `/task-done` first to ensure quality gates pass

## Workflow

### Phase 1: Commit (from /commit)

#### Step 1.1: Validate Build

1. Run build script: `npm run build`
2. If build fails:
   - Stop immediately
   - Report build error
   - Do not proceed

#### Step 1.2: Extract Issue Context

1. Get current branch name
2. Parse branch name:
   - Type: `feat`, `fix`, `chore`, etc.
   - Issue number: From `{type}/{issue_number}-{slug}`
3. Fetch issue details using GitHub MCP `issue_read`

#### Step 1.3: Analyze and Commit

1. Run `git status` to see changes
2. Group files into commit batches by location/intent
3. Generate Conventional Commit message:

   ```
   type(scope): subject

   [body if needed]

   Closes #123
   ```

4. Stage and commit each batch

### Phase 2: Push

#### Step 2.1: Check Remote Status

1. Check if branch exists on remote: `git ls-remote --heads origin {branch}`
2. If not pushed or has new commits:
   - Push: `git push -u origin {branch}`
   - Wait for push completion

### Phase 3: PR Creation (from /pr)

#### Step 3.1: Analyze Changes for PR

1. Get commits: `git log main..HEAD --oneline`
2. Get changed files: `git diff main..HEAD --name-status`
3. Understand scope of changes

#### Step 3.2: Generate PR Content

1. Fill PR template (`.github/PULL_REQUEST_TEMPLATE.md`)
2. **Generate PR title** (⚠️ CRITICAL: Must follow exact format):
   - **Format**: `[#이슈번호] Type: 한국어 제목`
   - **Example**: `[#123] Feature: 가격 페이지 요금제 비교 테이블 추가`
   - Get Korean title from issue title by removing `[Type]` prefix
   - Type mapping:
     - `type:feature` → `Feature`
     - `type:bug` → `Bug`
     - `type:enhancement` → `Enhancement`
     - `type:refactor` → `Refactor`
     - `type:docs` → `Docs`
     - `type:test` → `Test`
     - `type:chore` → `Chore`

#### Step 3.3: Create Pull Request

1. **Get current user first**: Call GitHub MCP `get_me` to fetch login
2. Use GitHub MCP `create_pull_request`:
   - owner/repo: From git remote
   - title: Generated Korean title (format: `[#123] Type: 한국어 제목`)
   - head: Current branch
   - base: `main`
   - body: Filled template
   - draft: true if `--draft` flag
3. Apply labels (from issue)
4. **Assign current user** (⚠️ MUST include - never skip):
   - Use GitHub MCP `issue_write` with method `update`
   - Set `assignees: ["{current_user_login}"]`

### Phase 4: Report Results

Display comprehensive summary:

```
✅ Commit → Push → PR 완료!

📝 커밋:
   - a1b2c3d: feat(pricing): add tier comparison table

🚀 푸시:
   - origin/feat/123-add-pricing-table (1 commit pushed)

📄 Pull Request:
   - PR #45: [#123] Feature: 가격 비교 테이블 추가
   - URL: https://github.com/owner/repo/pull/45
   - Status: Ready for Review (또는 Draft)

이슈 참조: Closes #123
```

## Example

**Input:**

```
/commit-push-pr
```

**Current branch:** `feat/123-add-pricing-table`
**Changed files:** `src/app/pricing/page.tsx`, `src/components/pricing/TierTable.tsx`

**Output:**

```
🔍 Phase 1: Commit
   ✅ Build: Success
   📊 Analyzing 2 changed files...
   ✅ Commit created: a1b2c3d
      feat(pricing): add tier comparison table
      Closes #123

🚀 Phase 2: Push
   ✅ Pushed to origin/feat/123-add-pricing-table

📄 Phase 3: PR Creation
   ✅ PR #45 created
      [#123] Feature: 가격 비교 테이블 추가
      https://github.com/kwakseongjae/mochabun/pull/45

✅ 모든 단계 완료!
   이슈 참조: Closes #123
   PR URL: https://github.com/kwakseongjae/mochabun/pull/45
```

**With --draft flag:**

```
/commit-push-pr --draft
```

Output includes:

```
📄 Phase 3: PR Creation
   ✅ Draft PR #45 created
      [#123] Feature: 가격 비교 테이블 추가
      Status: Draft (리뷰 요청 전 추가 작업 가능)
```

## Error Handling

### Build Failure

```
❌ Phase 1 실패: Build error

Error in src/components/TierTable.tsx:42
  Type 'string' is not assignable to type 'number'

빌드 오류를 수정하고 다시 실행하세요.
```

### Push Failure

```
❌ Phase 2 실패: Push rejected

Remote has changes not present locally.
Run: git pull --rebase origin feat/123-add-pricing-table

또는 강제 푸시가 필요한 경우 직접 실행하세요:
git push -f origin feat/123-add-pricing-table
```

### PR Creation Failure

```
❌ Phase 3 실패: PR creation failed

A pull request already exists for this branch.
URL: https://github.com/owner/repo/pull/42

기존 PR을 업데이트하려면 추가 커밋 후 푸시하세요.
```

### No Changes

```
⚠️ 커밋할 변경사항이 없습니다.

코드 변경 후 다시 실행하세요.
```

### Invalid Branch

```
❌ 유효하지 않은 브랜치 형식

현재 브랜치: main
필요한 형식: {type}/{issue_number}-{slug}

/issue-start를 먼저 실행하여 작업 브랜치를 생성하세요.
```

## Comparison with Separate Commands

| 기능        | `/commit` + `/pr` | `/commit-push-pr` |
| ----------- | ----------------- | ----------------- |
| 빌드 검증   | 2회 (각각)        | 1회               |
| 커밋 생성   | ✅                | ✅                |
| 푸시        | `/pr`에서 자동    | ✅                |
| PR 생성     | `/pr`             | ✅                |
| 단계별 확인 | ✅ (각 단계 후)   | ❌ (한 번에 완료) |
| 속도        | 느림              | 빠름              |

**언제 무엇을 사용?**

- **`/commit-push-pr`**: 빠른 작업 완료, 신뢰할 수 있는 변경사항
- **`/commit` → `/pr`**: 단계별 확인 필요, 커밋 후 추가 작업 가능

## Notes

- 빌드 검증은 한 번만 수행됩니다 (Phase 1에서)
- 이미 PR이 있는 경우 새 PR을 생성하지 않고 기존 PR 링크를 제공합니다
- `--draft` 옵션은 리뷰 준비가 안 된 경우 유용합니다
- `/task-done`을 먼저 실행하여 품질 게이트를 통과하는 것을 권장합니다
