---
name: task-init
description: Initialize task planning workflow - analyzes GitHub issues, scans codebase, creates detailed plan documents in docs/plans, and sets up sub-agents for implementation with Vercel React best practices
license: MIT
metadata:
  author: mochabun
  version: "1.0.0"
---

# Task Init

Comprehensive task initialization workflow for efficient development planning and execution.

## When to Apply

Use `/task-init` when:

- Starting work on a new GitHub issue
- Planning a new feature or enhancement
- Beginning a bug fix that requires investigation
- Implementing a refactoring task
- Any task that needs structured planning before execution

## Usage

```bash
/task-init                           # Analyze GitHub issue only
/task-init "additional context"      # Issue + text description
/task-init [attach image]            # Issue + image (design mockup, screenshot, etc.)
/task-init "context" [image]         # Issue + text + image
```

**Input Options**:

- **No arguments**: Analyzes only the GitHub issue
- **Text argument**: Additional context, requirements, or clarifications
- **Image attachment**: Design mockups, UI screenshots, diagrams, error screenshots, etc.
- **Both**: Combines text description with visual references

## What This Skill Does

1. **Analyzes GitHub Issue**: Retrieves and analyzes the current issue from GitHub to understand requirements
2. **Processes User Input**: Incorporates additional context (text and/or images) provided by the user
3. **🚀 Scans Codebase (PARALLEL)**: **Spawns 3+ agents simultaneously** to explore directory structure, find similar implementations, and research documentation
4. **Aggregates Findings**: Merges insights from all parallel agents into unified context
5. **Creates Plan Document**: Generates a detailed plan in `docs/plans/{issue_number}-{slug}.md` using the template
6. **📋 Creates Spec Document (Conditional)**: For API/schema related issues, invokes `speckit.specify` to generate spec document in `specs/{feature-name}/spec.md`
7. **Sets Up Sub-Agents**: Creates specialized agents (react-developer, code-reviewer, test-writer, doc-writer) configured to use Vercel React best practices
8. **Awaits Approval**: Asks user for confirmation before starting implementation

## 🎯 Enhanced Sub-Agent Strategy

**Key Innovation**: This skill now **maximizes parallel sub-agent usage** during the planning phase.

**Before (Traditional)**:

- Single Explore agent (optional)
- Sequential execution
- Limited context gathering

**After (Enhanced)**:

- **Minimum 3 agents spawned in parallel**
- Simultaneous exploration, pattern finding, and research
- Comprehensive context from multiple perspectives
- **Faster planning** through parallelization
- **Higher quality plans** with diverse insights

**Benefits**:

- ⚡ **Speed**: Parallel execution reduces planning time
- 🎯 **Thoroughness**: Multiple agents cover more ground
- 💡 **Quality**: Diverse perspectives lead to better decisions
- 🔍 **Context**: Deeper codebase understanding
- 📚 **Research**: Integrated documentation lookup

## Workflow Steps

### 1. Context Gathering

**A. GitHub Issue Analysis**:

- Fetch current branch name to extract issue number
- Use `gh issue view` to retrieve issue details
- Parse requirements, acceptance criteria, and labels

**B. User Input Processing** (if provided):

- **Text Input**:
  - Parse additional requirements or context
  - Identify clarifications or constraints
  - Extract specific implementation preferences
- **Image Input**:
  - Analyze design mockups for UI requirements
  - Review screenshots for bug reproduction
  - Examine diagrams for architecture understanding
  - Interpret error messages or logs

**C. Combined Analysis**:

- Merge GitHub issue with user-provided context
- Resolve conflicts or ambiguities
- Prioritize explicit user instructions over issue description
- Flag any inconsistencies for user clarification

### 2. Codebase Exploration (Enhanced Parallel Strategy)

**🚀 IMPORTANT: Spawn Multiple Agents in Parallel (Minimum 3)**

Use parallel agent spawning to maximize exploration efficiency and plan quality. This is the **core enhancement** of the task-init workflow.

**Standard Agent Configuration:**

1. **Agent 1 - Directory & File Explorer**:
   - **Type**: Explore agent (thoroughness: medium)
   - **Focus**: Map directory structure, locate relevant files
   - **Deliverable**: List of affected files, component hierarchy, project organization
   - **Prompt**: "Explore the codebase to map directory structure and identify files related to {task}. Focus on: {relevant directories based on task type}. Thoroughness: medium"

