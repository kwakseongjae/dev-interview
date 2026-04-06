# mochabun

> AI 기반 개발자 기술면접 준비 서비스 | [mochabun.co.kr](https://www.mochabun.co.kr)

<p align="center">
  <video
    src="https://github.com/user-attachments/assets/7cd50b9f-b0a7-45ce-a7e5-7da087bd3ecf"
    width="100%"
    controls
    autoplay
    muted
    loop>
  </video>
</p>

경력, 포지션, 기술 스택에 맞는 면접 질문을 AI가 생성하고, 타이머/힌트/음성 답변이 있는 실전 환경에서 연습한 뒤, AI 피드백으로 답변을 개선하는 서비스입니다.

## 주요 기능

### AI 맞춤형 질문 생성

- **조건 기반 생성**: "프론트엔드 3년차, React/TypeScript 중심"과 같은 조건 입력
- **레퍼런스 기반 생성**: 이력서, 포트폴리오 PDF를 첨부하면 해당 내용 기반 질문 생성
- **면접 범주 선택**: CS 기초, 프로젝트 기반, 시스템 설계 등 원하는 범주 선택
- **시맨틱 캐싱**: 유사한 조건의 질문을 벡터 검색으로 즉시 제공

### 실전 모의 면접

- **타이머**: 총 소요 시간 실시간 측정
- **힌트 기능**: 막힐 때 AI가 제공하는 힌트 참고
- **음성 면접**: 마이크로 답변을 말하면 STT로 자동 변환 (GPT-4o-mini-transcribe)
- **자동 저장**: 10초마다 자동 저장되어 작업 손실 걱정 없음
- **찜하기**: 인상 깊은 질문은 저장하여 나중에 복습

### AI 피드백

- **빠른 평가**: 답변 품질에 대한 간단한 피드백
- **상세 분석**: 강점, 개선점, 핵심 키워드 분석
- **모범 답변**: AI가 제안하는 모범 답변 확인
- **팔로우업 질문**: 추가로 생각해볼 질문 제시

### 기업 사례 스터디

국내 IT 기업의 실제 기술 블로그 아티클을 기반으로 한 면접 질문을 제공합니다.

- **기업별 사례**: 네이버, 카카오, 토스, 배달의민족 등 기술 블로그 기반
- **기술 블로그 아카이브**: 주요 기업 기술 블로그 큐레이션

### 트렌드 질문

최신 기술 트렌드를 반영한 면접 질문을 제공합니다.

### 아카이브 & 찜한 질문

- **세션 기록**: 날짜, 소요 시간, 완료율 확인
- **질문별 조회**: 각 질문에 대한 내 답변과 피드백 확인
- **찜한 질문으로 재연습**: 관심 질문만 모아서 새 세션 시작

### 팀 스페이스

- **팀 생성**: 스터디 그룹, 동료와 함께 준비
- **초대 코드**: 간편하게 팀원 초대
- **공유 아카이브**: 팀원의 면접 기록 조회 (읽기 전용)
- **공유 찜 목록**: 팀원이 추천하는 질문 확인

## 기술 스택

| 분류      | 기술                                                  |
| --------- | ----------------------------------------------------- |
| Framework | Next.js 16 (App Router)                               |
| Language  | TypeScript 5                                          |
| UI        | React 19, Tailwind CSS, Radix UI, Shadcn              |
| Database  | Supabase (PostgreSQL)                                 |
| AI        | Anthropic Claude, OpenAI GPT-4o-mini-transcribe (STT) |
| Infra     | Vercel, Upstash (Rate Limiting)                       |
| Animation | Framer Motion                                         |

## 시작하기

```bash
git clone https://github.com/kwakseongjae/dev-interview.git
cd dev-interview
npm install
cp .env.example .env.local  # 환경 변수 설정
npm run dev                  # http://localhost:3000
```

## 라이선스

MIT License
