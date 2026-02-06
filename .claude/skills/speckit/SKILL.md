---
name: speckit
description: "[DEPRECATED] This skill now wraps actual speckit skills. Use speckit.* skills directly."
license: MIT
metadata:
  author: mochabun
  version: "2.0.0"
  deprecated: true
  migrated_to: "speckit.*"
---

# Speckit - Wrapper for Actual Speckit Skills

> **DEPRECATED**: 이 스킬은 실제 speckit 스킬들의 래퍼입니다.
> 직접 `speckit.*` 스킬을 사용하세요.

## Migration Guide

이 프로젝트에 실제 speckit이 설치되었습니다. 아래 실제 스킬들을 사용하세요:

| 기존 커스텀 스킬 | 실제 Speckit 스킬       | 설명                    |
| ---------------- | ----------------------- | ----------------------- |
| `/spec generate` | `speckit.specify`       | 기능 스펙 생성/업데이트 |
| `/spec validate` | `speckit.analyze`       | 일관성 분석 및 검증     |
| `/spec sync`     | (task-done에서 자동)    | 구현 결과 반영          |
| N/A              | `speckit.plan`          | 구현 계획 생성          |
| N/A              | `speckit.tasks`         | 작업 목록 생성          |
| N/A              | `speckit.implement`     | 구현 실행               |
| N/A              | `speckit.clarify`       | 모호한 요구사항 명확화  |
| N/A              | `speckit.checklist`     | 체크리스트 생성         |
| N/A              | `speckit.taskstoissues` | GitHub 이슈 변환        |
| N/A              | `speckit.constitution`  | 프로젝트 원칙 설정      |

## Actual Speckit Directory Structure

실제 speckit은 다음 구조를 사용합니다:

```
.specify/                    # Speckit 설정 (프로젝트 루트)
├── memory/
│   └── constitution.md     # 프로젝트 원칙
├── templates/              # 문서 템플릿
│   ├── spec-template.md
│   ├── plan-template.md
│   └── tasks-template.md
└── scripts/               # 스크립트

specs/                      # 기능별 스펙 (프로젝트 루트)
└── {feature-name}/
    ├── spec.md            # 기능 스펙 (speckit.specify)
    ├── plan.md            # 구현 계획 (speckit.plan)
    ├── tasks.md           # 작업 목록 (speckit.tasks)
    └── ...
```

**주의**:

- 기존 경로 `docs/specs/` → 실제 경로 `specs/`
- 기존 템플릿 `.claude/skills/speckit/templates/` → 실제 템플릿 `.specify/templates/`

## How to Use Actual Speckit

### `/spec` 커맨드로 자연어 요청

```bash
/spec 홈 배너 기능 스펙 작성해줘          # → speckit.specify
/spec 현재 기능의 구현 계획 세워줘        # → speckit.plan
/spec 작업 목록 생성해줘                  # → speckit.tasks
/spec 스펙 문서 검토하고 모호한 부분 명확히 해줘  # → speckit.clarify
/spec 스펙과 계획 일관성 분석해줘         # → speckit.analyze
/spec QA 체크리스트 만들어줘              # → speckit.checklist
```

### 직접 스킬 호출

```bash
/speckit.specify "feature description"
/speckit.plan
/speckit.tasks
/speckit.clarify
/speckit.analyze
/speckit.checklist
```

## Integration with Workflow

### task-init 통합

`/task-init` 실행 시, 스펙 관련 이슈면 자동으로 `speckit.specify` 호출:

**트리거 조건:**

- 레이블: `api`, `spec`, `schema`, `data-model`
- 키워드: "API", "endpoint", "스키마", "데이터 모델", "specification"

### task-done 통합

`/task-done` 실행 시, `specs/` 에 스펙 문서가 있으면:

- `speckit.analyze` 로 일관성 검증
- Implementation Notes 업데이트

## Deprecated Files

다음 파일들은 더 이상 사용되지 않습니다:

- `.claude/skills/speckit/templates/spec-template.md` → `.specify/templates/spec-template.md` 사용
- `.claude/agents/spec-documenter.md` → 실제 speckit 스킬 사용
- `docs/specs/` 디렉토리 → `specs/` 디렉토리 사용

## References

- 실제 Speckit 템플릿: `.specify/templates/`
- 프로젝트 원칙: `.specify/memory/constitution.md`
- `/spec` 커맨드: `.claude/commands/spec.md`
