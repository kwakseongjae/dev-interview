# Task Done Command

## Description

**Validate quality gates (build/types/lint) → collect implementation details → generate summary → append to plan document → cleanup sub-agents**

이 커맨드는:

- ✅ **품질 게이트 검증** (필수):
  - `npm run build` - 빌드 성공 확인
  - `npx tsc --noEmit` - TypeScript 에러 체크
  - `npm run lint` - 린트 통과 확인
- 📊 변경사항 자동 수집 (git diff, 커밋 히스토리, 성능 영향)
- 📝 Implementation Summary 생성 및 계획 문서에 추가
- 🧪 **QA Checklist 자동 생성** (qa-generator 에이전트)
- 📚 **Mistakes Log 자동 업데이트** (세션 분석 후 실수/학습 기록)
- 🧹 서브에이전트 정리
- 🎯 다음 단계 가이드 제공

**품질 게이트 실패 시**: 구체적 에러 메시지 + 작업 완료 불가
**다음 단계**: `/commit` → `/pr`

## Usage

```
/task-done
```

## Prerequisites

- Must be on a branch created with `/issue-start` (format: `{type}/{issue_number}-{slug}`)
- Must have used `/task-init` to create a plan document
- Must have made code changes (at least one file modified)

## Workflow

### Step 1: Find Plan Document

1. **Extract Issue Number**:
   - Get current branch name: `git branch --show-current`
   - Parse branch format: `{type}/{issue_number}-{slug}`
   - Example: `feat/25-add-feature` → Issue #25

2. **Locate Plan File**:
   - Search in `docs/plans/` directory
   - Pattern: `{issue_number}-*.md` (e.g., `025-add-dark-mode-toggle.md`)
   - If not found, show error and suggest running `/task-init` first

### Step 2: Quality Gate Validation

Run all quality checks before allowing task completion:

**Required Checks** (all must pass):

1. **Build Validation**:

   ```bash
   npm run build
   ```

   - Must complete without errors
   - If fails: Show build errors, stop task completion

2. **Type Check**:

   ```bash
   npx tsc --noEmit
   ```

   - Must pass with no type errors
   - If fails: Show type errors, stop task completion

3. **Lint Check**:

   ```bash
   npm run lint
   ```

   - Must pass with no lint errors
   - If fails: Show lint errors, stop task completion

4. **File Changes**:

   ```bash
   git diff --name-only main...HEAD
   ```

   - Must have at least one file changed
   - If no changes: Show warning, stop task completion

5. **Plan Document**:
   - Plan file must exist in `docs/plans/`
   - If not found: Show error, suggest running `/task-init`

**Quality Gate Results**:

- ✅ All checks pass → Continue to Step 3
- ❌ Any check fails → Stop, show specific errors, guide user to fix issues

### Step 3: Generate Implementation Summary

Automatically collect and analyze implementation details:

**A. Changed Files**:

```bash
git diff --name-only main...HEAD
```

- List all files that were created, modified, or deleted
- Group by directory/area for better readability
- Note file-level changes (added, modified, deleted)

**B. Commit History**:

```bash
git log main..HEAD --oneline
```

- List all commits made on the branch
- Include commit hashes and messages
- Show chronological order of work

**C. Diff Analysis**:

- Analyze what changed in each file
- Identify major changes (new features, refactors, fixes)
- Note affected components, functions, or modules
- Track additions/deletions line count

**D. Performance Impact** (if applicable):

- Check bundle size changes
- Note any performance-related changes
- Identify potential optimization opportunities

**E. Test Coverage** (if tests exist):

- List new test files created
- Note test coverage changes
- Identify untested areas

### Step 4: Create Implementation Summary

Generate comprehensive summary following this structure:

```markdown
---

## Implementation Summary

**Completion Date**: {YYYY-MM-DD}
**Implemented By**: Claude Sonnet 4.5

### Changes Made

**Created Files**:

- [{file}]({path}) - {description}

**Modified Files**:

- [{file}:{start}-{end}]({path}#L{start}-L{end}) - {description}

**Deleted Files**:

- {file} - {reason}

### Quality Validation

- [x] Build: Success
- [x] Type Check: Passed
- [x] Lint: Passed
- [x] Tests: {status}

### Deviations from Plan

**Added**:

- {description} - {reason for addition}

**Changed**:

- {description} - {reason for change from plan}

**Skipped**:

- {description} - {reason for skipping} - {follow-up issue number if created}

### Performance Impact

- Bundle size: +{X}KB / -{X}KB / No change
- Runtime impact: {description or "No significant impact"}
- Optimization notes: {any optimization applied}

### Testing

**Test Files**:

- {test file} - {coverage description}

**Manual Testing**:

- {steps performed}
- {results observed}

### Commits

\`\`\`
{hash} - {commit message}
{hash} - {commit message}
\`\`\`

### Follow-up Tasks

- [ ] #{issue_number} - {description}
- [ ] {description} (if no issue created yet)

### Notes

{Any additional notes, learnings, or important information}
```

