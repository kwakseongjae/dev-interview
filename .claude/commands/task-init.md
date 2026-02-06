# Task Init Command

## Description

**이슈 분석 → 코드베이스 탐색 → 계획 문서 생성 → (조건부) 스펙 문서 생성 → 서브에이전트 설정**

이 커맨드는:

- 📋 GitHub 이슈 내용 분석 (+ 추가 텍스트/이미지 입력 가능)
- 🔍 **병렬 탐색** (최소 3개 에이전트): 디렉토리, 유사 구현, 문서/Best Practices
- 🌐 필요 시 웹 리서치 (라이브러리 문서, 패턴 검색)
- 📝 상세 계획 문서 생성 (`docs/plans/{issue_number}-*.md`, 10개 섹션)
- 📋 **조건부 스펙 문서 생성** (API/스키마 관련 시 `docs/specs/{issue_number}/spec.md`)
- 🤖 서브에이전트 자동 설정 (react-developer, code-reviewer, test-writer 등)
- ✅ Vercel React Best Practices 자동 적용

**현재 브랜치**: 이슈 번호 자동 추출
**다음 단계**: 계획 승인 후 구현 시작

## Usage

```
/task-init                           # Analyze GitHub issue only
/task-init "additional context"      # Issue + text description
/task-init [attach image]            # Issue + image (design mockup, screenshot, etc.)
/task-init "context" [image]         # Issue + text + image
```

## Input Options

- **No arguments**: Analyzes only the GitHub issue linked to the current branch
- **Text argument**: Additional context, requirements, constraints, or implementation preferences
- **Image attachment**: Design mockups, UI screenshots, diagrams, error screenshots, bug reproductions
- **Both**: Combines text description with visual references for comprehensive context

## Workflow

### Step 1: Context Gathering

**A. GitHub Issue Analysis**:

1. Extract issue number from current branch name (format: `{type}/{issue_number}-{slug}`)
2. Fetch issue details using `gh issue view {issue_number}`:
   - Parse requirements and acceptance criteria
   - Extract labels (type, area, priority)
   - Read issue description and comments
3. Identify task type: feature, bug fix, enhancement, refactor, or documentation

**B. User Input Processing** (if provided):

**Text Input**:

- Parse additional requirements or clarifications
- Extract specific implementation preferences
- Identify technical constraints or dependencies
- Note any architectural decisions or patterns requested

**Image Input**:

- Analyze design mockups for UI requirements (layout, colors, typography, spacing)
- Review screenshots for bug reproduction steps
- Examine diagrams for architecture understanding
- Interpret error messages or logs for debugging context

**C. Combined Analysis**:

1. Merge GitHub issue context with user-provided input
2. Resolve conflicts or ambiguities:
   - Prioritize explicit user instructions over issue description
   - Flag inconsistencies for user clarification if needed
3. Create unified requirements document

### Step 2: Codebase Exploration

Use Task tool with Explore agent (thoroughness: medium by default) to:

1. **Map Directory Structure**:
   - Identify relevant directories for the task
   - Understand project organization patterns
   - Locate configuration files

2. **Find Related Files**:
   - Search for components/modules related to the task
   - Identify files that will need modification
   - Find similar implementations for reference

3. **Understand Architecture**:
   - Review existing patterns and conventions
   - Identify data flow and state management
   - Understand routing and API structure

4. **Assess Impact**:
   - Determine which areas will be affected
   - Identify potential breaking changes
   - Find dependencies and related features

**Thoroughness Levels**:

- Simple tasks (UI tweaks, minor fixes): `quick`
- Standard features/enhancements: `medium` (default)
- Complex refactors/architecture changes: `very thorough`

### Step 3: Research Phase

Perform web research if needed:

1. **Library Documentation**:
   - Search for official docs of unfamiliar libraries
   - Review API references for libraries being used
   - Check for recent changes or deprecations

2. **Best Practices**:
   - Search for React/Next.js patterns related to the task
   - Review Vercel React best practices rules applicable to task
   - Find performance optimization techniques

3. **Implementation Examples**:
   - Look for similar implementations or patterns
   - Review community solutions for complex problems
   - Check for security best practices

### Step 4: Plan Document Creation

Create plan document at `docs/plans/{issue_number}-{description}.md`:

**Use TEMPLATE.md structure with 10 sections**:

