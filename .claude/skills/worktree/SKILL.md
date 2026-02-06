---
name: worktree
description: Git worktree integration for parallel development - works with issue-start to create isolated working directories
license: MIT
metadata:
  author: mochabun
  version: "1.0.0"
---

# Worktree Integration Skill

Enable parallel development by creating git worktrees for issues. Works seamlessly with `/issue-start` command.

## When to Apply

Use this skill when:

- Working on multiple issues simultaneously
- Need to quickly switch between different features/bugs
- Want to avoid git stash/unstash operations
- Testing different approaches in parallel
- Code review requires checking another branch without losing current work

## What This Skill Does

This skill extends the `/issue-start` workflow to create git worktrees instead of checking out branches in the main directory.

**Without Worktree (Traditional)**:

```
/issue-start "Add feature" → creates branch, checks out in main directory
# Can only work on one issue at a time
```

**With Worktree Skill**:

```
/issue-start "Add feature" → creates branch
Apply worktree skill → creates separate directory
# Can work on multiple issues in parallel
```

## Workflow Integration

### Option 1: Manual Application (Recommended)

**Step 1: Create issue and branch with issue-start**

```bash
/issue-start "Add dark mode toggle"
```

This creates:

- GitHub issue #42
- Branch: `feat/42-add-dark-mode-toggle`
- Checks out branch in main directory

**Step 2: Convert to worktree**

Claude automatically detects you're on a feature branch and asks:

```
Would you like to create a worktree for parallel development? [y/N]
```

If yes:

1. Creates worktree directory: `../mochabun-feat-42-add-dark-mode-toggle`
2. Moves to worktree directory
3. Returns main directory to `main` branch
4. You can now work in the worktree while main is clean

### Option 2: Direct Worktree Creation

After running `/issue-start`, immediately request worktree:

```
User: /issue-start "Add pricing table"
Claude: [creates issue #43, branch feat/43-add-pricing-table]

User: Create a worktree for this
Claude: [applies worktree skill, creates worktree directory]
```

## Worktree Operations

### Creating a Worktree

**Command**: After `/issue-start`, say "create worktree" or "use worktree"

**Process**:

1. Extract current branch info (from git branch --show-current)
2. Validate it's a feature branch (not main/master)
3. Generate worktree directory name: `mochabun-{type}-{issue_number}-{slug}`
4. Create worktree: `git worktree add ../directory {branch}`
5. Navigate to worktree: `cd ../directory`
6. Checkout main in original directory

**Result**:

```
Desktop/projects/
├── mochabun/                    # Main (on main branch)
├── mochabun-feat-42-dark-mode/  # Worktree 1
└── mochabun-fix-43-bug/         # Worktree 2
```

### Removing a Worktree

Use the `/worktree-done` command when finished with a worktree:

```bash
/worktree-done
```

**Process**:

1. Validates you're in a worktree (not main directory)
2. Checks for uncommitted changes (warns if found)
3. Removes worktree directory safely
4. Returns to main project directory
5. Updates main branch with latest changes

### Listing Active Worktrees

```bash
git worktree list
```

Output:

```
/Users/user/projects/mochabun              main
/Users/user/projects/mochabun-feat-42-...  feat/42-add-dark-mode
/Users/user/projects/mochabun-fix-43-...   fix/43-bug-fix
```

## Usage Examples

### Example 1: Single Issue to Worktree

```
User: /issue-start "Add pricing table"

Claude:
✅ Issue #45 created
✅ Branch feat/45-add-pricing-table created
✅ Checked out locally

User: Make this a worktree

Claude:
🔄 Converting to worktree...
✅ Worktree created: ../mochabun-feat-45-add-pricing-table
✅ Moved to worktree directory
✅ Main directory returned to main branch

📁 Current location: /Users/user/projects/mochabun-feat-45-add-pricing-table
🌿 Branch: feat/45-add-pricing-table

You can now:
1. Work in this worktree
2. Switch to main directory for other work
3. Create more worktrees for other issues
```