### Step 5: Generate QA Checklist (via qa-generator agent)

**🧪 Spawn qa-generator sub-agent to create test checklist:**

```typescript
Task(
  subagent_type: "general-purpose",
  prompt: "QA Checklist generation based on changed files and plan document...",
  description: "QA checklist generation"
)
```

**Input to qa-generator**:

- Changed files list (`git diff --name-only main...HEAD`)
- Commit messages
- Plan document content (Requirements, Implementation Plan)
- Issue acceptance criteria

**Generated Output**:

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
> Date: {YYYY-MM-DD}

### 테스트 요약

- **총 테스트 케이스**: {N}개
- **우선순위별**: High {X}, Medium {Y}, Low {Z}

### 기능 테스트

| #    | 테스트 시나리오 | 사전 조건 | 테스트 단계 | 예상 결과 | 우선순위 |
| ---- | --------------- | --------- | ----------- | --------- | -------- |
| FT-1 | ...             | ...       | ...         | ...       | High     |

### 엣지 케이스

[테이블]

### UI/UX 테스트

[테이블]

### 회귀 테스트

[테이블]

### 테스트 실행 가이드

1. 로컬 개발 서버 실행: `npm run dev`
2. High 우선순위 테스트부터 순서대로 진행
3. 각 테스트 결과를 체크박스에 기록
```

### Step 6: Append Summary to Plan Document

1. **Read Current Plan**:
   - Load plan document from `docs/plans/{issue_number}-*.md`
   - Verify document structure

2. **Append Implementation Summary**:
   - Add generated summary to Section 10 (Implementation Summary)
   - Add QA Checklist after Implementation Summary
   - Preserve all other sections
   - Ensure proper markdown formatting

3. **Save Updated Plan**:
   - Write updated content back to plan file
   - Verify file was saved successfully

### Step 7: Update Mistakes Log (Auto-Detection)

**Automatically analyze the session** to detect and record any mistakes or learnings:

1. **Analyze Session**:
   - Review conversation for error patterns
   - Identify failed commands that required retry
   - Detect changed approaches mid-implementation
   - Find tool errors and fixes
   - Look for "오류", "실수", "수정", "잘못" mentions

2. **Categorize Mistakes**:
   - [GitHub] - MCP, API, owner/repo issues
   - [Code] - Type errors, build failures
   - [Documentation] - Missing/outdated docs
   - [Branch] - Git workflow issues
   - [Settings] - Configuration errors

3. **Format Entry** (for each detected mistake):

   ```markdown
   ### YYYY-MM-DD: [Category] Rule Title

   - **실수**: What went wrong
   - **원인**: Why it happened
   - **규칙**: Rule to follow going forward
   - **참조**: Related issue/file references
   ```

4. **Update mistakes.md**:
   - Append entries to `.claude/rules/mistakes.md`
   - Update "마지막 업데이트" timestamp
   - Preserve existing entries

5. **Display Results**:
   ```
   📚 Mistakes Log Updated:
   - ❌ GitHub MCP with wrong owner → Added rule
   - ❌ Assignee not set on PR → Added rule
   ✅ Added 2 entries to .claude/rules/mistakes.md
   ```

**Skip if**:

- No mistakes detected in session
- Only minor typos with no learnings
- User explicitly says "don't record"

### Step 8: Clean Up Sub-Agents

1. **Identify Created Agents**:
   - List agents created during `/task-init`:
     - react-developer
     - code-reviewer
     - test-writer
     - doc-writer
     - qa-generator (created in Step 5)

2. **Display Agent Summary**:

   ```
   🤖 Sub-agents used in this task:
   - react-developer: Implemented 3 components with Vercel best practices
   - code-reviewer: Reviewed 12 files, found 2 issues (fixed)
   - test-writer: Created 4 test files with 95% coverage
   - qa-generator: Generated 15 test cases (High 5, Medium 7, Low 3)
   ```

3. **Remove Agent References**:
   - Clean up agent tags
   - Remove temporary agent configurations

### Step 9: Provide Next Steps

Display completion message with guidance:

```
✅ Task completed and documented!

