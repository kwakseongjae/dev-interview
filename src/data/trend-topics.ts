import type { InterviewTypeCode } from "@/types/interview";

// 트렌드 토픽 카테고리
export type TrendCategory =
  | "AI_ML"
  | "BACKEND"
  | "DEVOPS"
  | "SECURITY"
  | "FRONTEND";

// 트렌드 토픽 우선순위
export type TrendRelevance = "critical" | "high" | "medium";

// 트렌드 토픽 ID 리터럴 유니온
export type TrendTopicId =
  | "llm-app-dev"
  | "rag-pipeline"
  | "ai-agent"
  | "prompt-engineering"
  | "event-driven"
  | "cloud-native"
  | "on-device-ai"
  | "go-rust-systems"
  | "observability"
  | "ai-dev-tools";

// 트렌드 토픽 인터페이스
export interface TrendTopic {
  id: TrendTopicId;
  name: string;
  nameKo: string;
  category: TrendCategory;
  relevance: TrendRelevance;
  description: string;
  sampleAngles: string[];
  applicableTypes: InterviewTypeCode[];
  tags: string[];
  chipQuery: string; // 칩 클릭 시 자동 설정할 검색어
  addedDate: string;
  reviewDate: string;
}

// 2026 Q1 트렌드 토픽 데이터
export const TREND_TOPICS: TrendTopic[] = [
  // === CRITICAL ===
  {
    id: "llm-app-dev",
    name: "LLM Application Development",
    nameKo: "LLM 활용 개발",
    category: "AI_ML",
    relevance: "critical",
    description:
      "LLM API 활용, 프롬프트 엔지니어링, 토큰 최적화, 할루시네이션 방지, 비용 관리",
    sampleAngles: [
      "LLM API를 프로덕션에 통합할 때 고려사항",
      "프롬프트 엔지니어링 전략과 품질 관리",
      "토큰 사용량 최적화와 비용 효율성",
      "Hallucination 탐지 및 방지 전략",
    ],
    applicableTypes: ["CS", "PROJECT", "SYSTEM_DESIGN"],
    tags: ["LLM", "GPT", "Claude", "prompt-engineering", "AI"],
    chipQuery: "LLM 활용 애플리케이션 개발 면접",
    addedDate: "2026-01-01",
    reviewDate: "2026-04-01",
  },
  {
    id: "rag-pipeline",
    name: "RAG Pipeline Design",
    nameKo: "RAG 파이프라인",
    category: "AI_ML",
    relevance: "critical",
    description:
      "벡터 검색, 임베딩, 청킹 전략, 하이브리드 검색을 결합한 AI 검색 시스템",
    sampleAngles: [
      "RAG vs Fine-tuning 트레이드오프",
      "벡터 DB 선택 기준과 인덱싱 전략",
      "청킹 전략이 검색 품질에 미치는 영향",
      "하이브리드 검색(키워드+시맨틱) 설계",
    ],
    applicableTypes: ["SYSTEM_DESIGN", "PROJECT"],
    tags: ["RAG", "vector-db", "embedding", "retrieval", "Pinecone"],
    chipQuery: "RAG 파이프라인 설계 면접",
    addedDate: "2026-01-01",
    reviewDate: "2026-04-01",
  },
  {
    id: "ai-agent",
    name: "AI Agent Architecture",
    nameKo: "AI 에이전트",
    category: "AI_ML",
    relevance: "critical",
    description:
      "자율 AI 에이전트 설계: 도구 사용, 계획 수립, 메모리 관리, 멀티에이전트 협업",
    sampleAngles: [
      "ReAct vs Plan-and-Execute 패턴 비교",
      "에이전트 도구 호출 오케스트레이션",
      "멀티에이전트 협업 아키텍처",
      "에이전트 안전성과 guardrails 설계",
    ],
    applicableTypes: ["SYSTEM_DESIGN", "PROJECT"],
    tags: ["agent", "tool-use", "orchestration", "LangChain", "LLM"],
    chipQuery: "AI 에이전트 시스템 설계 면접",
    addedDate: "2026-01-01",
    reviewDate: "2026-04-01",
  },

  // === HIGH ===
  {
    id: "prompt-engineering",
    name: "Prompt Engineering",
    nameKo: "프롬프트 엔지니어링",
    category: "AI_ML",
    relevance: "high",
    description:
      "프롬프트 설계 패턴, Few-shot/CoT, 프롬프트 보안, 구조화된 출력 제어",
    sampleAngles: [
      "Few-shot vs Zero-shot vs Chain-of-Thought 비교",
      "프롬프트 인젝션 방어 전략",
      "구조화된 출력 생성과 파싱 전략",
      "프롬프트 반복 개선 방법론",
    ],
    applicableTypes: ["CS", "PROJECT"],
    tags: ["prompt", "few-shot", "CoT", "injection", "structured-output"],
    chipQuery: "프롬프트 엔지니어링 면접 질문",
    addedDate: "2026-01-01",
    reviewDate: "2026-04-01",
  },
  {
    id: "event-driven",
    name: "Event-Driven Architecture",
    nameKo: "이벤트 드리븐",
    category: "BACKEND",
    relevance: "high",
    description: "Kafka, 이벤트 소싱, CQRS, Saga 패턴, 비동기 메시징",
    sampleAngles: [
      "Kafka 기반 이벤트 파이프라인 설계",
      "이벤트 소싱 vs CRUD 트레이드오프",
      "CQRS 패턴 적용 사례와 장단점",
      "분산 트랜잭션과 Saga 패턴",
    ],
    applicableTypes: ["SYSTEM_DESIGN"],
    tags: ["kafka", "event-sourcing", "CQRS", "saga", "async"],
    chipQuery: "이벤트 드리븐 아키텍처 면접",
    addedDate: "2026-01-01",
    reviewDate: "2026-07-01",
  },
  {
    id: "cloud-native",
    name: "Cloud-Native & Kubernetes",
    nameKo: "클라우드 네이티브",
    category: "DEVOPS",
    relevance: "high",
    description: "컨테이너 오케스트레이션, IaC, CI/CD 파이프라인, 서비스 메시",
    sampleAngles: [
      "K8s 환경에서의 서비스 배포 전략",
      "IaC 도구 비교 (Terraform, Pulumi)",
      "CI/CD 파이프라인 설계와 자동화",
      "서비스 메시(Istio/Linkerd)의 역할",
    ],
    applicableTypes: ["SYSTEM_DESIGN"],
    tags: ["kubernetes", "docker", "IaC", "CI-CD", "terraform"],
    chipQuery: "클라우드 네이티브 & 쿠버네티스 면접",
    addedDate: "2026-01-01",
    reviewDate: "2026-07-01",
  },
  {
    id: "on-device-ai",
    name: "On-Device AI & Edge Computing",
    nameKo: "온디바이스 AI",
    category: "AI_ML",
    relevance: "high",
    description:
      "모델 경량화, 양자화, 디바이스 추론 최적화, 프라이버시 보존 AI",
    sampleAngles: [
      "모델 양자화(Quantization) 기법과 트레이드오프",
      "온디바이스 vs 클라우드 추론 설계 판단 기준",
      "Edge 환경에서의 모델 배포 전략",
      "프라이버시 보존 AI 설계",
    ],
    applicableTypes: ["SYSTEM_DESIGN", "CS"],
    tags: ["edge", "quantization", "mobile-ai", "optimization", "privacy"],
    chipQuery: "온디바이스 AI & 엣지 컴퓨팅 면접",
    addedDate: "2026-01-01",
    reviewDate: "2026-07-01",
  },

  // === MEDIUM ===
  {
    id: "go-rust-systems",
    name: "Go/Rust for High-Performance Systems",
    nameKo: "Go/Rust 시스템",
    category: "BACKEND",
    relevance: "medium",
    description:
      "고성능 병렬 처리, 마이크로서비스, 메모리 안전성, 시스템 프로그래밍",
    sampleAngles: [
      "Go의 고루틴 vs Java 스레드 모델 비교",
      "Rust의 소유권 시스템과 메모리 안전성",
      "마이크로서비스 간 gRPC 통신 설계",
      "성능 크리티컬 서비스에서의 언어 선택 기준",
    ],
    applicableTypes: ["CS", "SYSTEM_DESIGN"],
    tags: ["go", "rust", "performance", "concurrency", "gRPC"],
    chipQuery: "Go와 Rust 고성능 시스템 면접",
    addedDate: "2026-01-01",
    reviewDate: "2026-07-01",
  },
  {
    id: "observability",
    name: "Observability & Distributed Tracing",
    nameKo: "옵저버빌리티",
    category: "DEVOPS",
    relevance: "medium",
    description:
      "OpenTelemetry, 분산 추적, 메트릭/로그/트레이스 통합, 장애 원인 분석",
    sampleAngles: [
      "분산 시스템에서의 장애 원인 추적 방법",
      "OpenTelemetry 기반 관측 시스템 설계",
      "로그-메트릭-트레이스 통합 전략",
    ],
    applicableTypes: ["SYSTEM_DESIGN"],
    tags: ["observability", "tracing", "monitoring", "OpenTelemetry"],
    chipQuery: "옵저버빌리티 & 분산 추적 면접",
    addedDate: "2026-01-01",
    reviewDate: "2026-07-01",
  },
  {
    id: "ai-dev-tools",
    name: "AI-Assisted Development",
    nameKo: "AI 활용 개발",
    category: "AI_ML",
    relevance: "medium",
    description:
      "AI 코딩 도구 활용, AI 생성 코드 품질 보장, 개발자와 AI 협업 전략",
    sampleAngles: [
      "AI 코딩 도구의 올바른 활용법과 한계",
      "AI 생성 코드의 품질 보장 전략",
      "개발 워크플로우에서 AI 도구 통합 방법",
    ],
    applicableTypes: ["PROJECT"],
    tags: ["AI-tools", "copilot", "code-review", "vibe-coding"],
    chipQuery: "AI 활용 개발 면접 질문",
    addedDate: "2026-01-01",
    reviewDate: "2026-07-01",
  },
];

// === 헬퍼 함수 ===

/** ID로 트렌드 토픽 조회 */
export function getTrendTopicById(id: string): TrendTopic | undefined {
  return TREND_TOPICS.find((t) => t.id === id);
}

/** 면접 유형에 적용 가능한 트렌드 토픽 필터 */
export function getTopicsForType(type: InterviewTypeCode): TrendTopic[] {
  return TREND_TOPICS.filter((t) => t.applicableTypes.includes(type));
}

/** CRITICAL 우선순위 토픽만 조회 */
export function getCriticalTopics(): TrendTopic[] {
  return TREND_TOPICS.filter((t) => t.relevance === "critical");
}

/** 홈페이지 표시용: relevance 순 정렬 (critical → high → medium) */
export function getTopicsSorted(): TrendTopic[] {
  const order: Record<TrendRelevance, number> = {
    critical: 0,
    high: 1,
    medium: 2,
  };
  return [...TREND_TOPICS].sort(
    (a, b) => order[a.relevance] - order[b.relevance],
  );
}