2. **Agent 2 - Similar Implementation Finder**:
   - **Type**: Explore agent (thoroughness: medium)
   - **Focus**: Find similar patterns, existing implementations, reusable code
   - **Deliverable**: Reference implementations, similar components, architectural patterns
   - **Prompt**: "Search the codebase for similar implementations or patterns related to {task}. Look for: {similar features, components, or utilities}. Thoroughness: medium"

3. **Agent 3 - Documentation & Best Practices Researcher**:
   - **Type**: general-purpose agent
   - **Focus**: Web research for libraries, patterns, official docs
   - **Deliverable**: Library documentation links, best practices, implementation examples
   - **Prompt**: "Research documentation and best practices for {task}. Search for: {relevant libraries, React/Next.js patterns, Vercel React best practices}. Use WebSearch/WebFetch as needed."

4. **Agent 4 - Spec Analyzer (CONDITIONAL)**:
   - **Type**: Explore agent (thoroughness: medium)
   - **Trigger**: Only if issue involves API, schema, data-model, or spec-related work
   - **Focus**: Analyze existing specs, API patterns, data models
   - **Deliverable**: Existing spec locations, API structure, related interfaces
   - **Prompt**: "Analyze codebase for API specifications and data models related to {task}. Look for: existing specs in docs/specs/, API routes in src/app/api/, TypeScript interfaces, GraphQL schemas. Return: spec locations, API structure, interface definitions."
   - **Trigger Conditions**:
     - Issue labels include: `api`, `spec`, `schema`, `data-model`
     - Issue title/body contains: "API", "endpoint", "스키마", "데이터 모델", "specification"
     - Expected file changes: `src/app/api/**`, `src/lib/types.ts`

**Parallel Execution Pattern:**

```typescript
// Spawn all 3 agents in a SINGLE message with multiple Task tool calls
Task(subagent_type: "Explore", prompt: "Agent 1 prompt...", description: "Directory exploration")
Task(subagent_type: "Explore", prompt: "Agent 2 prompt...", description: "Similar implementations")
Task(subagent_type: "general-purpose", prompt: "Agent 3 prompt...", description: "Documentation research")
```

**Aggregation Logic:**

After all agents complete:

1. Collect findings from each agent
2. Merge directory maps, file lists, and similar implementations
3. Combine research findings (docs, best practices, examples)
4. Resolve conflicts (e.g., multiple approaches found)
5. Synthesize into unified plan document

**Thoroughness Adjustment:**

- **Simple tasks** (UI tweaks, minor fixes): `quick` (1 agent may suffice)
- **Standard features/enhancements**: `medium` (3 agents minimum) ← **Default**
- **Complex refactors/architecture changes**: `very thorough` (3-5 agents, higher thoroughness)

### 3. Research Phase (Integrated with Agent 3)

**This step is now handled by Agent 3 (Documentation Researcher) in parallel with Agents 1-2.**

If additional research is needed after initial exploration:

- Spawn targeted research agents for specific questions
- Use WebSearch for library documentation, React/Next.js patterns
- Use WebFetch for official documentation pages
- Check Vercel React best practices skill for applicable rules

### 4. Plan Document Creation

- Use the TEMPLATE.md structure from `docs/plans/`
- Fill in all sections with specific, actionable details
- Include file paths, component names, and implementation strategies
- Reference applicable Vercel React best practices rules
- Save as `docs/plans/{issue_number}-{description}.md`

### 4.5 Spec Document Creation (Conditional - speckit.specify)

**Trigger Conditions** (any of the following):

- Issue labels include: `api`, `spec`, `schema`, `data-model`
- Issue title/body contains: "API", "endpoint", "스키마", "데이터 모델", "specification", "contract"
- Agent 4 (Spec Analyzer) found relevant API/schema patterns
- User explicitly requested via `/spec` command
- **🆕 계획 문서 내용 기반 판단** (Content-based trigger):
  - 계획 문서에 새로운 API 엔드포인트 정의가 포함된 경우 (예: `POST /api/...`, `GET /api/...`)
  - 계획 문서에 새로운 DB 테이블/스키마 정의가 포함된 경우 (예: `CREATE TABLE`, 스키마 설계)
  - 계획 문서에 타입 정의 변경이 포함된 경우 (예: `src/types/` 파일 수정)
  - AI/외부 API 통합이 포함된 경우 (예: Claude API, 외부 서비스 연동)

**자동 판단 로직**:

