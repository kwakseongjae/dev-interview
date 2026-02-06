# Worktree Done Command

## Description

**Validate worktree status → check uncommitted changes → navigate to main → safely remove worktree → update main branch**

이 커맨드는:

- ✅ 현재 워크트리 검증 (main 디렉토리에서 실행 시 경고)
- 🔍 미커밋 변경사항 체크 (있으면 경고)
- 🗑️ 워크트리 디렉토리 안전 제거
- 📂 main 프로젝트 디렉토리로 자동 이동
- 🔄 main 브랜치로 전환 + `git pull --rebase`
- ✅ 정리 완료 확인 메시지

**주의**: 미커밋 변경사항이 있으면 경고 후 진행 여부 확인
**사용 시점**: PR 머지 후 워크트리 정리 시

## Usage

```
/worktree-done
```

**Note**: This command takes no arguments and operates on the current directory.

## Prerequisites

- Must be executed from within a worktree directory (not the main project)
- All changes should be committed and pushed (uncommitted changes will trigger a warning)
- Pull request should ideally be merged before cleanup (though not strictly required)

## Workflow

### Step 1: Validate Current Directory is a Worktree

1. **Check if in a worktree**:
   - Run: `git rev-parse --git-dir`
   - If output contains `.git/worktrees/`, this is a worktree
   - If output is just `.git`, this is the main project (abort with helpful message)

2. **Get worktree information**:
   - Run: `git worktree list` to list all worktrees
   - Identify current worktree path and branch

### Step 2: Check for Uncommitted Changes

1. **Check working tree status**:
   - Run: `git status --porcelain`
   - If output is not empty, there are uncommitted changes

2. **Warn user if changes exist**:
   - Display warning with list of uncommitted files
   - Ask user to confirm: "Continue with removal? (uncommitted changes will be lost) [y/N]"
   - If user says no, abort and suggest: `git add . && git commit -m "WIP"`
   - If user says yes, proceed (changes will be lost)

### Step 3: Check if Branch is Pushed

1. **Check remote tracking**:
   - Run: `git rev-parse --abbrev-ref --symbolic-full-name @{u}` (upstream branch)
   - If no upstream, warn that branch is not pushed

2. **Check if local is ahead**:
   - Run: `git rev-list @{u}..HEAD` to check unpushed commits
   - If commits exist, warn user and suggest pushing first

3. **Optional**: Ask user if they want to push before cleanup

### Step 4: Navigate to Main Project

1. **Get main project path**:
   - Run: `git worktree list` and find the main worktree (the one without branch info or marked as main)
   - Parse output to get absolute path

2. **Store current worktree path** for later removal:
   - Save current directory path: `pwd`

3. **Change directory to main project**:
   - Run: `cd {main_project_path}`

### Step 5: Remove Worktree

1. **Remove worktree using git**:
   - Run: `git worktree remove {worktree_path}`
   - This safely removes the worktree and cleans up git references

2. **If removal fails** (e.g., due to uncommitted changes even after warning):
   - Run: `git worktree remove --force {worktree_path}` (only if user confirmed in Step 2)
   - Show error message with specific git error

3. **Verify removal**:
   - Run: `git worktree list` to confirm worktree is no longer listed
   - Check that directory no longer exists: `test -d {worktree_path}`

### Step 6: Update Main Branch

1. **Checkout main branch**:
   - Run: `git checkout main` (or `master`, check default branch name)

2. **Pull latest changes**:
   - Run: `git pull --rebase` to sync with remote
   - This ensures main is up-to-date after PR merge

3. **Prune stale worktree references** (optional cleanup):
   - Run: `git worktree prune` to clean up any stale references

### Step 7: Report Results

Display to user:

- Worktree removed successfully
- Branch that was cleaned up
- Current location (main project)
- Main branch status (up-to-date, behind, ahead)
- **Next steps**: Suggest starting new work with `/worktree-start` or `/issue-start`

## Example

**Input (from within a worktree):**

```
/worktree-done
```

**Output:**

```
🔍 워크트리 상태 확인 중...
   - 현재 워크트리: mochabun-feat-42-add-pricing-table
   - 브랜치: feat/42-add-pricing-table
   - 변경사항: 없음 ✅

✅ 메인 프로젝트로 이동 완료
✅ 워크트리 제거 완료: mochabun-feat-42-add-pricing-table
✅ 메인 브랜치 업데이트 완료

📁 현재 위치: /Users/username/Desktop/projects/mochabun
🌿 브랜치: main (up-to-date)

다음 단계:
- `/worktree-start <description>`으로 새 작업 시작
- 또는 `/issue-start <description>`으로 전통적인 브랜치 워크플로우 사용
```