1. **Overview**: Problem statement, objectives, scope, success criteria
2. **Requirements**: Functional, technical, and non-functional requirements
3. **Architecture & Design**: Current state, proposed changes, design decisions, component architecture
4. **Implementation Plan**: 3-phase breakdown (Setup, Core, Polish), files to create/modify, sub-agent assignments
5. **Quality Gates**: Testing strategy, validation checklist, performance criteria
6. **Risks & Dependencies**: Potential blockers, mitigation strategies, external dependencies
7. **Rollout & Monitoring**: Deployment strategy, success metrics, rollback plan
8. **Timeline & Milestones**: Key milestones and checkpoints
9. **References**: Related issues, documentation, design files
10. **Implementation Summary**: (Auto-generated by `/task-done` after completion)

**Fill sections with specific details**:

- Include exact file paths, component names, function signatures
- Reference applicable Vercel React best practices rules
- Incorporate user-provided context (text/images) throughout
- Be specific and actionable, avoid vague descriptions

### Step 4.5: Spec Document Generation (Conditional - speckit.specify)

**조건부 speckit 스킬 호출**:

이슈가 스펙 문서가 필요한 경우, 실제 speckit 스킬(`speckit.specify`)을 호출합니다.

**트리거 조건** (하나라도 만족 시):

1. **레이블 기반**: `api`, `spec`, `schema`, `data-model` 레이블 포함
2. **키워드 기반**: 이슈 제목/본문에 "API", "endpoint", "스키마", "데이터 모델", "specification" 포함
3. **사용자 요청**: "/spec" 커맨드로 명시적 요청

**트리거 시 동작**:

```
📋 speckit.specify 스킬 호출...
   - Feature: {이슈 제목}
   - Description: {이슈 본문 요약}
```

`speckit.specify` 스킬이 실행되어:

- `specs/{feature-name}/spec.md` 생성
- User Stories with Acceptance Criteria
- Requirements (FR-XXX, NFR-XXX)
- [NEEDS CLARIFICATION] 태그로 모호한 부분 표시

**후속 speckit 워크플로우** (선택적):

```bash
/speckit.clarify    # 모호한 요구사항 명확화
/speckit.plan       # 구현 계획 생성
/speckit.tasks      # 작업 목록 생성
```

**트리거되지 않은 경우**: speckit 건너뛰고 기존 계획 문서(`docs/plans/`)만 생성

### Step 5: Sub-Agent Configuration

**Create specialized agents for implementation**:

1. **react-developer** (always for React/Next.js tasks):
   - Enable `vercel-react-best-practices` skill
   - Configure focus areas based on task type:
     - Data fetching: `async-*` rules (async-defer-await, async-parallel)
     - Performance: `bundle-*` rules (bundle-barrel-imports, bundle-dynamic-imports)
     - Components: `rerender-*` rules (rerender-memo, rerender-functional-setstate)
     - Server: `server-*` rules (server-cache-react, server-serialization)

2. **code-reviewer**:
   - Review code quality and adherence to best practices
   - Check for performance issues
   - Verify security considerations

3. **test-writer**:
   - Create unit tests for new functionality
   - Update existing tests affected by changes
   - Ensure test coverage meets standards

4. **doc-writer** (if documentation changes needed):
   - Update API documentation
   - Write JSDoc comments
   - Update README or guides

**Agent Tagging**:

- Tag agents with issue number for easy cleanup
- Configure agents with plan document reference
- Set up agents to use relevant best practices

### Step 6: User Approval

Present plan summary to user:

1. **Show Plan Highlights**:
   - Key objectives and approach
   - Files that will be created/modified
   - Major design decisions

2. **Display Sub-Agents**:
   - List agents that will be created
   - Show which best practices rules will be applied

3. **Request Confirmation**:
   - Ask: "Plan created. Ready to start implementation?"
   - Wait for user approval before proceeding
   - Allow user to request plan modifications

4. **Clarify Hint (스펙 문서 생성 시)**:
   - 스펙 문서에 `[NEEDS CLARIFICATION]` 태그가 있으면 안내:
   - "💡 스펙에 명확화가 필요한 부분이 있습니다. `/speckit.clarify` 실행을 권장합니다."

## Example Usage

### Example 1: Issue Only

