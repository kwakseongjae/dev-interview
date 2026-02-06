# /spec Command

실제 speckit 스킬을 호출하여 스펙 문서를 관리하는 커맨드입니다.

## Usage

```bash
/spec                                    # 도움말 표시
/spec {자연어 요청}                       # 자연어로 스펙 관련 작업 요청
```

## Natural Language Examples

```bash
/spec 홈 배너 기능 스펙 작성해줘
/spec 현재 기능의 구현 계획 세워줘
/spec 작업 목록 생성해줘
/spec 스펙 문서 검토하고 모호한 부분 명확히 해줘
/spec 스펙과 계획 일관성 분석해줘
/spec QA 체크리스트 만들어줘
```

ARGUMENT: $ARGUMENTS

---

## Speckit Skill Mapping

이 커맨드는 자연어 요청을 분석하여 적절한 speckit 스킬을 호출합니다:

| 의도 키워드                         | Speckit Skill           | 설명                      |
| ----------------------------------- | ----------------------- | ------------------------- |
| "스펙 작성", "스펙 생성", "specify" | `speckit.specify`       | 기능 스펙 생성/업데이트   |
| "계획", "plan", "설계"              | `speckit.plan`          | 구현 계획 생성            |
| "작업", "task", "할일"              | `speckit.tasks`         | 작업 목록 생성            |
| "구현", "implement", "실행"         | `speckit.implement`     | 구현 실행                 |
| "명확히", "clarify", "질문"         | `speckit.clarify`       | 모호한 부분 명확화        |
| "분석", "analyze", "검토"           | `speckit.analyze`       | 일관성 분석               |
| "체크리스트", "checklist", "QA"     | `speckit.checklist`     | 체크리스트 생성           |
| "이슈", "issues", "GitHub"          | `speckit.taskstoissues` | 작업을 GitHub 이슈로 변환 |
| "원칙", "constitution"              | `speckit.constitution`  | 프로젝트 원칙 설정        |

---

## Execution Flow

### Step 1: Intent Detection

사용자 요청에서 의도 파악:

```
입력: "/spec 홈 배너 기능 스펙 작성해줘"

분석:
- 키워드: "스펙 작성"
- Intent: SPECIFY
- Context: "홈 배너 기능"
```

### Step 2: Delegate to Speckit Skill

의도에 따라 적절한 speckit 스킬 호출:

| Intent    | Speckit Skill Call                       |
| --------- | ---------------------------------------- |
| SPECIFY   | `Skill: speckit.specify` + 컨텍스트 전달 |
| PLAN      | `Skill: speckit.plan`                    |
| TASKS     | `Skill: speckit.tasks`                   |
| IMPLEMENT | `Skill: speckit.implement`               |
| CLARIFY   | `Skill: speckit.clarify`                 |
| ANALYZE   | `Skill: speckit.analyze`                 |
| CHECKLIST | `Skill: speckit.checklist`               |

### Step 3: Execute Skill

해당 speckit 스킬이 실행되어:

- `specs/{feature}/spec.md` - 스펙 문서
- `specs/{feature}/plan.md` - 구현 계획
- `specs/{feature}/tasks.md` - 작업 목록
- 기타 speckit 산출물 생성

---

## Speckit Directory Structure

실제 speckit은 다음 구조를 사용합니다:

```
.specify/                    # Speckit 설정
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
    ├── research.md        # 리서치 결과
    ├── data-model.md      # 데이터 모델
    └── contracts/         # API 계약
```

---

## Examples

### Example 1: 스펙 작성

```
User: /spec 홈 배너 관리 기능 스펙 작성해줘

Claude:
🔍 요청 분석...
   - Intent: SPECIFY
   - Context: "홈 배너 관리 기능"

📋 speckit.specify 스킬 호출...
   → 기능 설명을 기반으로 스펙 생성

[speckit.specify 스킬이 실행됨]
```

### Example 2: 구현 계획

```
User: /spec 현재 스펙 기반으로 구현 계획 세워줘

Claude:
🔍 요청 분석...
   - Intent: PLAN

📋 speckit.plan 스킬 호출...

[speckit.plan 스킬이 실행됨]
```

### Example 3: 스펙 검토

```
User: /spec 스펙 문서 검토하고 모호한 부분 질문해줘

Claude:
🔍 요청 분석...
   - Intent: CLARIFY

📋 speckit.clarify 스킬 호출...

[speckit.clarify 스킬이 실행됨]
```

---

## Integration with Workflow

### task-init 연동

`/task-init` 실행 시 스펙 관련 이슈면:

1. `speckit.specify` 자동 호출 가능
2. 또는 사용자가 `/spec` 으로 명시적 호출

### task-done 연동

구현 완료 후:

- `/spec 구현 결과 반영해줘` → 스펙 문서 업데이트
- `/speckit.analyze` 로 일관성 검증

---

## Available Speckit Skills

| Skill                   | 설명                    |
| ----------------------- | ----------------------- |
| `speckit.specify`       | 기능 스펙 생성/업데이트 |
| `speckit.plan`          | 구현 계획 생성          |
| `speckit.tasks`         | 작업 목록 생성          |
| `speckit.implement`     | 구현 실행               |
| `speckit.clarify`       | 모호한 요구사항 명확화  |
| `speckit.analyze`       | 일관성 분석             |
| `speckit.checklist`     | 체크리스트 생성         |
| `speckit.taskstoissues` | GitHub 이슈 변환        |
| `speckit.constitution`  | 프로젝트 원칙 설정      |

---

## Notes

- 이 커맨드는 실제 speckit 스킬을 위임 호출합니다
- 스펙 문서는 `specs/` 디렉토리에 저장됩니다 (프로젝트 루트)
- 프로젝트 원칙은 `.specify/memory/constitution.md`에 정의됩니다
- 자연어 요청이 불명확하면 확인 질문을 합니다
