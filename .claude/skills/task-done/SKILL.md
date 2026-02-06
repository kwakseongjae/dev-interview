---
name: task-done
description: Finalize task completion workflow - appends implementation summary to plan document, validates quality gates, and cleans up sub-agents created during task execution
license: MIT
metadata:
  author: mochabun
  version: "1.0.0"
---

# Task Done

Comprehensive task completion workflow for documenting work and cleanup.

## When to Apply

Use `/task-done` when:

- Implementation is complete and ready for review
- All tests are passing
- Code quality checks are satisfied
- Ready to create a pull request
- Need to document what was actually done vs. planned

## What This Skill Does

1. **Locates Plan Document**: Finds the corresponding plan in `docs/plans/` for the current issue
2. **Generates Implementation Summary**: Creates a detailed summary of actual work completed
3. **Appends to Plan**: Adds summary section to plan document without modifying original plan
4. **📋 Updates Spec Document (Conditional)**: If spec exists at `specs/{feature-name}/`, updates with implementation results
5. **Validates Quality Gates**: Checks build, tests, lint, and type checking
6. **🧪 Generates QA Checklist**: Spawns `qa-generator` agent to create test scenarios
7. **📝 Updates Mistakes Log**: Auto-detects and records any mistakes/learnings from session
8. **Cleans Up Sub-Agents**: Removes any sub-agents that were created during task execution
9. **Prepares for PR**: Ensures everything is ready for pull request creation

## Workflow Steps

### 1. Find Plan Document

- Extract issue number from current branch name
- Locate plan file: `docs/plans/{issue_number}-*.md`
- Read existing plan content

### 2. Generate Implementation Summary

Automatically gathers:

- **Files Changed**: Uses `git diff --name-only` against base branch
- **Commits Made**: Lists all commits in current branch
- **Quality Metrics**:
  - Build status (`npm run build`)
  - Type check (`npx tsc --noEmit`)
  - Lint status (`npm run lint`)
  - Test results (if tests exist)
- **Performance Impact**: Notes if bundle size or performance changed
- **Deviations**: Documents any differences from original plan

### 3. Append Summary Section

Adds to plan document after `---` separator:

```markdown
---

## Implementation Summary

**Completion Date**: YYYY-MM-DD
**Implemented By**: Claude Sonnet 4.5

### Changes Made

#### Files Modified

- [path/to/file1.ts](path/to/file1.ts#L42-51) - Added dark mode state management
- [path/to/file2.tsx](path/to/file2.tsx#L12) - Updated theme toggle component
- [path/to/file3.css](path/to/file3.css) - Added dark mode styles

#### Key Implementation Details

- Used Zustand for theme state (as planned)
- Applied `rerender-memo` rule for ThemeToggle component
- Applied `bundle-dynamic-imports` for theme switcher

### Quality Validation

- [x] Build: Success
- [x] Type Check: Passed
- [x] Lint: Passed
- [x] Tests: 12/12 passing
- [x] Best Practices: Applied async-parallel, bundle-barrel-imports

### Deviations from Plan

**Added**:

- localStorage persistence for theme preference (not in original plan)

**Changed**:

- Used CSS variables instead of Tailwind dark: variant (better performance)

**Skipped**:

- Theme transition animation (can add in follow-up)

### Performance Impact

- Bundle size: +2.3KB (theme toggle component)
- No impact on initial page load (dynamic import)

### Follow-up Tasks

- [ ] Add theme transition animation (#26)
- [ ] Support system preference detection (#27)

### Notes

- All Vercel React best practices applied successfully
- No breaking changes introduced
- Ready for code review
```

### 3.5 Update Spec Document (Conditional - speckit directory)

**Check for spec document in speckit directory:**

```bash
# Speckit stores specs at project root: specs/{feature-name}/
SPEC_DIR="specs/"
# Find spec.md matching current feature
SPEC_FILE=$(find $SPEC_DIR -name "spec.md" -path "*${FEATURE_NAME}*" 2>/dev/null | head -1)
if [ -f "$SPEC_FILE" ]; then
  # Spec exists, update it
fi
```

