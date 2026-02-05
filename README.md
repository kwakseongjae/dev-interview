# mochabun

> AI 기반 개발자 기술면접 준비 서비스

개발자가 기술면접을 효과적으로 준비할 수 있도록 AI가 맞춤형 질문을 생성하고, 실전과 유사한 환경에서 연습할 수 있는 서비스입니다.

## 주요 기능

### AI 맞춤형 질문 생성

경력, 포지션, 기술 스택에 맞는 면접 질문을 AI가 자동으로 생성합니다.

- **조건 기반 생성**: "프론트엔드 3년차, React/TypeScript 중심"과 같은 조건 입력
- **레퍼런스 기반 생성**: 이력서, 포트폴리오 PDF를 첨부하면 해당 내용 기반 질문 생성
- **면접 범주 선택**: CS 기초, 프로젝트 기반, 시스템 설계 등 원하는 범주 선택

### 실전 모의 면접

실제 면접과 유사한 환경에서 답변을 연습할 수 있습니다.

- **타이머**: 총 소요 시간 실시간 측정
- **힌트 기능**: 막힐 때 AI가 제공하는 힌트 참고
- **자동 저장**: 10초마다 자동 저장되어 작업 손실 걱정 없음
- **찜하기**: 인상 깊은 질문은 저장하여 나중에 복습

### AI 피드백

답변에 대한 AI의 상세한 피드백을 받아볼 수 있습니다.

- **빠른 평가**: 답변 품질에 대한 간단한 피드백
- **상세 분석**: 강점, 개선점, 핵심 키워드 분석
- **모범 답변**: AI가 제안하는 모범 답변 확인
- **팔로우업 질문**: 추가로 생각해볼 질문 제시

### 아카이브

모든 면접 기록이 저장되어 언제든 복습할 수 있습니다.

- **세션 기록**: 날짜, 소요 시간, 완료율 확인
- **질문별 조회**: 각 질문에 대한 내 답변과 힌트 확인
- **필터링**: 날짜, 면접 범주별로 쉽게 찾기

### 찜한 질문

관심 있는 질문을 모아서 집중 연습할 수 있습니다.

- **질문 수집**: 면접 중 인상 깊은 질문 저장
- **직접 연습**: 찜한 질문만 모아서 새 세션 시작

### 팀 스페이스

팀원들과 함께 면접을 준비할 수 있습니다.

- **팀 생성**: 스터디 그룹, 동료와 함께 준비
- **초대 코드**: 간편하게 팀원 초대
- **공유 아카이브**: 팀원의 면접 기록 조회 (읽기 전용)
- **공유 찜 목록**: 팀원이 추천하는 질문 확인

## 시작하기

### 요구 사항

- Node.js 18 이상
- npm, yarn, pnpm 중 하나

### 설치

```bash
# 저장소 클론
git clone https://github.com/your-username/mochabun.git
cd mochabun

# 의존성 설치
npm install
```

### 환경 변수 설정

`.env.local` 파일을 생성하고 필요한 환경 변수를 설정합니다.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Anthropic Claude API
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### 실행

```bash
# 개발 서버 실행
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다.

### 빌드

```bash
# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm start
```

## 기술 스택

| 분류      | 기술                              |
| --------- | --------------------------------- |
| Framework | Next.js 16 (App Router)           |
| Language  | TypeScript                        |
| UI        | React 19, Tailwind CSS, Shadcn UI |
| Database  | Supabase (PostgreSQL)             |
| AI        | Anthropic Claude API              |
| Animation | Framer Motion                     |

## 프로젝트 구조

```
src/
├── app/                # 페이지 및 API 라우트
│   ├── page.tsx        # 홈 (질문 생성 시작)
│   ├── search/         # 생성된 질문 미리보기
│   ├── interview/      # 모의 면접 페이지
│   ├── complete/       # 제출 완료
│   ├── archive/        # 면접 기록 조회
│   ├── favorites/      # 찜한 질문
│   └── team-spaces/    # 팀 스페이스
├── components/         # React 컴포넌트
│   ├── ui/             # 기본 UI 컴포넌트
│   └── feedback/       # AI 피드백 관련
├── lib/                # 유틸리티 및 API
│   └── ai/             # AI 관련 로직
├── hooks/              # React 커스텀 훅
└── types/              # TypeScript 타입
```

## 라이선스

MIT License
