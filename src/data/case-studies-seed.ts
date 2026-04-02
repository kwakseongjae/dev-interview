/**
 * Case Study Seed Data
 *
 * High-quality case studies based on REAL tech blog articles from major companies.
 * Every sourceUrl is a verified, real URL from a company engineering blog.
 *
 * Last updated: 2026-04-02
 */

export interface CaseStudySeed {
  title: string;
  slug: string;
  companyName: string;
  companySlug: string;
  sourceUrl: string;
  sourceType: "blog" | "conference" | "paper";
  sourceLanguage: "ko" | "en";
  publishedAt: string;
  summary: {
    background: string;
    challenge: string;
    solution: string;
    results: string;
    keyTakeaways: string[];
  };
  domains: string[];
  technologies: string[];
  difficulty: "A" | "B" | "C";
  seedQuestions: {
    content: string;
    hint: string;
    category: string;
  }[];
}

// ---------------------------------------------------------------------------
// Seed Data
// ---------------------------------------------------------------------------

export const CASE_STUDIES_SEED: CaseStudySeed[] = [
  // =========================================================================
  // 1. Discord — Cassandra → ScyllaDB 마이그레이션
  // =========================================================================
  {
    title:
      "Discord가 수조 개의 메시지를 저장하는 방법: Cassandra에서 ScyllaDB로의 마이그레이션",
    slug: "discord-trillions-messages-scylladb-migration",
    companyName: "Discord",
    companySlug: "discord",
    sourceUrl:
      "https://discord.com/blog/how-discord-stores-trillions-of-messages",
    sourceType: "blog",
    sourceLanguage: "en",
    publishedAt: "2023-03-06",
    summary: {
      background:
        "Discord는 2017년부터 Apache Cassandra를 사용해 메시지를 저장했으나, 2022년까지 177개 노드에서 수조 개의 메시지를 관리하게 되면서 운영 부담이 급격히 증가했다. GC(Garbage Collection) 일시정지로 인한 레이턴시 급증, 컴팩션 백로그, 핫 파티션 문제가 지속적으로 발생했다.",
      challenge:
        "Cassandra의 JVM 기반 GC가 예측 불가능한 레이턴시 스파이크를 유발했고, 특정 채널에 트래픽이 집중되는 핫 파티션 문제로 읽기 작업이 병목되었다. 또한 수조 개의 메시지를 무중단으로 마이그레이션해야 하는 과제가 있었다.",
      solution:
        "GC가 없는 C++ 기반의 ScyllaDB로 마이그레이션을 결정했다. Rust로 작성된 중간 데이터 서비스 레이어를 구축하여 gRPC API를 통해 요청 병합(request coalescing)을 구현했다. 동일 채널에 대한 동시 요청을 하나의 DB 쿼리로 처리하여 부하를 크게 줄였다. Spark 기반 마이그레이터의 예상 소요시간이 3개월이었으나, Rust로 재작성하여 초당 320만 메시지를 처리해 9일 만에 마이그레이션을 완료했다.",
      results:
        "클러스터 크기가 177개 노드에서 72개 노드로 59% 감소했다. p99 읽기 레이턴시가 40~125ms에서 15ms로, p99 쓰기 레이턴시가 5~70ms에서 5ms로 개선되었다. 월드컵 결승전 같은 글로벌 트래픽 급증에도 온콜 개입 없이 안정적으로 처리할 수 있게 되었다.",
      keyTakeaways: [
        "GC가 없는 데이터베이스는 레이턴시 예측 가능성을 크게 향상시킨다",
        "요청 병합(request coalescing) 패턴으로 핫스팟 문제를 효과적으로 완화할 수 있다",
        "대규모 마이그레이션에서 Rust의 성능이 기존 도구 대비 극적인 개선을 가져올 수 있다",
      ],
    },
    domains: ["backend", "infrastructure", "data"],
    technologies: [
      "ScyllaDB",
      "Cassandra",
      "Rust",
      "gRPC",
      "Consistent Hashing",
    ],
    difficulty: "C",
    seedQuestions: [
      {
        content:
          "수조 개의 메시지를 저장하는 채팅 시스템을 설계한다면, 데이터베이스 선택 시 어떤 요소들을 고려하겠습니까? Cassandra와 ScyllaDB의 차이를 포함해서 설명해주세요.",
        hint: "파티셔닝 전략, GC 영향, 쓰기/읽기 패턴, 핫스팟 처리, 운영 복잡도 등을 고려",
        category: "SYSTEM_DESIGN",
      },
      {
        content:
          "Request Coalescing 패턴이란 무엇이며, 어떤 상황에서 효과적입니까? Discord의 사례를 기반으로 설명해주세요.",
        hint: "동일 리소스에 대한 동시 요청 병합, consistent hashing과의 조합, DB 부하 감소 효과",
        category: "BACKEND",
      },
      {
        content:
          "수조 건의 데이터를 무중단으로 마이그레이션하기 위한 전략을 설계해주세요. 데이터 정합성 검증은 어떻게 하겠습니까?",
        hint: "듀얼 라이트, 점진적 마이그레이션, 체크섬 비교, 롤백 전략",
        category: "DATABASE",
      },
    ],
  },

  // =========================================================================
  // 2. 카카오페이 — MSA 환경에서 네트워크 예외 처리
  // =========================================================================
  {
    title: "카카오페이의 MSA 환경에서 네트워크 예외를 안전하게 다루는 방법",
    slug: "kakaopay-msa-network-exception-handling",
    companyName: "Kakao Pay",
    companySlug: "kakaopay",
    sourceUrl: "https://tech.kakaopay.com/post/msa-transaction/",
    sourceType: "blog",
    sourceLanguage: "ko",
    publishedAt: "2024-03-15",
    summary: {
      background:
        "카카오페이의 결제 시스템은 수십 개의 마이크로서비스가 상호 연결된 MSA 구조로, 온라인·오프라인·해외 결제와 잔액 서비스가 각각 독립된 데이터베이스를 관리하고 있다. 결제 도메인에서 네트워크 장애는 고객에게 직접적인 금전적 피해를 야기할 수 있다.",
      challenge:
        "타임아웃 발생 시 트랜잭션 성공 여부를 알 수 없는 'Unknown 상태' 문제, 요청 순서가 뒤바뀌는 네트워크 순서 문제, 보상 트랜잭션 실패 시 무한 보상 루프가 발생할 수 있는 문제 등 세 가지 핵심 시나리오에 대한 해결이 필요했다.",
      solution:
        "클라이언트 측에서는 Unknown 에러에 대한 점진적 복구(즉시 재시도 → 지연 재시도 → 상태 조회) 전략을 구현했다. 서버 측에서는 Stripe, Adyen 등의 업계 표준을 참고하여 멱등성(Idempotency) API를 도입했다. Kotlin의 sealed class를 활용해 Success/Failure/Unknown 세 상태를 타입 안전하게 표현하고, map/flatMap/recoverUnknown 같은 함수형 프로그래밍 패턴으로 깔끔한 에러 처리 체인을 구현했다.",
      results:
        "네트워크 장애 시에도 결제 정합성을 보장할 수 있게 되었고, 깊은 try-catch 중첩 없이 깔끔하고 유지보수 가능한 코드를 달성했다. 자동 복구가 불가능한 경우 고객에게 재시도를 안내하는 안전한 폴백 전략을 확립했다.",
      keyTakeaways: [
        "결제 시스템에서 Unknown 상태는 반드시 별도의 타입으로 명시적 처리해야 한다",
        "멱등성 키(Idempotency Key)는 분산 환경의 결제 안전성을 위한 필수 요소이다",
        "함수형 프로그래밍 패턴(sealed class, flatMap)으로 에러 핸들링 복잡도를 줄일 수 있다",
      ],
    },
    domains: ["backend", "infrastructure"],
    technologies: ["Kotlin", "Kafka", "Saga Pattern", "Idempotency Key"],
    difficulty: "B",
    seedQuestions: [
      {
        content:
          "MSA 환경의 결제 시스템에서 네트워크 타임아웃이 발생했을 때, 트랜잭션의 성공/실패를 어떻게 판단하고 처리하겠습니까?",
        hint: "Unknown 상태 정의, 멱등성 키, 점진적 재시도, 보상 트랜잭션",
        category: "BACKEND",
      },
      {
        content:
          "분산 트랜잭션에서 Saga 패턴과 2PC(Two-Phase Commit)의 차이점을 설명하고, 각각 어떤 상황에서 적합한지 설명해주세요.",
        hint: "가용성 vs 일관성 트레이드오프, 보상 트랜잭션, 분산 락",
        category: "SYSTEM_DESIGN",
      },
    ],
  },

  // =========================================================================
  // 3. Netflix — 비디오 프로세싱 파이프라인 재구축 (Cosmos)
  // =========================================================================
  {
    title:
      "Netflix의 비디오 처리 파이프라인을 마이크로서비스로 재구축한 여정 (Cosmos 플랫폼)",
    slug: "netflix-video-processing-cosmos-microservices",
    companyName: "Netflix",
    companySlug: "netflix",
    sourceUrl:
      "https://netflixtechblog.com/rebuilding-netflix-video-processing-pipeline-with-microservices-4e5e6310e359",
    sourceType: "blog",
    sourceLanguage: "en",
    publishedAt: "2024-01-10",
    summary: {
      background:
        "Netflix의 Encoding Technologies 팀은 2014년부터 3세대 플랫폼 'Reloaded'에서 비디오 처리 파이프라인을 운영했다. 이 플랫폼은 안정성과 확장성을 제공했지만, 새로운 인코딩 혁신을 빠르게 적용하기에는 유연성이 부족했다.",
      challenge:
        "모놀리식 구조에서는 서비스 간 강한 결합으로 인해 새로운 기능 배포가 느렸고, 비디오 인코딩, 품질 분석, 검수 등의 작업이 하나의 파이프라인에 묶여 있어 독립적인 확장이 불가능했다. 또한 라이브 스트리밍과 온디맨드 서비스의 요구사항이 달라 별도의 처리가 필요했다.",
      solution:
        "차세대 마이크로서비스 플랫폼 'Cosmos'를 구축했다. Cosmos는 세 개의 레이어로 구성된다: Optimus(API 레이어 — 외부 요청을 내부 비즈니스 모델로 매핑), Plato(워크플로 레이어 — 비즈니스 규칙 모델링), Stratum(서버리스 레이어 — 상태 비보존 연산 처리). 비디오 인코딩 서비스(VES)와 비디오 품질 서비스(VQS)를 독립된 마이크로서비스로 분리하고, Timestone이라는 자체 개발 우선순위 기반 메시징 시스템으로 비동기 통신을 구현했다.",
      results:
        "2023년 9월에 전체 마이그레이션을 완료했다. 서비스 간 강한 디커플링으로 기능 배포 속도가 크게 향상되었고, 2024년 타이슨-폴 복싱 경기 등 라이브 스트리밍 이벤트에서 온디맨드 서비스에 영향 없이 안정적으로 처리할 수 있었다.",
      keyTakeaways: [
        "마이크로서비스 전환 시 API/워크플로/컴퓨팅 레이어를 명확히 분리하면 유연성이 극대화된다",
        "비동기 우선순위 기반 메시징으로 서비스 간 결합도를 최소화할 수 있다",
        "미디어 처리 파이프라인에서 서버리스 패턴은 연산 집약적 작업에 효과적이다",
      ],
    },
    domains: ["backend", "infrastructure", "platform"],
    technologies: [
      "Java",
      "Microservices",
      "Serverless",
      "Apache Kafka",
      "gRPC",
    ],
    difficulty: "C",
    seedQuestions: [
      {
        content:
          "대규모 미디어 처리 파이프라인을 설계한다면 어떤 아키텍처를 선택하겠습니까? 모놀리식과 마이크로서비스의 트레이드오프를 설명해주세요.",
        hint: "서비스 분리 기준, 비동기 통신, 워크플로 오케스트레이션, 서버리스 컴퓨팅",
        category: "SYSTEM_DESIGN",
      },
      {
        content:
          "워크플로 오케스트레이션과 코레오그래피 패턴의 차이를 설명하고, Netflix Cosmos처럼 미디어 처리에서 어떤 것이 더 적합한지 논의해주세요.",
        hint: "중앙 집중 vs 분산 제어, 장애 복구, 모니터링 용이성",
        category: "BACKEND",
      },
      {
        content:
          "비디오 인코딩 시스템에서 우선순위 기반 메시지 큐를 설계한다면 어떻게 하겠습니까?",
        hint: "우선순위 레벨, 기아(starvation) 방지, 처리 순서 보장, 재시도 전략",
        category: "SYSTEM_DESIGN",
      },
    ],
  },

  // =========================================================================
  // 4. Stripe — 멱등성 키를 활용한 안정적 API 설계
  // =========================================================================
  {
    title: "Stripe의 멱등성 키를 활용한 견고하고 예측 가능한 결제 API 설계",
    slug: "stripe-idempotency-api-design",
    companyName: "Stripe",
    companySlug: "stripe",
    sourceUrl: "https://stripe.com/blog/idempotency",
    sourceType: "blog",
    sourceLanguage: "en",
    publishedAt: "2017-06-13",
    summary: {
      background:
        "네트워크는 본질적으로 불안정하다. 분산 시스템에서 클라이언트와 서버 간 통신은 연결 실패, 처리 중 장애, 응답 전송 실패 등 세 가지 장애 모드가 발생할 수 있다. 특히 결제 API에서는 한 번의 장애가 이중 청구로 이어질 수 있다.",
      challenge:
        "결제 요청이 실패했을 때 클라이언트가 재시도하면 동일 결제가 두 번 처리될 위험이 있다. 또한 여러 클라이언트가 동시에 재시도하면 서버에 과부하를 줄 수 있는 'Thundering Herd' 문제가 발생할 수 있다.",
      solution:
        "Stripe는 모든 변경 엔드포인트(POST 요청)에 Idempotency-Key 헤더를 도입했다. 클라이언트는 고유 식별자를 생성하여 요청과 함께 전송하고, 서버는 이 키와 요청 상태를 연관시킨다. 동일한 키로 재요청이 오면 캐시된 결과를 반환한다. 클라이언트 측에서는 지수 백오프(2^n)와 랜덤 지터를 조합한 재시도 전략을 구현하여 서버 과부하를 방지했다.",
      results:
        "클라이언트가 안전하게 요청을 재시도할 수 있게 되어 결제 실패율이 크게 감소했다. Stripe의 멱등성 패턴은 업계 표준이 되었으며, 카카오페이, Airbnb 등 많은 결제 시스템에서 참조하고 있다.",
      keyTakeaways: [
        "멱등성은 분산 시스템에서 안전한 재시도를 가능하게 하는 핵심 설계 원칙이다",
        "지수 백오프 + 랜덤 지터 조합은 Thundering Herd 문제의 표준 해결책이다",
        "결제 API는 '최소 1회 실행'을 '정확히 1회 실행'으로 변환하는 설계가 필수적이다",
      ],
    },
    domains: ["backend", "infrastructure", "security"],
    technologies: ["Ruby", "REST API", "HTTP", "Idempotency Key"],
    difficulty: "B",
    seedQuestions: [
      {
        content:
          "멱등성(Idempotency)이란 무엇이며, 결제 시스템에서 왜 중요합니까? 구현 방법을 구체적으로 설명해주세요.",
        hint: "멱등성 키 생성, 서버 측 상태 저장, 동시성 제어, TTL 관리",
        category: "BACKEND",
      },
      {
        content:
          "분산 환경에서 재시도 전략을 설계할 때 고려해야 할 요소들은 무엇입니까? 지수 백오프와 지터의 역할을 설명해주세요.",
        hint: "지수 백오프 공식, Thundering Herd 문제, 최대 재시도 횟수, 서킷 브레이커",
        category: "NETWORK",
      },
    ],
  },

  // =========================================================================
  // 5. Stripe — API 버저닝 전략
  // =========================================================================
  {
    title:
      "Stripe의 날짜 기반 API 버저닝으로 하위 호환성과 혁신을 동시에 달성한 방법",
    slug: "stripe-api-versioning-strategy",
    companyName: "Stripe",
    companySlug: "stripe",
    sourceUrl: "https://stripe.com/blog/api-versioning",
    sourceType: "blog",
    sourceLanguage: "en",
    publishedAt: "2017-08-15",
    summary: {
      background:
        "Stripe는 '인터넷의 경제 인프라'를 목표로 하는 결제 플랫폼으로, 수천 개의 비즈니스가 핵심 결제 운영을 Stripe API에 의존하고 있다. 전력 회사가 전압을 2년마다 바꾸지 않는 것처럼, API도 안정성이 기본 기대치여야 한다.",
      challenge:
        "API를 발전시키면서도 기존 통합을 깨뜨리지 않아야 하는 근본적인 딜레마가 있었다. 전통적인 /v1, /v2 방식은 대규모 파괴적 변경을 유발하고, 사용자에게 과도한 업그레이드 부담을 준다.",
      solution:
        "날짜 기반 롤링 버전(예: 2017-05-25)을 도입했다. 각 버전은 작고 관리 가능한 변경만 포함한다. Version Change Module이라는 DSL로 호환되지 않는 변경을 캡슐화하고, 응답 시 역방향으로 변환 체인을 적용한다. 사용자는 자동으로 최신 버전에 고정되며, Stripe-Version 헤더로 요청별 오버라이드가 가능하다.",
      results:
        "6년간 약 100개의 하위 호환 불가 업그레이드를 배포하면서도 모든 기존 통합과의 호환성을 유지했다. 변경 로그가 자동 생성되고, 개발자별 맞춤형 API 문서가 제공된다. 버전 관리 로직이 핵심 코드에서 분리되어 기술 부채가 최소화되었다.",
      keyTakeaways: [
        "날짜 기반 버저닝은 점진적 업그레이드와 세밀한 변경 관리를 가능하게 한다",
        "버전 변환 로직을 캡슐화하면 핵심 코드의 복잡도 증가를 방지할 수 있다",
        "API는 인프라처럼 안정성과 예측 가능성이 최우선이어야 한다",
      ],
    },
    domains: ["backend", "platform"],
    technologies: ["Ruby", "REST API", "DSL"],
    difficulty: "B",
    seedQuestions: [
      {
        content:
          "API 버저닝 전략에는 어떤 방식들이 있으며, 각각의 장단점은 무엇입니까? Stripe의 날짜 기반 방식은 어떤 점에서 유리합니까?",
        hint: "URL 경로 버저닝, 헤더 버저닝, 쿼리 파라미터, 날짜 기반 롤링 버전, 호환성 매트릭스",
        category: "BACKEND",
      },
      {
        content:
          "수천 개의 클라이언트가 사용하는 공개 API에서 하위 호환 불가 변경을 안전하게 배포하려면 어떻게 하겠습니까?",
        hint: "점진적 마이그레이션, deprecation 정책, feature flag, 변환 레이어",
        category: "SYSTEM_DESIGN",
      },
    ],
  },

  // =========================================================================
  // 6. 토스 — 결제 SDK 카나리 배포 시스템
  // =========================================================================
  {
    title:
      "토스 페이먼츠 결제 SDK에 카나리 배포를 적용하여 프론트엔드 배포 안정성을 높인 방법",
    slug: "toss-payments-canary-deployment-frontend",
    companyName: "Toss",
    companySlug: "toss",
    sourceUrl: "https://toss.tech/article/26057",
    sourceType: "blog",
    sourceLanguage: "ko",
    publishedAt: "2025-02-01",
    summary: {
      background:
        "토스 페이먼츠의 JavaScript SDK는 수많은 가맹점 파트너의 결제 처리를 담당하는 핵심 인프라이다. 기존 배포 방식은 모든 사용자에게 동시에 변경을 적용하는 방식으로, 작은 변경이 대규모 장애를 유발할 수 있었다.",
      challenge:
        "CDN 캐싱(99% 이상 히트율)과 점진적 롤아웃(사용자 그룹별 제어)이라는 상충하는 요구사항을 동시에 만족시켜야 했다. 캐싱을 활성화하면 카나리 배포가 무효화되고, 비활성화하면 성능과 비용에 문제가 생겼다.",
      solution:
        "AWS CloudFront와 Lambda@Edge를 활용한 User-Based Canary 시스템을 구축했다. TLS 핸드셰이크의 JA3 핑거프린트를 활용하여 사용자를 0~9 코호트로 분류하고, 코호트별로 캐싱을 유지하면서 카나리 가중치에 따라 버전을 분기한다. Viewer Request 단계에서 코호트를 결정하고, Origin Request 단계에서 버전을 선택하는 2단계 처리 구조를 설계했다.",
      results:
        "캐시 히트율 99% 이상을 유지하면서 점진적 배포가 가능해졌다. Lambda@Edge 실행 시간이 1ms 미만이며, 1,000만 요청당 추가 비용이 $0.60에 불과했다. 실시간 가중치 조절과 즉각적인 롤백이 가능해져 배포 불안감이 크게 줄었다.",
      keyTakeaways: [
        "CDN 캐싱과 카나리 배포는 코호트 기반 캐시 키 설계로 양립 가능하다",
        "JA3 핑거프린트는 쿠키 없이도 일관된 사용자 식별을 제공한다",
        "Edge 함수를 활용하면 배포 없이 실시간으로 트래픽 분배를 조절할 수 있다",
      ],
    },
    domains: ["frontend", "devops", "infrastructure"],
    technologies: [
      "AWS CloudFront",
      "Lambda@Edge",
      "S3",
      "JavaScript SDK",
      "JA3 Fingerprint",
    ],
    difficulty: "B",
    seedQuestions: [
      {
        content:
          "CDN을 사용하는 환경에서 카나리 배포를 구현하려면 어떻게 해야 합니까? 캐싱과 점진적 롤아웃의 충돌을 어떻게 해결하겠습니까?",
        hint: "코호트 기반 캐시 키, Edge 함수, 사용자 식별 전략, 가중치 기반 라우팅",
        category: "DEVOPS",
      },
      {
        content:
          "프론트엔드 SDK를 수천 개의 클라이언트에 안전하게 배포하기 위한 전략을 설계해주세요.",
        hint: "버전 관리, 카나리/블루-그린 배포, 롤백 메커니즘, 모니터링 지표",
        category: "FRONTEND",
      },
    ],
  },

  // =========================================================================
  // 7. 우아한형제들 — 회원시스템 이벤트 기반 아키텍처
  // =========================================================================
  {
    title: "배달의민족 회원시스템의 이벤트 기반 아키텍처 구축기",
    slug: "woowahan-member-event-driven-architecture",
    companyName: "Woowa Brothers",
    companySlug: "woowahan",
    sourceUrl: "https://techblog.woowahan.com/7835/",
    sourceType: "blog",
    sourceLanguage: "ko",
    publishedAt: "2022-04-11",
    summary: {
      background:
        "배달의민족이 마이크로서비스로 전환하면서 회원시스템도 독립적인 서비스로 분리되었다. 회원 정보는 주문, 리뷰, 배달 등 다양한 서비스에서 참조하는 핵심 도메인으로, 변경 사항을 효율적으로 전파해야 하는 필요가 있었다.",
      challenge:
        "동기 방식의 API 호출로는 서비스 간 결합도가 높아지고, 하나의 장애가 연쇄적으로 전파되는 문제가 있었다. 또한 회원 정보 변경 시 어떤 서비스에 어떤 이벤트를 전달해야 하는지 체계적인 설계가 필요했다. RDB를 이벤트 저장소로 사용하면서 성능과 안정성을 보장해야 했다.",
      solution:
        "이벤트 스토밍을 통해 도메인 이벤트를 식별하고, 3가지 이벤트 종류(도메인 이벤트, 통합 이벤트, 알림 이벤트)와 3가지 구독자 계층(동일 서비스, 내부 서비스, 외부 서비스)을 정의했다. RDB 기반 이벤트 저장소를 구현하여 트랜잭션과 이벤트 발행의 원자성을 보장하고, 폴링 방식으로 이벤트를 소비하는 구조를 채택했다.",
      results:
        "서비스 간 결합도가 크게 줄어들어 각 서비스가 독립적으로 배포·확장 가능해졌다. 이벤트 기반 통신으로 장애 전파가 차단되었고, 이벤트 저장소의 영속성으로 메시지 유실 걱정 없이 안정적인 데이터 동기화가 가능해졌다.",
      keyTakeaways: [
        "이벤트 스토밍은 DDD와 별개로도 문제 영역 식별에 훌륭한 도구이다",
        "이벤트를 종류와 구독자 계층으로 분류하면 체계적인 설계가 가능하다",
        "RDB 기반 이벤트 저장소는 트랜잭셔널 아웃박스 패턴으로 원자성을 보장할 수 있다",
      ],
    },
    domains: ["backend", "infrastructure"],
    technologies: ["Java", "Spring", "Kafka", "MySQL", "Event Sourcing"],
    difficulty: "B",
    seedQuestions: [
      {
        content:
          "이벤트 기반 아키텍처에서 이벤트의 종류를 어떻게 분류할 수 있으며, 각각의 전달 보장 수준은 어떻게 설계하겠습니까?",
        hint: "도메인 이벤트 vs 통합 이벤트, At-least-once vs Exactly-once, Transactional Outbox 패턴",
        category: "SYSTEM_DESIGN",
      },
      {
        content:
          "Transactional Outbox 패턴이란 무엇이며, 왜 필요합니까? RDB를 이벤트 저장소로 사용할 때의 장단점을 설명해주세요.",
        hint: "이중 쓰기 문제, 폴링 vs CDC, 이벤트 순서 보장, 확장성 한계",
        category: "BACKEND",
      },
    ],
  },

  // =========================================================================
  // 8. Airbnb — 결제 오케스트레이션 재구축
  // =========================================================================
  {
    title: "Airbnb의 결제 오케스트레이션 시스템 재구축: 모놀리스에서 SOA로",
    slug: "airbnb-payment-orchestration-soa-migration",
    companyName: "Airbnb",
    companySlug: "airbnb",
    sourceUrl:
      "https://medium.com/airbnb-engineering/rebuilding-payment-orchestration-at-airbnb-341d194a781b",
    sourceType: "blog",
    sourceLanguage: "en",
    publishedAt: "2024-06-18",
    summary: {
      background:
        "Airbnb는 모놀리식 아키텍처에서 SOA(Service-Oriented Architecture)로 전환하면서 결제 시스템도 근본적으로 재설계하기로 결정했다. 상품 이행, 결제 오케스트레이션, 가격 책정을 분리하여 팀들이 빠르고 안전하게 결제 기능을 통합할 수 있는 플랫폼을 만들고자 했다.",
      challenge:
        "마이그레이션 기간 동안 두 개의 결제 시스템을 병렬로 운영해야 했고, 숙박 예약의 마이그레이션만 30개 이상의 마일스톤으로 세분화해야 할 만큼 복잡했다. 이중 결제 방지, 데이터 정합성, 30개 이상의 글로벌 결제 수단 지원이 동시에 필요했다.",
      solution:
        "Orpheus라는 범용 멱등성 라이브러리를 개발하여 모든 결제 워크플로를 DAG(Directed Acyclic Graph)의 재시도 가능한 멱등 단계로 구성했다. Kafka 기반 이벤트 버스로 서비스 간 통신하고, Viaduct라는 데이터 서비스 메시를 통해 읽기를 통합했다. PSP-agnostic Multi-Step Transaction(MST) 프레임워크로 결제 수단에 독립적인 오케스트레이션을 구현했다. YAML 기반 설정으로 새로운 결제 수단 추가를 선언적으로 처리할 수 있게 했다.",
      results:
        "결제 정합성 99.999%(Five 9s)를 달성했다. Viaduct를 통한 데이터 읽기 비정규화로 레이턴시가 최대 150배 개선되었고 가용성이 99.9%에 도달했다. 14개월 만에 220개 시장에서 20개 이상의 로컬 결제 수단을 선언적 설정만으로 론칭할 수 있게 되었다.",
      keyTakeaways: [
        "대규모 마이그레이션은 작은 마일스톤으로 세분화하여 검증 가능하게 만들어야 한다",
        "멱등성 프레임워크를 공용 라이브러리로 제공하면 결제 안전성을 조직 전체에 확산시킬 수 있다",
        "설정 기반(Configuration-Driven) 접근은 결제 수단 확장을 극적으로 빠르게 한다",
      ],
    },
    domains: ["backend", "infrastructure", "platform"],
    technologies: [
      "Java",
      "Kafka",
      "gRPC",
      "YAML Configuration",
      "DAG Workflow",
    ],
    difficulty: "C",
    seedQuestions: [
      {
        content:
          "모놀리식 결제 시스템을 마이크로서비스로 마이그레이션할 때의 전략을 설계해주세요. 마이그레이션 중 데이터 정합성은 어떻게 보장하겠습니까?",
        hint: "Strangler Fig 패턴, 듀얼 라이트, 점진적 마일스톤, 롤백 전략",
        category: "SYSTEM_DESIGN",
      },
      {
        content:
          "글로벌 결제 시스템에서 다양한 PSP(Payment Service Provider)를 추상화하기 위한 설계 방법을 설명해주세요.",
        hint: "어댑터 패턴, 설정 기반 확장, 멱등성 보장, 결제 상태 머신",
        category: "BACKEND",
      },
      {
        content:
          "Five 9s(99.999%) 결제 정합성을 달성하기 위해 어떤 기술적 조치가 필요합니까?",
        hint: "멱등성 DAG, 이벤트 소싱, Exactly-once 처리, 감사 로그",
        category: "SYSTEM_DESIGN",
      },
    ],
  },

  // =========================================================================
  // 9. Shopify — BFCM(블랙 프라이데이) 대규모 트래픽 대비
  // =========================================================================
  {
    title:
      "Shopify가 블랙 프라이데이 분당 4.89억 요청을 처리하기 위해 준비하는 방법",
    slug: "shopify-bfcm-scaling-readiness",
    companyName: "Shopify",
    companySlug: "shopify",
    sourceUrl: "https://shopify.engineering/bfcm-readiness-2025",
    sourceType: "blog",
    sourceLanguage: "en",
    publishedAt: "2025-11-20",
    summary: {
      background:
        "Shopify는 매년 블랙 프라이데이 사이버 먼데이(BFCM) 기간에 전 세계 수백만 상점의 트래픽 폭주를 처리해야 한다. 2024년에는 57.3PB 데이터, 10.5조 DB 쿼리, 분당 2.84억 요청을 처리했고, 2025년에는 이를 넘어서야 했다.",
      challenge:
        "2024년에 분석 플랫폼 전체를 재구축했는데, 새로운 ETL 파이프라인과 API가 아직 실제 BFCM 트래픽을 경험하지 못한 상태였다. 장애를 실제 이벤트 날이 아닌 사전에 발견하여 수정할 충분한 시간을 확보해야 했다.",
      solution:
        "9개월간 수천 명의 엔지니어가 참여하는 대비 프로그램을 운영했다. 4~10월 사이 5차례의 대규모 부하 테스트를 실시하여 전년 대비 150% 트래픽을 목표로 점진적으로 부하를 증가시켰다. Genghis라는 자체 부하 테스트 도구로 실제 플래시 세일 패턴을 시뮬레이션했다. Toxiproxy로 네트워크 장애와 파티션을 주입하는 카오스 엔지니어링을 병행했다. Google Cloud 멀티 리전 전략으로 지역별 용량을 사전 확보했다.",
      results:
        "2025년 BFCM에서 90PB 데이터, 14.8조 DB 쿼리, 분당 4.89억 요청(엣지 기준)을 처리했다. 사전 테스트에서 Kafka 파티션 부족, API 메모리 최적화 필요, 커넥션 풀 타임아웃 등의 병목을 발견하여 사전에 해결할 수 있었다.",
      keyTakeaways: [
        "대규모 이벤트 대비는 수개월 전부터 점진적 부하 테스트로 준비해야 한다",
        "카오스 엔지니어링은 실제 장애 상황을 안전하게 사전 검증하는 필수 도구이다",
        "새로운 시스템은 반드시 실제 규모의 트래픽으로 검증한 후 프로덕션에 투입해야 한다",
      ],
    },
    domains: ["backend", "infrastructure", "devops"],
    technologies: [
      "Google Cloud",
      "Kafka",
      "Ruby on Rails",
      "Toxiproxy",
      "Load Testing",
    ],
    difficulty: "C",
    seedQuestions: [
      {
        content:
          "분당 수억 건의 요청을 처리하는 이커머스 플랫폼의 확장 전략을 설계해주세요. 플래시 세일 같은 트래픽 급증에는 어떻게 대응하겠습니까?",
        hint: "수평 확장, 캐시 전략, 큐 기반 비동기 처리, CDN, 읽기/쓰기 분리",
        category: "SYSTEM_DESIGN",
      },
      {
        content:
          "카오스 엔지니어링이란 무엇이며, 대규모 이벤트 전 시스템 안정성 검증에 어떻게 활용할 수 있습니까?",
        hint: "Chaos Monkey, Toxiproxy, Game Day 훈련, Steady State 가설",
        category: "DEVOPS",
      },
    ],
  },

  // =========================================================================
  // 10. Spotify — Backstage 개발자 포털
  // =========================================================================
  {
    title:
      "Spotify가 마이크로서비스 2,000개를 관리하기 위해 Backstage 개발자 포털을 만든 이유",
    slug: "spotify-backstage-developer-portal",
    companyName: "Spotify",
    companySlug: "spotify",
    sourceUrl:
      "https://engineering.atspotify.com/2020/04/how-we-use-backstage-at-spotify",
    sourceType: "blog",
    sourceLanguage: "en",
    publishedAt: "2020-04-30",
    summary: {
      background:
        "Spotify가 급성장하면서 클라우드 전환과 마이크로서비스 아키텍처를 도입했다. 분산된 자율적 팀 구조에서 인프라 도구의 파편화, 서비스 발견의 어려움, 신규 개발자 온보딩 복잡성이 커지는 문제가 발생했다.",
      challenge:
        "수천 개의 마이크로서비스를 운영하는 환경에서 각 서비스의 소유자, API, 문서를 찾는 것이 점점 어려워졌다. 새로운 서비스를 생성할 때 CI 파이프라인, 문서, 모니터링 등을 각각 설정해야 하는 비효율도 있었다.",
      solution:
        "모든 인프라를 하나의 프론트엔드로 통합하는 Backstage 개발자 포털을 구축했다. 플러그인 아키텍처로 팀별 커스텀 도구를 통합하면서도 일관된 인터페이스를 유지한다. 소프트웨어 카탈로그로 모든 서비스의 소유자, API, 메타데이터를 자동 인덱싱하고, 템플릿 시스템으로 서비스 생성 시 CI/문서/모니터링을 자동 설정한다. TechDocs로 코드와 함께 문서를 Markdown으로 관리한다.",
      results:
        "개발자 온보딩 시간이 절반으로 단축되었다. 서비스 검색, API 확인, 소유자 연락이 한 번의 검색으로 가능해졌다. 오픈소스로 공개된 후 2,600개 이상의 기업이 도입했으며 CNCF 프로젝트로 기부되었다.",
      keyTakeaways: [
        "마이크로서비스 규모가 커지면 개발자 경험(Developer Experience) 도구가 필수이다",
        "플러그인 아키텍처로 커스터마이징과 표준화를 동시에 달성할 수 있다",
        "소프트웨어 카탈로그는 서비스 발견과 거버넌스의 기반이다",
      ],
    },
    domains: ["platform", "devops", "infrastructure"],
    technologies: [
      "React",
      "TypeScript",
      "Node.js",
      "Plugin Architecture",
      "CNCF",
    ],
    difficulty: "B",
    seedQuestions: [
      {
        content:
          "수천 개의 마이크로서비스를 운영하는 조직에서 개발자 포털(Internal Developer Portal)은 왜 필요하며, 어떤 핵심 기능을 포함해야 합니까?",
        hint: "소프트웨어 카탈로그, 서비스 템플릿, 문서화, API 명세, 소유권 관리",
        category: "SYSTEM_DESIGN",
      },
      {
        content:
          "플러그인 기반 아키텍처의 장단점을 설명하고, 마이크로서비스 플랫폼 도구에서 어떻게 활용할 수 있는지 설명해주세요.",
        hint: "확장성, 느슨한 결합, 버저닝, 보안 샌드박스, 인터페이스 계약",
        category: "BACKEND",
      },
    ],
  },

  // =========================================================================
  // 11. 쿠팡 — 대용량 트래픽을 위한 코어 서빙 레이어
  // =========================================================================
  {
    title: "쿠팡의 대용량 트래픽 처리를 위한 코어 서빙 레이어 아키텍처",
    slug: "coupang-core-serving-layer-high-traffic",
    companyName: "Coupang",
    companySlug: "coupang",
    sourceUrl:
      "https://medium.com/coupang-engineering/our-backend-strategy-to-handle-massive-traffic-d30cd6cc4fb2",
    sourceType: "blog",
    sourceLanguage: "en",
    publishedAt: "2023-09-14",
    summary: {
      background:
        "쿠팡은 한국 최대의 이커머스 플랫폼으로, 하나의 상품 페이지를 구성하기 위해 이미지(카탈로그 팀), 가격(프라이싱 팀), 재고(풀필먼트 팀) 등 여러 마이크로서비스의 데이터를 조합해야 한다. 분당 1억 건 이상의 요청을 처리해야 하는 대규모 트래픽 환경이다.",
      challenge:
        "각 마이크로서비스에서 직접 데이터를 읽으면 레이턴시가 높아지고, 하나의 서비스 장애가 전체 상품 페이지에 영향을 미친다. 고가용성과 저지연을 동시에 보장하면서 수백 개의 마이크로서비스 데이터를 효율적으로 통합 서빙해야 했다.",
      solution:
        "Materialization Platform 팀이 코어 서빙 레이어를 구축했다. 각 마이크로서비스는 데이터 변경 시 큐를 통해 업데이트를 전송하고, NoSQL 기반 공통 저장소에 저장한다. 60~100개 노드로 구성된 다계층 캐시가 전체 트래픽의 95%를 처리하여 저장소 부하를 최소화한다. 비즈니스 로직을 통합하여 코드 중복을 제거하고, 단일 엔드포인트로 상품 데이터를 서빙한다.",
      results:
        "전체 트래픽의 95%를 캐시 레이어에서 처리하여 분당 1억 건 이상의 요청을 저지연으로 서빙할 수 있게 되었다. 개별 마이크로서비스 장애가 상품 페이지에 미치는 영향이 최소화되었고, 데이터 서빙 코드의 중복이 제거되었다.",
      keyTakeaways: [
        "읽기 집중 워크로드에서 다계층 캐시는 성능의 핵심이다",
        "이벤트 기반 비동기 데이터 동기화로 서비스 간 결합을 줄일 수 있다",
        "Materialized View 패턴으로 여러 서비스의 데이터를 통합 서빙할 수 있다",
      ],
    },
    domains: ["backend", "infrastructure", "data"],
    technologies: ["Java", "NoSQL", "Kafka", "Multi-layer Cache", "CDN"],
    difficulty: "B",
    seedQuestions: [
      {
        content:
          "이커머스 상품 페이지처럼 여러 마이크로서비스의 데이터를 조합해서 보여줘야 할 때, 어떤 패턴을 사용하겠습니까?",
        hint: "API Gateway, BFF(Backend for Frontend), Materialized View, CQRS",
        category: "SYSTEM_DESIGN",
      },
      {
        content:
          "다계층 캐시(Multi-layer Cache) 전략을 설계할 때 고려해야 할 요소들은 무엇입니까? 캐시 일관성은 어떻게 보장하겠습니까?",
        hint: "L1/L2 캐시, TTL, 캐시 무효화 전략, write-through vs write-behind",
        category: "BACKEND",
      },
    ],
  },

  // =========================================================================
  // 12. LINE — Kafka Streams를 활용한 내부 메시지 전달 파이프라인
  // =========================================================================
  {
    title:
      "LINE이 Kafka Streams로 초당 100만 건의 내부 메시지 파이프라인을 구축한 방법",
    slug: "line-kafka-streams-message-pipeline",
    companyName: "LY Corporation (LINE)",
    companySlug: "line",
    sourceUrl:
      "https://engineering.linecorp.com/en/blog/applying-kafka-streams-for-internal-message-delivery-pipeline/",
    sourceType: "blog",
    sourceLanguage: "en",
    publishedAt: "2016-08-31",
    summary: {
      background:
        "LINE은 하루 250억 건의 메시지를 전달하며, 피크 시 초당 42만 건의 메시지를 처리한다. 이를 지원하기 위한 내부 메시지 전달 파이프라인(IMF: Internal Message Flow)을 새롭게 구축해야 했다. 기존 talk-dispatcher는 Redis 기반의 인메모리 큐로 백그라운드 작업을 처리했다.",
      challenge:
        "기존 talk-dispatcher는 세 가지 심각한 문제가 있었다. 첫째, Redis 인스턴스에 로컬 큐가 묶여 있어 트래픽 급증 시 분산 처리가 불가능했다. 둘째, 인메모리 특성상 인스턴스 장애 시 큐의 작업이 유실되었다. 셋째, 개별 사용자의 작업이 다른 호스트로 분산되어 처리 순서가 보장되지 않았다.",
      solution:
        "Apache Kafka와 Kafka Streams를 도입하여 Decaton이라는 새로운 시스템을 구축했다. Kafka Streams의 'Masterless' 아키텍처를 활용하여 별도의 코디네이터 없이 파티션 할당과 장애 복구를 자동화했다. userId 기반 파티셔닝으로 같은 사용자의 메시지를 동일 파티션에서 순서대로 처리한다. Kafka의 디스크 기반 영속성으로 메시지 유실을 방지했다.",
      results:
        "초당 100만 건 이상의 메시지를 안정적으로 처리할 수 있게 되었다. 개별 프로세서 장애가 다른 프로세서에 영향을 주지 않는 격리된 구조를 달성했다. Kafka 커뮤니티에 여러 버그 수정과 기능 개선을 기여했다.",
      keyTakeaways: [
        "Kafka Streams는 프레임워크가 아닌 라이브러리로, 기존 배포 시스템과 쉽게 통합된다",
        "키 기반 파티셔닝으로 순서 보장과 부하 분산을 동시에 달성할 수 있다",
        "디스크 기반 메시지 큐는 인메모리 큐 대비 안정성이 월등하다",
      ],
    },
    domains: ["backend", "infrastructure", "data"],
    technologies: ["Apache Kafka", "Kafka Streams", "Java", "Redis", "HBase"],
    difficulty: "B",
    seedQuestions: [
      {
        content:
          "하루 250억 건의 메시지를 처리하는 메시징 플랫폼의 내부 이벤트 파이프라인을 설계해주세요. 순서 보장과 확장성을 어떻게 양립시키겠습니까?",
        hint: "파티셔닝 전략, Consumer Group, 키 기반 라우팅, 백프레셔",
        category: "SYSTEM_DESIGN",
      },
      {
        content:
          "Kafka Streams와 Apache Flink 같은 스트림 처리 프레임워크의 차이를 설명하고, 각각 어떤 상황에서 적합한지 논의해주세요.",
        hint: "라이브러리 vs 프레임워크, 상태 관리, 확장성, 배포 복잡도",
        category: "BACKEND",
      },
    ],
  },

  // =========================================================================
  // 13. Uber — 차세대 GPS 위치 정확도 개선
  // =========================================================================
  {
    title: "Uber가 도심 환경에서 GPS 정확도를 50m 이상 개선한 차세대 위치 기술",
    slug: "uber-rethinking-gps-urban-location",
    companyName: "Uber",
    companySlug: "uber",
    sourceUrl: "https://www.uber.com/blog/rethinking-gps/",
    sourceType: "blog",
    sourceLanguage: "en",
    publishedAt: "2024-02-15",
    summary: {
      background:
        "GPS는 1973년 설계 이후 근본적으로 변하지 않았지만, Uber 사용자의 대부분은 도심 환경에서 서비스를 이용한다. 도심의 높은 건물들이 직접적인 위성 신호를 차단하여 반사 신호에 의존하게 되고, 이는 50m 이상의 위치 오차를 유발한다.",
      challenge:
        "GPS 수신기는 위성과의 직선 시야(Line-of-Sight)를 전제로 설계되었으나, 도시 캐년(urban canyon) 환경에서는 건물에 반사된 신호(NLOS: Non-Line-of-Sight)가 의사거리(pseudorange) 측정을 왜곡한다. 최소 4개의 위성 신호가 필요한데, 도심에서는 가용 위성이 줄어들면서 오차가 기하급수적으로 증가한다.",
      solution:
        "Android의 GNSS API를 활용한 소프트웨어 기반 업그레이드를 개발했다. 3D 지도 데이터와 확률적 알고리즘을 결합하여 직접 신호와 반사 신호를 구분한다. 로보틱스와 불확실성 모델링에서 차용한 신호 처리 기법으로 신호 강도 자체를 LOS/NLOS 판별 정보로 활용한다. 클라이언트-서버 아키텍처로 기기에서 수집한 원시 GNSS 데이터를 서버에서 정밀 처리한다.",
      results:
        "샌프란시스코 테스트에서 표준 GPS 대비 극적인 정확도 향상을 달성했다. 기존 GPS가 큰 편차를 보이던 구간에서 개선된 추정치가 실제 경로를 정밀하게 추적했다. 하드웨어 변경 없이 소프트웨어 업데이트만으로 수백만 대의 기기에 배포 가능하다.",
      keyTakeaways: [
        "GPS 신호의 '부정확함' 자체가 유용한 정보원이 될 수 있다",
        "3D 지도 데이터와 확률 모델의 결합으로 위치 정확도를 크게 개선할 수 있다",
        "소프트웨어 기반 접근은 하드웨어 교체 없이 대규모 개선을 가능하게 한다",
      ],
    },
    domains: ["mobile", "ai-ml", "data"],
    technologies: [
      "Android GNSS API",
      "3D Mapping",
      "Probabilistic Algorithms",
      "Signal Processing",
    ],
    difficulty: "C",
    seedQuestions: [
      {
        content:
          "실시간 위치 기반 서비스(차량 호출, 배달 등)에서 위치 정확도를 개선하기 위한 기술적 접근법을 설명해주세요.",
        hint: "GPS 보정, 센서 퓨전, 칼만 필터, 3D 지도 매칭, NLOS 탐지",
        category: "SYSTEM_DESIGN",
      },
      {
        content:
          "수백만 대의 모바일 기기에서 수집되는 실시간 위치 데이터를 처리하는 파이프라인을 설계해주세요.",
        hint: "스트림 처리, 지리공간 인덱싱(H3/Geohash), 배치 vs 실시간, 데이터 압축",
        category: "SYSTEM_DESIGN",
      },
    ],
  },

  // =========================================================================
  // 14. 당근 — 검색 엔진 Kubernetes 마이그레이션
  // =========================================================================
  {
    title:
      "당근마켓 검색 엔진을 Kubernetes로 쉽게 운영하기: 초당 1,000건 검색 인프라 개선기",
    slug: "daangn-search-engine-kubernetes-migration",
    companyName: "Karrot",
    companySlug: "daangn",
    sourceUrl:
      "https://medium.com/daangn/%EB%8B%B9%EA%B7%BC%EB%A7%88%EC%BC%93-%EA%B2%80%EC%83%89-%EC%97%94%EC%A7%84-%EC%BF%A0%EB%B2%84%EB%84%A4%ED%8B%B0%EC%8A%A4%EB%A1%9C-%EC%89%BD%EA%B2%8C-%EC%9A%B4%EC%98%81%ED%95%98%EA%B8%B0-bdf2688df267",
    sourceType: "blog",
    sourceLanguage: "ko",
    publishedAt: "2022-06-15",
    summary: {
      background:
        "당근마켓 검색 플랫폼팀은 평균 초당 1,000건의 검색 요청과 2.7억 건 이상의 문서를 처리하는 Elasticsearch 기반 검색 인프라를 운영하고 있다. 중고거래, 동네생활, 알바 등 다양한 서비스의 검색을 담당한다.",
      challenge:
        "기존 Elasticsearch 운영은 노드 추가·제거, 설정 변경, 버전 업그레이드 등이 시간이 많이 걸리고 복잡했다. 트래픽 변동에 따른 유연한 스케일링이 어려웠고, 운영 자동화가 부족하여 검색 플랫폼 엔지니어의 운영 부담이 컸다.",
      solution:
        "Elasticsearch를 Kubernetes 위에 운영하도록 마이그레이션했다. Elastic Cloud on Kubernetes(ECK) 오퍼레이터를 활용하여 노드 관리, 스케일링, 버전 업그레이드를 선언적으로 처리한다. Metricbeat, Filebeat, Kibana를 연동하여 모니터링과 로깅을 자동화했다. 데이터 노드 워밍업 전략을 구현하여 새 노드 투입 시 안정성을 확보했다.",
      results:
        "검색 엔진 운영에 소요되는 시간이 크게 줄어들었고, 트래픽 변동에 따른 유연한 스케일링이 가능해졌다. Kubernetes의 선언적 관리로 인프라 변경의 추적과 롤백이 용이해졌다. 운영 자동화로 엔지니어가 검색 품질 개선에 더 집중할 수 있게 되었다.",
      keyTakeaways: [
        "Kubernetes 오퍼레이터 패턴으로 복잡한 상태 저장 워크로드도 선언적으로 관리할 수 있다",
        "데이터 노드 워밍업은 상태 저장 서비스의 안정적 스케일링에 필수적이다",
        "운영 자동화는 엔지니어가 더 가치 있는 작업에 집중할 수 있게 해준다",
      ],
    },
    domains: ["infrastructure", "devops", "backend"],
    technologies: [
      "Elasticsearch",
      "Kubernetes",
      "ECK Operator",
      "Kibana",
      "Metricbeat",
    ],
    difficulty: "B",
    seedQuestions: [
      {
        content:
          "Elasticsearch 같은 상태 저장(stateful) 워크로드를 Kubernetes에서 운영할 때의 도전과 해결 방법을 설명해주세요.",
        hint: "StatefulSet, PV/PVC, 노드 어피니티, 롤링 업데이트 전략, 데이터 워밍업",
        category: "DEVOPS",
      },
      {
        content:
          "초당 1,000건의 검색 요청과 수억 건의 문서를 처리하는 검색 시스템을 설계해주세요.",
        hint: "인덱스 샤딩, 레플리카, 캐시 레이어, 쿼리 최적화, 근실시간 인덱싱",
        category: "SYSTEM_DESIGN",
      },
    ],
  },

  // =========================================================================
  // 15. 컬리 — 새벽배송 시스템 전면 교체
  // =========================================================================
  {
    title:
      "컬리의 새로운 배송 시스템 구축: SaaS에서 자체 TMS로의 무중단 전환기",
    slug: "kurly-delivery-system-rebuild",
    companyName: "Kurly",
    companySlug: "kurly",
    sourceUrl: "https://helloworld.kurly.com/blog/2023-delivery-system/",
    sourceType: "blog",
    sourceLanguage: "ko",
    publishedAt: "2024-01-15",
    summary: {
      background:
        "컬리는 '샛별배송'(새벽배송) 서비스를 SaaS 기반 TMS(Transportation Management System)로 운영했다. 초기에는 빠른 도입과 저비용이 장점이었으나, 컬리의 고유한 운영 요구사항에 맞춤 대응이 점점 어려워졌다.",
      challenge:
        "SaaS 플랫폼의 커스터마이징 한계로 대규모 쿼리와 다운로드 시 성능 병목이 발생했다. 수십 개의 물류 센터가 각각 다른 운영 정책을 가지고 있어 전환 시 모든 경우를 검증해야 했다. SaaS 계약 종료라는 시간 제약 속에서 무중단 전환을 완료해야 했다.",
      solution:
        "물류 자회사(Kurly Next Mile)와의 심층 인터뷰, 운영 매뉴얼 분석, 벤더 요청 이력 분석을 통해 도메인을 깊이 이해했다. 자원 관리(드라이버, 차량)와 배송 실행을 핵심 도메인으로 모델링하고 스쿼드 기반으로 개발 조직을 구성했다. 새로운 시스템이 기존 시스템과 동일한 Kafka 토픽을 소비하도록 설계하여 의존 시스템 변경 없이 지역별 점진적 전환이 가능하도록 했다. 피처 토글로 지역별 독립 제어를 구현했다.",
      results:
        "예정된 1개월 일정보다 3일 앞당겨 전환을 완료했다. 전환 기간 동안 서비스 중단, 배송 실패, 인시던트가 '제로'였다. 이후 당일배송, 컬리나우 서비스로 시스템을 확장했으며 실시간 배송 제어와 물류 최적화를 지속적으로 개선하고 있다.",
      keyTakeaways: [
        "도메인 전문가와의 협업과 기존 시스템 분석이 성공적 전환의 기반이다",
        "동일 이벤트 소스를 공유하는 듀얼 시스템 패턴으로 무중단 전환이 가능하다",
        "피처 토글과 지역별 점진적 전환으로 리스크를 최소화할 수 있다",
      ],
    },
    domains: ["backend", "infrastructure"],
    technologies: [
      "Kafka",
      "Java",
      "Spring Boot",
      "Feature Toggle",
      "Domain Modeling",
    ],
    difficulty: "B",
    seedQuestions: [
      {
        content:
          "레거시 시스템을 새로운 시스템으로 무중단 마이그레이션하기 위한 전략을 설계해주세요. 어떤 패턴을 사용하겠습니까?",
        hint: "Strangler Fig 패턴, 듀얼 라이트/듀얼 리드, 피처 토글, 카나리 전환",
        category: "SYSTEM_DESIGN",
      },
      {
        content:
          "물류/배송 시스템의 도메인 모델링 시 고려해야 할 핵심 엔티티와 관계를 설명해주세요.",
        hint: "배송 단위, 드라이버, 차량, 배송권역, 배송 상태 머신, 시간 제약",
        category: "BACKEND",
      },
    ],
  },

  // =========================================================================
  // 16. 배민스토어 — 이벤트 기반 아키텍처
  // =========================================================================
  {
    title:
      "배민스토어에 이벤트 기반 아키텍처를 적용하여 마이크로서비스 간 데이터 동기화를 해결한 사례",
    slug: "baemin-store-event-driven-architecture",
    companyName: "Woowa Brothers",
    companySlug: "woowahan",
    sourceUrl: "https://techblog.woowahan.com/13101/",
    sourceType: "blog",
    sourceLanguage: "ko",
    publishedAt: "2023-09-12",
    summary: {
      background:
        "배민스토어는 배달의민족의 편의점·마트 배달 서비스로, 다수의 마이크로서비스가 각각 독립된 데이터베이스를 가진 구조이다. 셀러(Seller)와 매장(Shop) 정보가 여러 서비스에서 사용되어 데이터 동기화가 핵심 과제였다.",
      challenge:
        "동기 API 호출 방식은 서비스 간 강한 결합을 만들고, 하나의 서비스 장애가 전체로 전파되는 문제가 있었다. 데이터 정합성을 유지하면서도 서비스 간 의존성을 줄이고, 새로운 소비자 서비스 추가 시 기존 서비스를 수정할 필요가 없어야 했다.",
      solution:
        "Kafka Pub/Sub 구조를 전면 도입하여 셀러·매장 정보 변경 시 Producer가 Kafka Cluster에 이벤트를 발행하고, 각 Consumer 서비스가 독립적으로 이벤트를 수신하여 데이터를 저장하는 구조를 구현했다. 이벤트 스키마 레지스트리로 메시지 포맷을 관리하고, Consumer 그룹을 활용하여 수평 확장이 가능하도록 설계했다.",
      results:
        "서비스 간 결합도가 크게 감소하여 독립 배포가 가능해졌다. 새로운 소비자 서비스 추가 시 Producer 코드 변경 없이 Kafka 토픽 구독만으로 연동이 완료된다. 비동기 처리로 응답 시간이 개선되었고 장애 전파가 차단되었다.",
      keyTakeaways: [
        "이벤트 기반 아키텍처는 서비스 추가 시 기존 코드를 수정할 필요가 없어 확장성이 뛰어나다",
        "Kafka의 Consumer Group으로 이벤트 처리의 수평 확장이 자연스럽게 가능하다",
        "이벤트 스키마 레지스트리는 서비스 간 계약을 관리하는 핵심 도구이다",
      ],
    },
    domains: ["backend", "infrastructure"],
    technologies: ["Kafka", "Spring Boot", "Java", "Schema Registry", "MySQL"],
    difficulty: "A",
    seedQuestions: [
      {
        content:
          "이벤트 기반 아키텍처에서 Kafka를 사용할 때, 메시지 전달 보장(At-least-once, At-most-once, Exactly-once)의 차이를 설명해주세요.",
        hint: "acks 설정, offset 커밋, 멱등성 프로듀서, 트랜잭셔널 메시징",
        category: "BACKEND",
      },
      {
        content:
          "동기 API 호출 기반 아키텍처와 이벤트 기반 아키텍처의 트레이드오프를 설명하고, 각각 어떤 상황에서 적합한지 논의해주세요.",
        hint: "결합도, 일관성 모델, 디버깅 복잡도, 장애 전파, 최종 일관성",
        category: "SYSTEM_DESIGN",
      },
    ],
  },

  // =========================================================================
  // 17. 우아한형제들 — SSE(Server-Sent Events) 실시간 알림
  // =========================================================================
  {
    title: "배달의민족이 Server-Sent Events로 실시간 알림을 전달하는 방법",
    slug: "woowahan-sse-realtime-notification",
    companyName: "Woowa Brothers",
    companySlug: "woowahan",
    sourceUrl: "https://techblog.woowahan.com/23199/",
    sourceType: "blog",
    sourceLanguage: "ko",
    publishedAt: "2024-06-20",
    summary: {
      background:
        "배달의민족에서는 주문 상태 변경, 배달 현황 등의 정보를 사용자에게 실시간으로 전달해야 한다. 기존의 폴링(Polling) 방식은 불필요한 네트워크 요청이 많고, 실시간성도 떨어지는 문제가 있었다.",
      challenge:
        "WebSocket은 양방향 통신이 가능하지만 서버에서 클라이언트로의 단방향 푸시에는 과도한 리소스를 소모한다. HTTP 폴링은 구현이 간단하지만 실시간성과 효율성이 떨어진다. 서버에서 클라이언트로의 효율적인 단방향 실시간 통신이 필요했다.",
      solution:
        "SSE(Server-Sent Events)를 도입하여 서버에서 클라이언트로의 단방향 실시간 데이터 스트리밍을 구현했다. HTTP 기반으로 별도의 프로토콜 없이 동작하며, 브라우저의 EventSource API와 자동 재연결 메커니즘을 활용했다. Spring Framework의 SseEmitter를 사용하여 서버 측 구현을 간소화했다.",
      results:
        "폴링 대비 네트워크 요청이 크게 줄어들었고, 이벤트 발생 시 즉각적인 알림 전달이 가능해졌다. WebSocket 대비 서버 리소스 사용이 효율적이며, HTTP 인프라(로드밸런서, 프록시)와 자연스럽게 호환된다.",
      keyTakeaways: [
        "서버→클라이언트 단방향 실시간 통신에는 SSE가 WebSocket보다 효율적이다",
        "SSE는 HTTP 기반이므로 기존 인프라와의 호환성이 뛰어나다",
        "자동 재연결 메커니즘으로 연결 안정성을 별도 구현 없이 확보할 수 있다",
      ],
    },
    domains: ["backend", "frontend"],
    technologies: [
      "Server-Sent Events",
      "Spring Boot",
      "SseEmitter",
      "JavaScript EventSource",
    ],
    difficulty: "A",
    seedQuestions: [
      {
        content:
          "실시간 데이터를 클라이언트에 전달하는 방법으로 Polling, Long Polling, WebSocket, SSE의 차이를 설명하고, 각각의 적합한 사용 사례를 제시해주세요.",
        hint: "연결 방식, 양방향/단방향, 리소스 효율성, 자동 재연결, 브라우저 지원",
        category: "NETWORK",
      },
      {
        content:
          "대규모 사용자에게 실시간 알림을 전달하는 시스템을 설계해주세요. SSE를 사용한다면 확장성 문제를 어떻게 해결하겠습니까?",
        hint: "커넥션 관리, 로드밸런서 설정, Redis Pub/Sub, 수평 확장 전략",
        category: "SYSTEM_DESIGN",
      },
    ],
  },
];
