# Spec Documenter Agent

> **DEPRECATED**: 이 에이전트는 더 이상 사용되지 않습니다.
> 실제 speckit 스킬을 사용하세요: `speckit.specify`, `speckit.plan`, `speckit.tasks` 등

## Migration

이 프로젝트에 실제 speckit이 설치되었습니다.

### 기존 기능 → 실제 스킬 매핑

| 기존 기능              | 실제 Speckit 스킬 |
| ---------------------- | ----------------- |
| 스펙 문서 생성         | `speckit.specify` |
| User Story 작성        | `speckit.specify` |
| Acceptance Criteria    | `speckit.specify` |
| 모호한 요구사항 명확화 | `speckit.clarify` |
| 구현 후 스펙 업데이트  | `speckit.analyze` |

### 디렉토리 변경

- **기존**: `docs/specs/{issue_number}/`
- **실제 speckit**: `specs/{feature-name}/`

### 사용법

```bash
# 자연어 요청 (권장)
/spec 홈 배너 기능 스펙 작성해줘

# 직접 스킬 호출
/speckit.specify "feature description"
```

## References

- `/spec` 커맨드: `.claude/commands/spec.md`
- 실제 speckit 스킬: `speckit.*`
- 템플릿: `.specify/templates/`