```
계획 문서 작성 완료 후:
1. 문서 내용 스캔: API 엔드포인트, DB 스키마, 타입 정의 확인
2. 다음 중 하나라도 해당되면 speckit.specify 자동 호출:
   - 새 API 엔드포인트 1개 이상
   - 새 DB 테이블/스키마 정의
   - 복잡한 데이터 모델 변경
3. 호출 시 계획 문서 내용을 speckit에 전달하여 일관성 유지
```

**If triggered:**

**Invoke actual speckit.specify skill:**

```
📋 speckit.specify 스킬 호출...
   - Feature: {이슈 제목}
   - Description: {이슈 본문 요약}
   - GitHub Issue: #{이슈 번호} (자동 링크)
```

**GitHub Issue 링크 자동 삽입:**

- 브랜치명에서 이슈 번호 추출: `feat/123-feature-name` → `#123`
- spec.md 헤더에 이슈 링크 추가: `**GitHub Issue**: [#123](https://github.com/OWNER/REPO/issues/123)`
- PR 생성 시 "Closes #123" 자동 추가 연동

The `speckit.specify` skill generates:

1. Spec directory: `specs/{feature-name}/`
2. Spec document: `specs/{feature-name}/spec.md` with:
   - User Stories with Acceptance Criteria (prioritized P1, P2, P3...)
   - Requirements (FR-XXX, NFR-XXX format)
   - Success Criteria (measurable outcomes)
   - `[NEEDS CLARIFICATION]` tags for ambiguous requirements
3. Cross-reference link to plan document

**Output:**

```
📋 speckit.specify 완료: specs/{feature-name}/spec.md
   - User Stories: {N} stories with acceptance criteria
   - Requirements: {N} items (FR + NFR)
   - Clarifications needed: {N} items marked [NEEDS CLARIFICATION]
```

**If NOT triggered:**

- Skip speckit.specify
- Continue with plan document only (`docs/plans/`)
- Note in plan document: "Spec document not required for this task type"

### 4.6 Speckit Tasks Generation (Auto-chained)

**🆕 speckit.specify가 실행된 경우, 자동으로 speckit.tasks도 연속 호출합니다.**

**자동 연계 로직:**

```
speckit.specify 완료 후:
1. spec.md 생성 확인
2. 체크리스트 검증 통과 확인
3. speckit.tasks 자동 호출
   → specs/{feature-name}/tasks.md 생성
4. 작업 목록을 plan 문서와 동기화
```

**Output:**

```
📋 speckit.tasks 완료: specs/{feature-name}/tasks.md
   - Total Tasks: {N}개
   - P1 Tasks: {N}개 (우선 구현)
   - P2 Tasks: {N}개
   - Dependencies: 작업 간 의존성 정의됨
```

**생성되는 파일 구조:**

```
specs/{feature-name}/
├── spec.md              # 스펙 문서 (speckit.specify)
├── tasks.md             # 작업 목록 (speckit.tasks) - 자동 생성
└── checklists/
    └── requirements.md  # 품질 체크리스트
```

**tasks.md와 plan 문서 동기화:**

- `docs/plans/{issue}-*.md`의 Implementation Plan 섹션과 `specs/{feature}/tasks.md`가 상호 참조
- 중복 방지: tasks.md가 세부 작업, plan이 전체 흐름 담당

### 5. Sub-Agent Configuration

**For React/Next.js Code Changes:**

```markdown
Sub-agents will be configured with:

- vercel-react-best-practices skill enabled
- Specific focus areas based on task type:
  - async-\* rules for data fetching tasks
  - bundle-\* rules for performance tasks
  - rerender-\* rules for component refactoring
  - server-\* rules for API/server components
```

**Agent Types to Create:**

- `react-developer`: For writing React/Next.js components (always uses best practices)
- `code-reviewer`: For reviewing code quality and performance
- `test-writer`: For creating/updating tests
- `doc-writer`: For documentation updates (if needed)

### 6. User Approval

- Present plan summary with key decisions
- Show which sub-agents will be created
- Ask: "Plan created. Ready to start implementation?"

## Example Usage

### Example 1: Issue Only (Enhanced with Parallel Agents)