**If spec document exists:**

1. **Update Status section in spec.md:**

   ```markdown
   **Status**: Implemented <!-- Draft → Implemented -->
   ```

2. **Run speckit.analyze for consistency check:**

   ```
   📋 speckit.analyze 실행...
      - spec.md와 plan.md 일관성 검증
      - 구현과 스펙 비교
   ```

3. **Update/Add Implementation Notes section:**

   ```markdown
   ## Implementation Notes

   > Auto-updated by `/task-done`

   ### Status: Implemented

   ### Implementation Date: YYYY-MM-DD

   ### Changes Made:

   - {Summary of API/schema changes}
   - {New endpoints created}
   - {Types/interfaces added}

   ### Deviations from Spec:

   - {Any changes from original spec}
   - OR "None - implemented as specified"

   ### Verification:

   - [x] All acceptance criteria met
   - [x] Edge cases handled
   - [x] Tests passing
   ```

4. **Cross-reference with plan document:**
   - Add link to implementation summary in plan
   - Note any spec-plan discrepancies

**Output:**

```
📋 Spec document updated: specs/{feature-name}/spec.md
   - Status: Draft → Implemented
   - Implementation Notes added
   - speckit.analyze: 일관성 검증 완료
```

**If NO spec document:**

- Skip this step
- Continue to quality gates

### 4. Quality Gate Validation

Runs validation checks:

```bash
npm run build        # Must succeed
npx tsc --noEmit    # Must pass
npm run lint        # Must pass
```

If any fail, notifies user and does NOT mark task as done.

### 5. Generate QA Checklist (qa-generator agent)

**Spawns qa-generator sub-agent** to create comprehensive test scenarios:

```typescript
Task(
  subagent_type: "general-purpose",
  prompt: "Generate QA checklist based on changed files and plan...",
  description: "QA checklist generation"
)
```

**Generated Content**:

- Functional tests (based on changed features)
- Edge case tests (boundary conditions)
- UI/UX tests (if UI changes)
- Regression tests (affected existing features)
- Performance tests (if relevant)
- Cross-browser test checklist

**QA Checklist Structure**:

```markdown
## QA Checklist

> 🤖 Generated by qa-generator agent
> Date: YYYY-MM-DD

### 테스트 요약

- **총 테스트 케이스**: {N}개
- **우선순위별**: High {X}, Medium {Y}, Low {Z}

### 기능 테스트

| #   | 테스트 시나리오 | 사전 조건 | 테스트 단계 | 예상 결과 | 우선순위 |
| --- | --------------- | --------- | ----------- | --------- | -------- |

### 엣지 케이스

[테이블]

### 회귀 테스트

[테이블]
```

### 6. Update Mistakes Log (Auto-Detection)

**Automatically analyzes the session** to detect and record any mistakes or learnings:

**Detection Sources**:

- Failed commands that required retry
- Changed approaches mid-implementation
- Tool errors and fixes
- Deviations from plan that indicate learnings
- Any "오류", "실수", "수정", "잘못" mentions in conversation

**Auto-Update Process**:

1. **Analyze Session**: Review conversation for patterns indicating mistakes
2. **Categorize**: Classify by type (GitHub, Code, Documentation, Branch, etc.)
3. **Format Entry**: Create structured entry following mistakes.md format:

   ```markdown
   ### YYYY-MM-DD: [Category] Rule Title

   - **실수**: What went wrong
   - **원인**: Why it happened
   - **규칙**: Rule to follow going forward
   - **참조**: Related issue/file references
   ```

4. **Append to File**: Add to `.claude/rules/mistakes.md`
5. **Update Date**: Update "마지막 업데이트" timestamp

**When to Skip**:

- No mistakes detected in session
- Only minor typos with no learnings
- User explicitly says "don't record"