**Output (with uncommitted changes):**

```
⚠️  경고: 커밋되지 않은 변경사항이 있습니다

변경된 파일:
  M  src/app/pricing/page.tsx
  M  src/components/PricingTable.tsx
  ?? src/components/PricingCard.tsx

워크트리를 제거하면 이 변경사항들이 손실됩니다.

옵션:
1. 변경사항 커밋: git add . && git commit -m "작업 중"
2. 변경사항 스태시: git stash
3. 강제 제거 (변경사항 손실): /worktree-done --force

계속하시겠습니까? [y/N]: _
```

## Error Handling

### Not in a Worktree

```
❌ 오류: 현재 디렉토리는 워크트리가 아닙니다

현재 위치: /Users/username/Desktop/projects/mochabun (메인 프로젝트)

워크트리 목록:
- mochabun-feat-42-add-pricing-table (feat/42-add-pricing-table)
- mochabun-fix-43-bug-fix (fix/43-bug-fix)

워크트리에서 이 명령을 실행하세요:
cd ../mochabun-feat-42-add-pricing-table
/worktree-done
```

### Uncommitted Changes (User Declined)

```
❌ 워크트리 제거 취소됨

변경사항을 커밋하거나 스태시한 후 다시 시도하세요:
  git add .
  git commit -m "Finish feature implementation"
  /worktree-done
```

### Unpushed Commits

```
⚠️  경고: 푸시되지 않은 커밋이 있습니다

커밋 내역:
  abc1234 - feat: Add pricing table component
  def5678 - style: Update pricing page layout

브랜치를 푸시하지 않고 워크트리를 제거하면 나중에 복구하기 어려울 수 있습니다.

옵션:
1. 지금 푸시: git push origin feat/42-add-pricing-table
2. 그래도 제거 (로컬 커밋 유지): /worktree-done --skip-push-check
3. 취소: Ctrl+C

계속하시겠습니까? [y/N]: _
```

### Worktree Removal Failed

```
❌ 오류: 워크트리 제거 실패

Git 오류 메시지:
fatal: 'mochabun-feat-42-add-pricing-table' contains modified or untracked files, use --force to delete it

해결 방법:
1. 워크트리로 이동하여 변경사항 확인:
   cd ../mochabun-feat-42-add-pricing-table
   git status

2. 변경사항 커밋 또는 스태시

3. 다시 /worktree-done 실행

또는 강제 제거 (변경사항 손실):
/worktree-done --force
```

## Notes

- This command is **destructive** - the worktree directory and any uncommitted changes will be permanently deleted
- Always ensure your work is committed and pushed before running this command
- The branch itself is NOT deleted (only the worktree directory)
- You can recreate the worktree later if needed: `git worktree add ../path {branch}`
- If you want to delete the branch as well, use: `git branch -d {branch}` after worktree removal
- Use `git worktree list` to see all worktrees before removal

## Flags (Optional)

- `--force` or `-f`: Skip all warnings and force removal (dangerous!)
- `--skip-push-check`: Skip checking for unpushed commits
- `--no-pull`: Don't pull main after cleanup (faster, but main may be out of date)

**Example with flags:**

```
/worktree-done --force
```

## Integration with Workflow

Typical workflow completion:

```
[In worktree] → /task-done → /commit → /pr → [Wait for PR merge] → /worktree-done
```

After cleanup:

```
[In main] → /worktree-start "New task" → [repeat]
```

## Manual Cleanup (If Command Fails)

If `/worktree-done` fails for any reason, you can manually clean up:

```bash
# 1. Navigate to main project
cd /path/to/mochabun

# 2. Remove worktree (replace path with actual worktree path)
git worktree remove ../mochabun-feat-42-add-pricing-table

# 3. If that fails, force remove
git worktree remove --force ../mochabun-feat-42-add-pricing-table

# 4. Prune stale references
git worktree prune

# 5. Update main
git checkout main
git pull --rebase
```

## Worktree List Management

To see all active worktrees:

```bash
git worktree list
```

Output example:

```
/Users/username/Desktop/projects/mochabun              1a2b3c4 [main]
/Users/username/Desktop/projects/mochabun-feat-42-...  5d6e7f8 [feat/42-add-pricing-table]
/Users/username/Desktop/projects/mochabun-fix-43-...   9g0h1i2 [fix/43-bug-fix]
```

To remove all worktrees at once (nuclear option):

```bash
git worktree list | grep -v "$(pwd)" | awk '{print $1}' | xargs -I {} git worktree remove {}
```

**Use with caution!**