```
User: /task-init

Claude:
1. Analyzing GitHub issue #25...
   - Type: Feature
   - Title: Add dark mode toggle
   - Labels: enhancement, ui, priority:high

2. 🚀 Spawning 3 agents in parallel for comprehensive exploration...

   Agent 1 (Directory Explorer):
   - Mapping directory structure...
   - Found theme system in src/lib/theme.ts
   - Located settings page at src/app/settings/page.tsx
   - Identified 12 components that need theme support

   Agent 2 (Similar Implementation Finder):
   - Searching for similar patterns...
   - Found LanguageToggle component in src/components/LanguageToggle.tsx
   - Located localStorage usage in src/lib/storage.ts
   - Identified useLocalStorage hook pattern

   Agent 3 (Documentation Researcher):
   - Researching documentation...
   - Next.js 16 theming patterns (official docs)
   - Radix UI theme switching examples
   - CSS variables approach for theme switching

   ✅ All agents completed successfully

3. Aggregating findings from 3 agents...
   - Combined directory maps and file lists
   - Merged similar implementation patterns
   - Integrated documentation and best practices

4. Creating comprehensive plan document...
   - Saved: docs/plans/025-add-dark-mode-toggle.md
   - Incorporated insights from all 3 agents

5. Sub-agent configuration for implementation:
   - react-developer: Component implementation (with vercel-react-best-practices)
   - code-reviewer: Code quality review
   - test-writer: Component tests

Plan created using enhanced parallel strategy. Ready to start implementation?
```

### Example 2: Issue + Text Context

```
User: /task-init "Toggle should be in the header, use system preference as default, store preference in localStorage"

Claude:
1. Analyzing context...
   - GitHub issue #25: Add dark mode toggle
   - User requirements:
     * Location: Header component
     * Default: System preference
     * Storage: localStorage

2. Exploring codebase...
   - Found Header at src/components/home/Header.tsx
   - Located theme detection in src/lib/theme.ts

3. Creating plan with user preferences...
   - Saved: docs/plans/025-add-dark-mode-toggle.md
   - Incorporated: header placement, system default, localStorage

Plan created with your specifications. Ready to start implementation?
```

### Example 3: Issue + Image (Design Mockup)

```
User: /task-init [attaches design-mockup.png]

Claude:
1. Analyzing context...
   - GitHub issue #25: Add dark mode toggle
   - Design mockup analyzed:
     * Toggle position: Top-right header
     * Icon style: Moon/Sun icons
     * Animation: Smooth fade transition
     * Colors: Matches design system

2. Exploring codebase...
   - Found design tokens in src/app/globals.css
   - Located icon library: Radix UI Icons

3. Creating plan based on design...
   - Saved: docs/plans/025-add-dark-mode-toggle.md
   - Design specs incorporated into requirements

Plan created matching your design. Ready to start implementation?
```

### Example 4: Issue + Text + Image

```
User: /task-init "Use the toggle from this mockup, but add keyboard shortcut (Cmd+Shift+D)" [attaches mockup.png]

Claude:
1. Analyzing combined context...
   - GitHub issue #25: Add dark mode toggle
   - Design mockup: Toggle UI specifications
   - Additional requirement: Keyboard shortcut (Cmd+Shift+D)

2. Exploring codebase...
   - Found keyboard handler in src/lib/shortcuts.ts
   - Located Header component structure

3. Creating comprehensive plan...
   - Saved: docs/plans/025-add-dark-mode-toggle.md
   - Included: UI from mockup + keyboard shortcut
   - Added: Keyboard shortcut to docs and UI hint

Plan created with mockup design and keyboard shortcut. Ready to start implementation?
```

## Plan Document Structure

The plan follows this template structure:

- **Overview**: Issue context, objectives, scope
- **Requirements**: Functional and technical requirements
- **Architecture**: Implementation approach and design decisions
- **Task Breakdown**: Specific tasks with file paths and effort estimates
- **Quality Gates**: Testing, validation, and acceptance criteria
- **Risks & Dependencies**: Potential blockers and mitigation strategies
- **Best Practices**: Applicable Vercel React rules to follow

## Integration with Other Skills

- Works seamlessly with `/commit` for structured commits
- Pairs with `/pr` for creating pull requests
- Plan document is referenced by `/task-done` for summary generation
- Sub-agents created here are cleaned up by `/task-done`

## Notes

- Always creates plan in `docs/plans/` directory
- Plan file naming: `{issue_number}-{kebab-case-description}.md`
- Sub-agents are tagged with issue number for easy cleanup
- Plans are versioned in git for historical reference
- Uses medium thoroughness for Explore agent by default (quick for simple tasks, very thorough for complex ones)