📋 Summary:
- {X} files changed
- {Y} commits made
- Quality gates: All passed
- Documentation: Updated

📄 Plan document updated:
   docs/plans/{issue_number}-{description}.md

🔄 Next steps:
1. Review the implementation summary above
2. Run `/commit` to create structured commit(s)
3. Run `/pr` to create pull request

Would you like me to proceed with creating a commit?
```

## Example

**Current Branch**: `feat/25-add-dark-mode-toggle`

**Input:**

```
/task-done
```

**Output:**

```
🔍 Validating quality gates...
   ✅ Build: Success
   ✅ Type Check: Passed (0 errors)
   ✅ Lint: Passed (0 warnings)
   ✅ File Changes: 8 files modified

📊 Analyzing implementation...
   - 8 files changed
   - 5 commits made
   - +245 / -89 lines

📝 Generating implementation summary...
   ✅ Summary created

🧪 Generating QA checklist (qa-generator agent)...
   - Analyzing 8 changed files
   - Identifying affected features
   ✅ QA Checklist generated:
      - 12 functional tests
      - 4 edge case tests
      - 6 UI/UX tests
      - 3 regression tests

📄 Updating plan document...
   ✅ docs/plans/025-add-dark-mode-toggle.md updated
   ✅ QA Checklist appended

📚 Updating mistakes log...
   Session Analysis:
   - ❌ Used wrong owner for GitHub MCP → Added rule
   - ❌ Forgot assignee on PR → Added rule
   ✅ Added 2 entries to .claude/rules/mistakes.md

🤖 Cleaning up sub-agents...
   - react-developer: 3 components implemented
   - code-reviewer: 8 files reviewed
   - test-writer: 4 tests created
   - qa-generator: 25 test cases generated

✅ Task completed and documented!

📋 Summary:
- 8 files changed
- 5 commits made
- Quality gates: All passed
- Documentation: Updated
- QA Checklist: 25 test cases

🔄 Next steps:
1. Review the implementation summary in docs/plans/025-add-dark-mode-toggle.md
2. Review QA checklist and perform manual testing
3. Run `/commit` to create structured commit(s)
4. Run `/pr` to create pull request

Would you like me to proceed with creating a commit?
```

## Error Handling

### Quality Gate Failures

**Build Failure**:

```
❌ Build failed

Error: Type error in src/components/ThemeToggle.tsx
  Line 42: Property 'theme' does not exist on type 'Props'

Fix the build error and run /task-done again.
```

**Type Check Failure**:

```
❌ Type check failed

Found 3 type errors:
1. src/lib/theme.ts:15 - Type 'string' is not assignable to type 'Theme'
2. src/components/Header.tsx:23 - Property 'toggle' is missing
3. src/hooks/useTheme.ts:8 - Cannot find name 'ThemeContext'

Fix the type errors and run /task-done again.
```

**Lint Failure**:

```
❌ Lint check failed

Found 2 lint errors:
1. src/components/ThemeToggle.tsx:10 - 'React' is defined but never used
2. src/lib/theme.ts:25 - Unexpected console statement

Fix the lint errors and run /task-done again.
```

### Other Errors

**Plan Document Not Found**:

```
❌ Plan document not found

No plan document found for issue #25 in docs/plans/

Did you run /task-init to create a plan before starting implementation?
Run /task-init first to create a plan document.
```

**No File Changes**:

```
⚠️ No file changes detected

No files were modified on this branch.

Make some code changes before running /task-done.
```

**Not on Valid Branch**:

```
❌ Invalid branch format

Current branch: main

/task-done requires a branch created with /issue-start
Format: {type}/{issue_number}-{slug}

Run /issue-start first to create a proper branch.
```

## Notes

- Always validates all quality gates before allowing completion
- Implementation summary is auto-generated from git history
- Plan documents serve as project knowledge base
- Sub-agents are automatically cleaned up
- Must pass all quality checks to complete task

## Integration

- Depends on `/task-init` for plan document creation
- Works with `/commit` for next step (committing changes)
- Works with `/pr` for creating pull requests
- Plan document includes full implementation history
