/**
 * Dummy session data for demo/archive display
 * Separated for easy replacement with real data from Supabase
 */

import type { InterviewSession, FavoriteQuestion } from "@/types/interview";

// 아카이브용 샘플 세션 데이터
export const SAMPLE_SESSIONS: InterviewSession[] = [
  {
    id: "session-demo-1",
    createdAt: "2024-01-15T10:30:00Z",
    query: "프론트엔드 3년차 개발자 기술면접",
    totalTime: 755, // 12분 35초
    isCompleted: true,
    questions: [
      {
        id: "q1-demo",
        content:
          "React의 Virtual DOM 동작 원리와 실제 DOM과의 차이점을 설명해주세요.",
        hint: "Reconciliation, Diffing Algorithm, Batch Update 키워드를 활용해보세요.",
        category: "React",
        answer:
          "Virtual DOM은 실제 DOM의 가상 복사본으로, React에서 UI 업데이트를 효율적으로 처리하기 위해 사용됩니다. 변경사항이 발생하면 새로운 Virtual DOM을 생성하고, 이전 Virtual DOM과 비교(Diffing)하여 실제로 변경된 부분만 실제 DOM에 반영합니다.",
        timeSpent: 165,
        isAnswered: true,
        isFavorite: true,
      },
      {
        id: "q2-demo",
        content:
          "상태관리 라이브러리(Redux, Recoil, Zustand 등)를 비교하고 선택 기준을 말씀해주세요.",
        hint: "Flux 패턴, Atomic 상태, 보일러플레이트, 러닝커브를 비교해보세요.",
        category: "State Management",
        answer:
          "Redux는 Flux 패턴을 기반으로 한 예측 가능한 상태 관리를 제공하지만 보일러플레이트가 많습니다. Recoil은 Atomic 단위의 상태 관리로 React에 최적화되어 있고, Zustand는 간단한 API로 빠른 개발이 가능합니다.",
        timeSpent: 152,
        isAnswered: true,
        isFavorite: false,
      },
      {
        id: "q3-demo",
        content: "웹 성능 최적화를 위해 적용해본 기법들을 설명해주세요.",
        hint: "Code Splitting, Lazy Loading, 이미지 최적화, 번들 사이즈 분석을 언급해보세요.",
        category: "Performance",
        answer:
          "Code Splitting을 통해 초기 로딩 시간을 줄이고, React.lazy와 Suspense로 컴포넌트 레벨의 Lazy Loading을 구현했습니다. 이미지는 WebP 포맷과 lazy loading 속성을 활용했고, webpack-bundle-analyzer로 번들 사이즈를 분석하여 불필요한 의존성을 제거했습니다.",
        timeSpent: 170,
        isAnswered: true,
        isFavorite: true,
      },
      {
        id: "q4-demo",
        content:
          "TypeScript의 주요 타입 시스템과 실무 활용 경험을 말씀해주세요.",
        hint: "Generic, Union/Intersection, Type Guard, Utility Types를 설명해보세요.",
        category: "TypeScript",
        answer:
          "Generic을 활용해 재사용 가능한 컴포넌트를 만들고, Union 타입으로 다양한 상태를 표현했습니다. Type Guard로 런타임에서 타입을 좁히고, Utility Types(Partial, Pick, Omit 등)로 기존 타입을 변형하여 사용했습니다.",
        timeSpent: 148,
        isAnswered: true,
        isFavorite: false,
      },
      {
        id: "q5-demo",
        content: "프론트엔드 테스트 전략과 경험에 대해 설명해주세요.",
        hint: "Unit Test, Integration Test, E2E Test, Testing Library 활용법을 말씀해보세요.",
        category: "Testing",
        answer:
          "Jest와 React Testing Library로 컴포넌트 단위 테스트를 작성하고, Cypress로 E2E 테스트를 구현했습니다. 테스트 피라미드를 고려하여 단위 테스트 비중을 높게 유지하고, 중요한 사용자 플로우는 E2E로 검증했습니다.",
        timeSpent: 120,
        isAnswered: true,
        isFavorite: false,
      },
    ],
  },
  {
    id: "session-demo-2",
    createdAt: "2024-01-10T14:20:00Z",
    query: "백엔드 2년차 개발자 기술면접",
    totalTime: 622, // 10분 22초
    isCompleted: true,
    questions: [
      {
        id: "q1-demo-2",
        content:
          "RESTful API 설계 원칙과 실제 프로젝트 적용 경험을 말씀해주세요.",
        hint: "HTTP 메서드, 상태 코드, 리소스 네이밍, HATEOAS를 포함해보세요.",
        category: "API Design",
        answer:
          "RESTful API는 리소스 중심의 설계 원칙을 따릅니다. HTTP 메서드를 적절히 활용하고, 명확한 상태 코드를 반환하며, URI는 명사형 리소스로 표현했습니다.",
        timeSpent: 130,
        isAnswered: true,
        isFavorite: true,
      },
      {
        id: "q2-demo-2",
        content: "데이터베이스 인덱싱 전략과 쿼리 최적화 경험을 설명해주세요.",
        hint: "B-Tree, 복합 인덱스, 실행 계획 분석, N+1 문제를 언급해보세요.",
        category: "Database",
        answer:
          "자주 조회되는 컬럼에 인덱스를 생성하고, 복합 인덱스의 컬럼 순서를 고려했습니다. EXPLAIN으로 실행 계획을 분석하고 N+1 문제는 JOIN이나 Eager Loading으로 해결했습니다.",
        timeSpent: 145,
        isAnswered: true,
        isFavorite: false,
      },
      {
        id: "q3-demo-2",
        content: "마이크로서비스 아키텍처의 장단점과 적용 경험을 말씀해주세요.",
        hint: "서비스 분리 기준, 통신 방식, 데이터 일관성, 모니터링을 설명해보세요.",
        category: "Architecture",
        answer:
          "마이크로서비스는 독립적인 배포와 확장이 가능하지만, 서비스 간 통신 복잡성과 데이터 일관성 관리가 어렵습니다. 도메인 기반으로 서비스를 분리하고 이벤트 기반 통신을 활용했습니다.",
        timeSpent: 160,
        isAnswered: true,
        isFavorite: false,
      },
      {
        id: "q4-demo-2",
        content: "인증/인가 구현 방식과 보안 고려사항을 설명해주세요.",
        hint: "JWT, OAuth2.0, Session, RBAC, CORS 정책을 포함해보세요.",
        category: "Security",
        answer:
          "JWT 기반 인증을 구현하고 Access/Refresh 토큰을 분리했습니다. RBAC으로 권한을 관리하고, CORS 설정으로 허용된 도메인만 접근 가능하도록 했습니다.",
        timeSpent: 112,
        isAnswered: true,
        isFavorite: true,
      },
      {
        id: "q5-demo-2",
        content: "캐싱 전략과 실제 적용 사례를 설명해주세요.",
        hint: "Redis, CDN, 브라우저 캐시, 캐시 무효화 전략을 언급해보세요.",
        category: "Caching",
        answer: "",
        timeSpent: 75,
        isAnswered: false,
        isFavorite: false,
      },
    ],
  },
];