**Example Auto-Detection**:

```
Session Analysis:
- ❌ GitHub MCP called with wrong owner → 규칙: owner 확인 필수
- ❌ Assignee not set on PR → 규칙: get_me 호출 후 assignee 설정
- ✅ Build passed on first try → No mistake

Adding 2 entries to mistakes.md...
```

### 7. Sub-Agent Cleanup

- Lists all agents created during this task (including qa-generator)
- Shows what each agent accomplished
- Removes agent references/configurations
- Confirms cleanup completion

### 8. Next Steps Guidance

Prompts user with:

```
Task completed and documented!

Next steps:
- Review implementation summary in docs/plans/{issue_number}-*.md
- Run `/commit` to create a commit
- Run `/pr` to create a pull request

Would you like me to proceed with creating a PR?
```

## Example Usage

```
User: /task-done

Claude:
1. Located plan: docs/plans/025-add-dark-mode-toggle.md

2. Generating implementation summary...
   - Files changed: 8 files modified
   - Commits: 5 commits in this branch
   - Running quality checks...
     ✓ Build: Success
     ✓ TypeScript: No errors
     ✓ Lint: Passed
     ✓ Tests: 12/12 passing

3. Appending summary to plan document...
   - Documented 8 file changes
   - Listed 3 deviations from original plan
   - Noted +2.3KB bundle impact
   - Added 2 follow-up tasks

4. 🧪 Generating QA checklist (qa-generator agent)...
   - Analyzing 8 changed files
   - Identifying affected features
   ✓ QA Checklist generated:
     - 12 functional tests
     - 4 edge case tests
     - 6 UI/UX tests
     - 3 regression tests

5. 📝 Updating mistakes log...
   Session Analysis:
   - ❌ Used wrong owner for GitHub MCP → Added rule
   - ❌ Forgot assignee on PR → Added rule
   ✓ Added 2 entries to .claude/rules/mistakes.md

6. Cleaning up sub-agents...
   - Removed: react-developer (completed 5 tasks)
   - Removed: code-reviewer (reviewed 8 files)
   - Removed: test-writer (created 4 test files)
   - Removed: qa-generator (generated 25 test cases)

Task completed and documented!

Next steps:
- Review: docs/plans/025-add-dark-mode-toggle.md
- Perform QA testing using generated checklist
- Run `/commit` to create commit
- Run `/pr` to create pull request

Would you like me to proceed with creating a PR?
```

## Summary Section Structure

### Required Fields

- **Completion Date**: Timestamp of completion
- **Implemented By**: Agent or developer name
- **Files Modified**: All changed files with line references
- **Key Implementation Details**: Major decisions and patterns used
- **Quality Validation**: Build, test, lint results
- **Deviations from Plan**: What changed and why

### Optional Fields

- **Performance Impact**: Bundle size, runtime metrics
- **Follow-up Tasks**: Items for future work
- **Notes**: Additional context or learnings
- **Screenshots**: For UI changes
- **API Changes**: For backend modifications

## Integration with Other Skills

- Reads plan created by `/task-init`
- Prepares metadata for `/commit` command
- Sets up context for `/pr` command
- Documents work for team knowledge base

## Validation Rules

### Must Pass Before Completion

1. ✅ Build succeeds (`npm run build`)
2. ✅ No TypeScript errors (`npx tsc --noEmit`)
3. ✅ Lint passes (`npm run lint`)
4. ✅ Plan document exists and is readable
5. ✅ At least one file was modified

### Optional Validations

- Tests passing (if tests exist)
- No console warnings
- Bundle size within limits
- Performance benchmarks met

## Notes

- Original plan content is NEVER modified - summary is appended after `---`
- If quality gates fail, provides actionable error messages
- Summary uses markdown links for easy navigation
- Preserves full git history in summary
- Can be run multiple times (updates existing summary)
- Always asks for confirmation before PR creation
