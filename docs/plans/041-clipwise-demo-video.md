# 041 - clipwise로 데모 영상 촬영 및 README 포함

**Issue**: [#41](https://github.com/kwakseongjae/dev-interview/issues/41)
**Branch**: `chore/41-clipwise-demo-video`
**Created**: 2026-02-24

---

## 1. Overview

### 문제 정의

프로젝트 README에 실제 서비스 사용 데모 영상이 없어 방문자가 텍스트만으로 서비스를 이해해야 함. clipwise(YAML 기반 브라우저 녹화 도구)를 활용하여 재현 가능한 데모 영상을 생성하고 README에 포함.

### 목표

1. clipwise devDependency 설치
2. 데모 YAML 시나리오 작성 (시스템 설계 → 질문 생성 → 면접 답변 → 힌트)
3. 브라우저 프레임 MP4/GIF 영상 생성
4. README.md 상단에 데모 영상 포함

### 범위

- **IN**: clipwise 설치, YAML 시나리오, 영상 생성, README 업데이트
- **OUT**: 프로덕션 기능 변경 없음, 테스트 코드 불필요

---

## 2. Requirements

### 기능 요구사항

| ID   | 요구사항                                     | 우선순위 |
| ---- | -------------------------------------------- | -------- |
| FR-1 | clipwise YAML 시나리오로 전체 사용 흐름 녹화 | P1       |
| FR-2 | README에 데모 GIF/영상 포함                  | P1       |
| FR-3 | 시나리오가 재실행 가능하여 영상 재촬영 용이  | P2       |

### 기술 요구사항

| ID   | 요구사항                              |
| ---- | ------------------------------------- |
| TR-1 | clipwise devDependency 설치           |
| TR-2 | ffmpeg 로컬 설치 필요 (MP4 인코딩)    |
| TR-3 | GIF 파일 크기 10MB 이하 (GitHub 제한) |

---

## 3. Architecture & Design

### 데모 시나리오 흐름

```
홈페이지
  → "시스템 설계" 카테고리 선택
  → 면접 조건 텍스트 입력
  → 생성 버튼 클릭

검색 결과 페이지
  → AI 질문 생성 대기 (로딩 애니메이션)
  → 결과 확인
  → 질문 2개 선택 → "선택 질문 교체" 클릭
  → 교체 결과 확인
  → "시작하기" 클릭

면접 페이지
  → 질문 1 답변 작성
  → 힌트 보기
  → 다음 질문으로 이동
  → 질문 2 답변 작성
  → 힌트 보기
  → 마무리 (제출 또는 fade out)
```

### 인증 처리 전략

clipwise는 Playwright 기반이지만 YAML에서 cookie/localStorage 주입 미지원. **두 가지 접근 방식:**

**Option A (권장): 비로그인 흐름 녹화**

- 홈페이지는 로그인 없이 접근 가능
- 질문 생성 및 면접 흐름도 비로그인으로 작동 (로컬 저장)
- 가장 단순하고 재현 가능

**Option B: 임시 데모 로그인 라우트**

- `/auth/demo-login` 라우트 생성 후 녹화, 완료 후 제거
- 복잡도가 높아 권장하지 않음

### Effects 설정

```yaml
effects:
  zoom:
    enabled: true
    scale: 1.8
    duration: 500
    autoZoom:
      followCursor: true
      maxScale: 2.0
      transitionDuration: 300
  cursor:
    enabled: true
    size: 20
    speed: "fast"
    clickEffect: true
    clickColor: "rgba(59, 130, 246, 0.3)" # mochabun 블루 계열
    trail: true
    trailLength: 6
    highlight: true
    highlightRadius: 35
  background:
    type: gradient
    value: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)"
    padding: 48
    borderRadius: 14
    shadow: true
  deviceFrame:
    enabled: true
    type: browser
    darkMode: true
```

### 타이밍 전략

- **목표**: ~30-45초 데모
- `captureDelay`: 50-100ms (일반), 200ms (AI 응답 후)
- `holdDuration`: 500-800ms (일반), 1500-2500ms (AI 결과 확인)
- `type.delay`: 20-30ms/char
- AI 응답 대기: `wait: 5000-8000ms`

### 영상 배포 전략

1. clipwise로 GIF 생성 (`-f gif`)
2. GitHub Release에 업로드 (`v1.0.0` 태그)
3. README에 `<img>` 태그로 인라인 삽입

```markdown
<p align="center">
  <img src="https://github.com/kwakseongjae/dev-interview/releases/download/v1.0.0/demo.gif" width="100%" alt="mochabun Demo" />
</p>
```

---

## 4. Implementation Plan

### Phase 1: Setup

| Task | 파일            | 설명                      |
| ---- | --------------- | ------------------------- |
| T1   | `package.json`  | `npm install -D clipwise` |
| T2   | `clipwise.yaml` | YAML 시나리오 파일 생성   |

### Phase 2: 시나리오 작성 및 영상 생성

| Task | 파일            | 설명                                            |
| ---- | --------------- | ----------------------------------------------- |
| T3   | `clipwise.yaml` | 전체 데모 시나리오 작성 (홈 → 검색 → 면접)      |
| T4   | -               | `npx clipwise record clipwise.yaml -f gif` 실행 |
| T5   | -               | 영상 품질 확인 및 시나리오 조정                 |

### Phase 3: README 업데이트

| Task | 파일        | 설명                          |
| ---- | ----------- | ----------------------------- |
| T6   | -           | GIF를 GitHub Release에 업로드 |
| T7   | `README.md` | 데모 영상 섹션 추가 (상단)    |

---

## 5. Quality Gates

- [x] clipwise 설치 성공
- [ ] YAML 시나리오 검증 (`npx clipwise validate clipwise.yaml`)
- [ ] 영상 생성 성공 (GIF 또는 MP4)
- [ ] GIF 파일 크기 10MB 이하
- [ ] README에 영상 정상 표시
- [ ] `npm run build` 성공
- [ ] `npx eslint src/` 통과
- [ ] `npx tsc --noEmit` 통과

---

## 6. Risks & Dependencies

| 리스크             | 영향                            | 완화 방안                                      |
| ------------------ | ------------------------------- | ---------------------------------------------- |
| AI 응답 시간 변동  | 영상에서 빈 화면 또는 잘린 결과 | `wait` duration을 넉넉하게 설정 (8초+)         |
| 로그인 필요 기능   | 일부 기능 녹화 불가             | 비로그인 흐름 활용 (질문 생성은 비로그인 가능) |
| GIF 파일 크기 초과 | GitHub에서 로드 느림            | quality 조정, 영상 길이 최적화                 |
| ffmpeg 미설치      | MP4 인코딩 실패                 | `brew install ffmpeg` 사전 확인                |
| 셀렉터 변경        | 클릭/타이핑 실패                | CSS 셀렉터 대신 텍스트 기반 선택 활용          |

---

## 7. Key Selectors Reference

에이전트 탐색 결과 기반 주요 UI 셀렉터:

### 홈페이지

- 인터뷰 타입 선택: 그리드 카드 (3열), 클릭으로 선택
- 텍스트 입력: `textarea` (flex-1, bg-transparent)
- 제출 버튼: `bg-navy` 배경의 ArrowRight 아이콘 버튼

### 검색 페이지

- 질문 목록: Card 내 `divide-y` 레이아웃, 각 질문 `p-5` 행
- 체크박스: `Square`/`CheckSquare` 아이콘
- "선택 질문 교체": `RefreshCw` 아이콘 버튼
- "시작하기": `bg-gold` 배경 버튼 (Card `bg-navy` 내부)

### 면접 페이지

- 답변 영역: `Textarea` (min-h-[250px])
- 힌트 버튼: Lightbulb 아이콘 + "힌트 보기" 텍스트
- 다음 질문: `bg-navy` + ChevronRight 버튼
- 제출: `bg-gold` + Send 아이콘 버튼

---

## 8. References

- [clipwise npm](https://www.npmjs.com/package/clipwise)
- [clipwise docs](https://kwakseongjae.github.io/clipwise)
- [GitHub Issue #41](https://github.com/kwakseongjae/dev-interview/issues/41)
