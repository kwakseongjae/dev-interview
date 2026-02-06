# .claude/rules/

> CLAUDE.md의 상세 문서 디렉토리
> Progressive Disclosure 원칙에 따라 핵심 내용만 CLAUDE.md에 유지하고, 자세한 내용은 이곳에 분리

---

## 구조

```
.claude/
├── rules/
│   ├── README.md            # 이 파일
│   ├── workflows.md         # 워크플로우 상세 가이드
│   ├── task-management.md   # 작업 관리 시스템 상세
│   └── mistakes.md          # 실수 기록 및 규칙 (계속 업데이트)
├── skills/
│   ├── task-init/           # 작업 계획 수립 skill
│   ├── task-done/           # 작업 완료 문서화 skill
│   └── vercel-react-best-practices/  # React 성능 최적화
└── settings.json            # Claude Code 설정
```

---

## 파일 설명

### [workflows.md](workflows.md)

전체 개발 워크플로우 상세 가이드

**내용**:

- `/issue-start` → `/task-init` → 구현 → `/task-done` → `/commit` → `/pr` 전체 흐름
- 각 단계별 동작 원리
- 병렬 작업 (Worktree) 가이드
- 팁 & 트릭

**언제 참조**: 워크플로우 전체를 이해하고 싶을 때

### [task-management.md](task-management.md)

작업 관리 시스템 상세 설명

**내용**:

- `task-init` skill 상세 (6단계 프로세스)
- `task-done` skill 상세 (6단계 프로세스)
- 계획 문서 템플릿 가이드
- 다른 커맨드와의 통합 포인트
- 히스토리 관리

**언제 참조**: `/task-init` 또는 `/task-done` 동작을 이해하고 싶을 때

### [mistakes.md](mistakes.md)

실수 기록 및 학습 문서

**내용**:

- 과거 실수 기록 (날짜, 카테고리, 실수, 원인, 규칙)
- 개선 사항 기록
- 향후 추가할 규칙

**언제 참조**:

- 같은 실수를 반복하지 않기 위해
- 새로운 실수 발생 시 추가

---

## 사용 방법

### 1. CLAUDE.md 먼저 읽기

```markdown
# CLAUDE.md (98줄)

- WHY: 프로젝트 목적
- WHAT: 기술 스택 & 구조
- HOW: 작업 방법 (핵심만)
```

### 2. 필요 시 상세 문서 참조

```markdown
CLAUDE.md에서 링크로 연결:
[.claude/rules/workflows.md](.claude/rules/workflows.md)
[.claude/rules/task-management.md](.claude/rules/task-management.md)
```

### 3. Progressive Disclosure

- Claude는 필요할 때만 상세 문서 읽음
- 모든 세션에 모든 정보를 로드하지 않음
- 컨텍스트 효율성 극대화

---

## 문서 추가 가이드

### 새 규칙 파일 추가 시

1. **파일 생성**

   ```bash
   touch .claude/rules/{category}.md
   ```

2. **CLAUDE.md에 링크 추가**

   ```markdown
   ### {Category}

   - [{Description}](.claude/rules/{category}.md)
   ```

3. **구조 유지**
   - 간결한 제목 (# Title)
   - 명확한 섹션 구분 (## Section)
   - 코드 예제 포함
   - 마지막 업데이트 날짜

### 실수 기록 추가 시

`mistakes.md`에 추가:

```markdown
### YYYY-MM-DD: [카테고리] 규칙 제목

- **실수**: 무엇을 잘못했는지
- **원인**: 왜 그런 실수가 발생했는지
- **규칙**: 앞으로 지켜야 할 규칙
- **참조**: 관련 문서 또는 이슈 번호
```

---

## 베스트 프랙티스

### 문서 작성 원칙

1. **간결함**: 300줄 미만 유지
2. **명확성**: 모호한 표현 지양
3. **실용성**: 실제 사용 가능한 정보만
4. **최신성**: 정기적 업데이트

### 파일 크기 가이드

- CLAUDE.md: 60-100줄 (현재 98줄) ✅
- 각 rules 파일: 100-300줄
- 합계: 1000줄 미만 권장

### Progressive Disclosure 체크리스트

- [ ] CLAUDE.md가 300줄 미만인가?
- [ ] 자세한 내용이 `.claude/rules/`로 분리되었는가?
- [ ] CLAUDE.md에서 참조 링크가 명확한가?
- [ ] 각 파일이 독립적으로 이해 가능한가?

---

## 참조

### Claude Code 공식 문서

- [Using CLAUDE.MD files](https://claude.com/blog/using-claude-md-files)
- [Writing a good CLAUDE.md](https://www.humanlayer.dev/blog/writing-a-good-claude-md)
- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)

### 관련 파일

- [../CLAUDE.md](../CLAUDE.md) - 메인 설정 파일
- [../skills/](../skills/) - Skills 디렉토리
- [../../docs/plans/TEMPLATE.md](../../docs/plans/TEMPLATE.md) - 계획 문서 템플릿

---

**마지막 업데이트**: 2026-01-22