// 찜한 질문 샘플 데이터
export const SAMPLE_FAVORITES: FavoriteQuestion[] = [
  {
    id: "fav-1",
    questionId: "q1-demo",
    content:
      "React의 Virtual DOM 동작 원리와 실제 DOM과의 차이점을 설명해주세요.",
    hint: "Reconciliation, Diffing Algorithm, Batch Update 키워드를 활용해보세요.",
    category: "React",
    savedAt: "2024-01-15T11:00:00Z",
  },
  {
    id: "fav-2",
    questionId: "q3-demo",
    content: "웹 성능 최적화를 위해 적용해본 기법들을 설명해주세요.",
    hint: "Code Splitting, Lazy Loading, 이미지 최적화, 번들 사이즈 분석을 언급해보세요.",
    category: "Performance",
    savedAt: "2024-01-15T11:30:00Z",
  },
  {
    id: "fav-3",
    questionId: "q1-demo-2",
    content: "RESTful API 설계 원칙과 실제 프로젝트 적용 경험을 말씀해주세요.",
    hint: "HTTP 메서드, 상태 코드, 리소스 네이밍, HATEOAS를 포함해보세요.",
    category: "API Design",
    savedAt: "2024-01-10T15:00:00Z",
  },
  {
    id: "fav-4",
    questionId: "q4-demo-2",
    content: "인증/인가 구현 방식과 보안 고려사항을 설명해주세요.",
    hint: "JWT, OAuth2.0, Session, RBAC, CORS 정책을 포함해보세요.",
    category: "Security",
    savedAt: "2024-01-10T15:30:00Z",
  },
];