```
User: /task-init

Claude:
🔍 Analyzing GitHub issue #25...
   - Type: Feature
   - Title: Add dark mode toggle
   - Labels: enhancement, ui, priority:high

📂 Exploring codebase...
   - Theme system: src/lib/theme.ts
   - Settings page: src/app/settings/page.tsx
   - 12 components need theme support

🌐 Researching...
   - Next.js 16 theming patterns
   - Radix UI theme switching

📝 Creating plan document...
   ✅ Saved: docs/plans/025-add-dark-mode-toggle.md

🤖 Sub-agent configuration:
   - react-developer: Component implementation (vercel-react-best-practices enabled)
   - code-reviewer: Code quality review
   - test-writer: Component tests

Plan created. Ready to start implementation?
```

### Example 2: Issue + Spec Document Generated

```
User: /task-init

Claude:
🔍 Analyzing GitHub issue #42...
   - Type: Feature
   - Title: Add payment API endpoint
   - Labels: api, priority:high

📂 Exploring codebase...
   - API routes: src/app/api/
   - Stripe integration: src/lib/stripe.ts

📋 speckit.specify 스킬 호출...
   ✅ Saved: specs/payment-api/spec.md
   - User Stories: 3 stories with acceptance criteria
   - Requirements: 5 items (FR + NFR)
   - ⚠️ Clarifications needed: 2 items marked [NEEDS CLARIFICATION]

📝 Creating plan document...
   ✅ Saved: docs/plans/042-add-payment-api-endpoint.md

🤖 Sub-agent configuration:
   - react-developer: API implementation
   - code-reviewer: Code quality review

Plan created. Ready to start implementation?

💡 스펙에 명확화가 필요한 부분이 있습니다. `/speckit.clarify` 실행을 권장합니다.
```

### Example 3: Issue + Text Context

```
User: /task-init "Toggle in header, use system preference default, store in localStorage"

Claude:
🔍 Analyzing context...
   - GitHub issue #25: Add dark mode toggle
   - User requirements:
     ✓ Location: Header component
     ✓ Default: System preference
     ✓ Storage: localStorage

📂 Exploring codebase...
   - Header: src/components/home/Header.tsx
   - Theme detection: src/lib/theme.ts

📝 Creating plan with your specifications...
   ✅ Saved: docs/plans/025-add-dark-mode-toggle.md
   ✓ Header placement included
   ✓ System default configured
   ✓ localStorage persistence added

Plan created with your specifications. Ready to start implementation?
```

### Example 3: Issue + Image (Design Mockup)

```
User: /task-init [attaches design-mockup.png]

Claude:
🔍 Analyzing context...
   - GitHub issue #25: Add dark mode toggle
   - Design mockup analyzed:
     ✓ Position: Top-right header
     ✓ Icons: Moon/Sun (Radix UI)
     ✓ Animation: Smooth fade
     ✓ Colors: Design system tokens

📂 Exploring codebase...
   - Design tokens: src/app/globals.css
   - Icon library: Radix UI Icons

📝 Creating plan based on design...
   ✅ Saved: docs/plans/025-add-dark-mode-toggle.md
   ✓ Design specs incorporated

Plan created matching your design. Ready to start implementation?
```

### Example 4: Issue + Text + Image

```
User: /task-init "Use this mockup design + add keyboard shortcut (Cmd+Shift+D)" [attaches mockup.png]

Claude:
🔍 Analyzing combined context...
   - GitHub issue #25: Add dark mode toggle
   - Design mockup: Toggle UI specifications
   - Keyboard shortcut: Cmd+Shift+D

📂 Exploring codebase...
   - Keyboard handler: src/lib/shortcuts.ts
   - Header: src/components/home/Header.tsx

📝 Creating comprehensive plan...
   ✅ Saved: docs/plans/025-add-dark-mode-toggle.md
   ✓ UI from mockup
   ✓ Keyboard shortcut
   ✓ Shortcut hint in UI

Plan created with mockup design and keyboard shortcut. Ready to start implementation?
```

## Error Handling

- If not on a branch with issue number format, show error and suggest using `/issue-start` first
- If issue fetch fails, ask user to provide context manually
- If codebase exploration finds no relevant files, flag this in the plan
- If web research is needed but fails, note this and continue with available context

## Notes

- Plan documents are versioned in git for historical reference
- Plan file naming: `{issue_number}-{kebab-case-description}.md`
- Sub-agents are cleaned up by `/task-done`
- Uses medium thoroughness by default (adjust based on task complexity)
- Always waits for user approval before starting implementation

## Integration

- Works with `/commit` for structured commits referencing the plan
- Works with `/pr` for creating pull requests with plan summary
- Works with `/task-done` for completion documentation and agent cleanup
- Sub-agents automatically use `vercel-react-best-practices` skill