### Example 2: Parallel Development

```
# Terminal 1: Start first issue
User: /issue-start "Add authentication"
Claude: [creates issue #50, branch feat/50-auth]

User: Create worktree
Claude: [creates worktree at ../mochabun-feat-50-auth]

# Terminal 2: Start second issue (from main directory)
User: cd ~/projects/mochabun
User: /issue-start "Fix navbar bug"
Claude: [creates issue #51, branch fix/51-navbar]

User: Create worktree
Claude: [creates worktree at ../mochabun-fix-51-navbar]

# Now you have two independent working directories
# Terminal 1: works on feat/50-auth
# Terminal 2: works on fix/51-navbar
```

### Example 3: Quick Context Switch

```
# Working on feature in worktree
[in mochabun-feat-45-add-pricing-table]

User: Need to quickly fix a bug

# Open new terminal
User: cd ~/projects/mochabun  # Main is clean on main branch
User: /issue-start "Fix critical bug"
Claude: [creates issue #52, branch fix/52-critical]

User: Just work in main directory
# No worktree needed, work directly on branch

# After fix
User: git add . && git commit && git push
User: /pr

# Return to original work
User: cd ../mochabun-feat-45-add-pricing-table
# Continue where you left off, no stashing needed
```

## Worktree Naming Convention

Format: `mochabun-{type}-{issue_number}-{slug}`

**Examples**:

- `mochabun-feat-42-add-dark-mode`
- `mochabun-fix-43-payment-bug`
- `mochabun-refactor-44-api-cleanup`

**Benefits**:

- Clearly identifies project
- Shows issue type at a glance
- Includes issue number for easy reference
- Descriptive slug for quick identification

## Integration with Other Commands

### With /task-init

```bash
# After creating worktree
/task-init
# Creates plan specific to this worktree
# Spawns sub-agents with worktree context
```

### With /task-done

```bash
# When work is complete
/task-done
# Validates quality gates
# Documents implementation
# (worktree cleanup is separate: /worktree-done)
```

### With /commit and /pr

```bash
/commit  # Works normally in worktree
/pr      # Creates PR from worktree branch
```

### With /worktree-done

```bash
# After PR is merged
/worktree-done
# Removes worktree
# Returns to main directory
# Updates main branch
```

## Complete Workflow Example

```bash
# 1. Start issue with branch
/issue-start "Implement user dashboard"

# 2. Convert to worktree for parallel work
# Say: "create worktree"

# 3. Plan the task
/task-init

# 4. Implement features
# (code changes)

# 5. Complete and document
/task-done

# 6. Commit changes
/commit

# 7. Create pull request
/pr

# 8. After PR is merged, clean up
/worktree-done
```

## Advantages Over Traditional Workflow

### Traditional (Branch-based)

```
/issue-start → work → stash → switch → work → unstash
```

❌ One issue at a time
❌ Stash/unstash required
❌ Context switching overhead
❌ Risk of stash conflicts

### Worktree-based

```
/issue-start + worktree → multiple directories → parallel work
```

✅ Multiple issues simultaneously
✅ No stashing needed
✅ Independent node_modules per worktree
✅ Easy context switching (just change terminal)

## Technical Details

### Git Worktree Commands Used

**Create**:

```bash
git worktree add ../mochabun-{branch} {branch}
```

**List**:

```bash
git worktree list
```

**Remove**:

```bash
git worktree remove ../mochabun-{branch}
```

**Prune** (clean up stale references):

```bash
git worktree prune
```

### Directory Structure

```
Desktop/projects/
├── mochabun/              # Main worktree (usually on main)
│   ├── .git/                     # Shared git repository
│   ├── src/
│   ├── node_modules/
│   └── ...
│
├── mochabun-feat-42-dark-mode/  # Feature worktree
│   ├── .git → ../mochabun/.git/worktrees/...
│   ├── src/
│   ├── node_modules/             # Independent dependencies
│   └── ...
│
└── mochabun-fix-43-bug/   # Another worktree
    ├── .git → ../mochabun/.git/worktrees/...
    ├── src/
    ├── node_modules/
    └── ...
```

### Disk Space Considerations

Each worktree contains:

- ✅ Full working tree (all project files)
- ✅ Independent node_modules
- ✅ Independent .env (if needed)
- ❌ Shared .git (no duplication)

**Estimate**: ~500MB-1GB per worktree (depending on node_modules size)

## Best Practices

### 1. One Worktree Per Issue

Create a worktree for each issue you're actively working on:

```bash
/issue-start "Issue A" → worktree
/issue-start "Issue B" → worktree
```

### 2. Clean Up After Merging

Always remove worktrees after PR is merged:

```bash
/worktree-done
```

### 3. Install Dependencies Per Worktree

Each worktree may need its own dependencies:

```bash
cd ../mochabun-feat-42-dark-mode
npm install
```

### 4. Use Main Directory for Quick Fixes

For quick, small fixes that don't need a worktree:

```bash
cd ~/projects/mochabun
/issue-start "Quick fix"
# Work directly without worktree
```

### 5. Keep Main Clean

Main directory should stay on `main` branch:

```bash
cd ~/projects/mochabun
git status  # Should show: On branch main
```

## Troubleshooting

### Worktree Creation Fails

**Error**: `fatal: 'branch' is already checked out`

**Solution**: Branch is already used in another worktree

```bash
git worktree list  # Find which worktree has the branch
git worktree remove <path>  # Remove that worktree first
```

### Cannot Remove Worktree

**Error**: `fatal: 'directory' contains modified or untracked files`

**Solution**: Commit or discard changes first

```bash
cd <worktree-directory>
git status
git add . && git commit -m "Save work"
# OR
git restore .  # Discard changes (careful!)
```

### Worktree Directory Not Found

**Error**: Can't find worktree directory

**Solution**: Prune stale references

```bash
cd ~/projects/mochabun
git worktree prune
```

### Multiple node_modules Issues

**Problem**: Running out of disk space

**Solution**:

1. Remove unused worktrees: `/worktree-done`
2. Use hard links for node_modules (advanced):
   ```bash
   npm install --prefer-offline --cache ~/.npm-cache
   ```

## Integration with IDE

### VSCode

Open multiple VSCode windows:

```bash
code ~/projects/mochabun                    # Main
code ~/projects/mochabun-feat-42-dark-mode  # Worktree 1
code ~/projects/mochabun-fix-43-bug         # Worktree 2
```

Each window is independent with its own:

- File explorer
- Terminal
- Git status
- Extensions

### Terminal Multiplexer (tmux/screen)

Create sessions per worktree:

```bash
tmux new -s main           # Main directory
tmux new -s feat-42        # Feature worktree
tmux new -s fix-43         # Bug fix worktree
```

Switch between sessions:

```bash
tmux attach -t feat-42
```

## Performance Considerations

### Advantages

- ✅ No context switching overhead
- ✅ Dev server can run in each worktree
- ✅ Independent builds
- ✅ No git stash I/O

### Considerations

- ⚠️ More disk space used
- ⚠️ More RAM if running multiple dev servers
- ⚠️ More file watchers (may need to increase limits)

### System Limits

Increase file watcher limits if needed:

**macOS**:

```bash
# Increase file descriptor limit
ulimit -n 10240
```

**Linux**:

```bash
# Increase inotify watches
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## References

- [Git Worktree Official Docs](https://git-scm.com/docs/git-worktree)
- [Worktree Guide](../../docs/WORKTREE_GUIDE.md)
- [Workflows](../../.claude/rules/workflows.md)
- [Issue Start Command](../../.claude/commands/issue-start.md)

## Notes

- Worktrees share the same git repository (no duplication)
- Each worktree can have a different branch checked out
- Cannot have the same branch checked out in multiple worktrees
- Main directory typically stays on `main` branch
- Worktrees are siblings to main directory (one level up)
- Use `/worktree-done` command to safely remove worktrees
