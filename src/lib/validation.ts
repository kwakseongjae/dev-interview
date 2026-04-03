// 입력 유효성 검증 (클라이언트/서버 모두 사용 가능)

// 입력 유효성 검증 결과
export interface InputValidationResult {
  isValid: boolean;
  suggestion?: string; // 유효하지 않을 때 추천 메시지
  category?: "too_short" | "not_interview" | "inappropriate" | "too_vague";
}

// 유효하지 않은 입력에 대한 추천 예시
const SUGGESTION_EXAMPLES = [
  "프론트엔드 개발자 기술면접 준비해줘",
  "React와 TypeScript 면접 질문 만들어줘",
  "백엔드 신입 개발자 면접 대비",
  "데이터베이스 관련 기술면접 질문",
  "JavaScript 비동기 처리 면접 질문",
  "LLM 활용 개발 면접 질문 만들어줘",
  "RAG 파이프라인 설계 면접 준비",
];

// ── Layer 1: 키워드 2단계 분리 ──────────────────────────────────

// 범용 키워드 — 단독으로는 기술 키워드 역할 불가 (비개발 면접에도 사용됨)
const GENERIC_KEYWORDS = [
  "면접",
  "준비",
  "취업",
  "이직",
  "신입",
  "경력",
  "기술",
];

// 순수 개발 도메인 키워드
const DEV_DOMAIN_KEYWORDS = [
  // 직무
  "개발",
  "개발자",
  "프론트",
  "백엔드",
  "풀스택",
  "데브옵스",
  "인프라",
  "ios",
  "android",
  "모바일",
  "코딩",
  "프로그래밍",
  // 기술 스택
  "javascript",
  "typescript",
  "react",
  "vue",
  "angular",
  "next",
  "node",
  "express",
  "python",
  "java",
  "kotlin",
  "swift",
  "go",
  "rust",
  "c++",
  "c#",
  "spring",
  "django",
  "flask",
  "fastapi",
  "nest",
  "sql",
  "mysql",
  "postgresql",
  "mongodb",
  "redis",
  "database",
  "db",
  "aws",
  "gcp",
  "azure",
  "docker",
  "kubernetes",
  "k8s",
  "ci/cd",
  "api",
  "rest",
  "graphql",
  "http",
  "network",
  "네트워크",
  "자료구조",
  "알고리즘",
  "cs",
  "운영체제",
  "os",
  "시스템",
  "git",
  "agile",
  "scrum",
  "tdd",
  "테스트",
  // 한글 기술 용어
  "자바",
  "파이썬",
  "리액트",
  "노드",
  "스프링",
  "데이터베이스",
  // AI/트렌드 관련
  "ai",
  "llm",
  "rag",
  "에이전트",
  "agent",
  "gpt",
  "claude",
  "프롬프트",
  "prompt",
  "트렌드",
  "벡터",
  "임베딩",
  "embedding",
  "transformer",
  "트랜스포머",
  "파인튜닝",
  "할루시네이션",
  "생성형",
  "머신러닝",
  "딥러닝",
  "ml",
  "서버리스",
  "serverless",
  "엣지",
  "edge",
  "옵저버빌리티",
  "observability",
  "kafka",
  "이벤트 드리븐",
];

// 비개발 도메인 블랙리스트 (쿼리 검증용)
const NON_DEV_BLACKLIST = [
  // 비개발 직무
  /(알바|아르바이트|파트타임|카페|편의점|마트|배달|서빙|캐셔|매장)/,
  // 비기술 도메인
  /(주가|주식|코인|부동산|투자|재테크|펀드|보험)/,
  /(다이어트|요리|레시피|운동|헬스|미용|네일)/,
  // 비개발 직군 면접
  /(승무원|간호사|공무원|경찰|소방|군대|입대|군인)/,
  /(마케팅|영업|회계|인사|총무|비서|사무직)/,
  // 비기술 면접 유형
  /(자소서|자기소개서|인성면접|임원면접|PT면접)/,
];

/**
 * 입력 유효성 검증 (API 호출 전 토큰 절약)
 */
export function validateInterviewInput(query: string): InputValidationResult {
  const trimmedQuery = query.trim();

  // 1-a. 너무 긴 입력 (500자 초과) - 토큰 남용 방지
  if (trimmedQuery.length > 500) {
    return {
      isValid: false,
      category: "too_short",
      suggestion: "검색어가 너무 깁니다. 500자 이내로 입력해주세요.",
    };
  }

  // 1-b. 너무 짧은 입력 (3글자 미만)
  if (trimmedQuery.length < 3) {
    return {
      isValid: false,
      category: "too_short",
      suggestion:
        "검색어가 너무 짧습니다. 원하는 면접 주제를 구체적으로 입력해주세요.",
    };
  }

  // 2. 특수문자만 있는 경우
  const onlySpecialChars = /^[^a-zA-Z가-힣0-9]+$/;
  if (onlySpecialChars.test(trimmedQuery)) {
    return {
      isValid: false,
      category: "inappropriate",
      suggestion:
        "유효한 검색어를 입력해주세요. 기술 키워드나 직무를 포함해보세요.",
    };
  }

  // 3. 의미없는 반복 패턴 (예: "ㅋㅋㅋ", "ㅎㅎㅎ", "aaaa")
  const repeatingPattern = /^(.)\1{2,}$/;
  if (repeatingPattern.test(trimmedQuery.replace(/\s/g, ""))) {
    return {
      isValid: false,
      category: "inappropriate",
      suggestion:
        "기술면접 질문을 생성하려면 구체적인 기술 스택이나 직무를 입력해주세요.",
    };
  }

  // 4. 인사말/잡담 패턴
  const greetingPatterns = [
    /^(안녕|하이|헬로|hi|hello|hey)/i,
    /^(ㅋ|ㅎ|ㅠ|ㅜ)+$/,
    /^(뭐해|뭐하|뭐함|심심)/i,
    /^(배고|졸려|피곤)/i,
    /^(테스트|test|asdf|qwer)/i,
  ];

  for (const pattern of greetingPatterns) {
    if (pattern.test(trimmedQuery)) {
      return {
        isValid: false,
        category: "not_interview",
        suggestion:
          "기술면접 질문을 생성해드립니다. 예를 들어 '프론트엔드 개발자 면접 준비' 같이 입력해보세요.",
      };
    }
  }

  // 5. 면접/기술과 관련없어 보이는 패턴 (문자열 시작)
  const nonInterviewStartPatterns = [
    /^(오늘 날씨|내일 날씨|날씨)/i,
    /^(맛집|음식|뭐 먹|추천해)/i,
    /^(게임|영화|드라마|노래)/i,
    /^(주식|코인|비트코인)/i,
  ];

  for (const pattern of nonInterviewStartPatterns) {
    if (pattern.test(trimmedQuery)) {
      return {
        isValid: false,
        category: "not_interview",
        suggestion:
          "모카번은 기술면접 질문 생성 서비스입니다. 기술 스택이나 직무를 입력해주세요.",
      };
    }
  }

  // 6. 일상 대화/개인적인 내용 패턴 (문자열 어디서든 포함)
  const casualContentPatterns = [
    /(친구|동생|형|누나|오빠|언니|엄마|아빠|가족)/,
    /(뚱땡이|바보|멍청이|똥|방귀)/,
    /(사랑해|보고싶|그리워|좋아해)/,
    /(밥|점심|저녁|아침|간식|배달)/,
    /(잠|자고|일어나|피곤|졸려)/,
    /(재미|심심|놀자|놀아)/,
    /(ㅋㅋ|ㅎㅎ|ㅠㅠ|ㅜㅜ|ㄷㄷ|ㄱㄱ)/,
  ];

  for (const pattern of casualContentPatterns) {
    if (pattern.test(trimmedQuery)) {
      return {
        isValid: false,
        category: "not_interview",
        suggestion:
          "기술면접과 관련된 내용을 입력해주세요. 예: '프론트엔드 개발자 면접 준비'",
      };
    }
  }

  // ── Layer 1: 2단계 키워드 검증 + 블랙리스트 ──────────────────

  const queryLower = trimmedQuery.toLowerCase();
  const words = trimmedQuery.split(/\s+/);
  const hasDevKeyword = DEV_DOMAIN_KEYWORDS.some((k) => queryLower.includes(k));
  const hasGenericKeyword = GENERIC_KEYWORDS.some((k) =>
    queryLower.includes(k),
  );
  const hasAnyKeyword = hasDevKeyword || hasGenericKeyword;
  const hasNonDevBlacklist = NON_DEV_BLACKLIST.some((p) => p.test(queryLower));

  // 7. 비개발 블랙리스트 매치 + 기술 키워드 없음 → 차단
  if (hasNonDevBlacklist && !hasDevKeyword) {
    return {
      isValid: false,
      category: "not_interview",
      suggestion:
        "모카번은 개발자 기술면접 전용 서비스입니다. 예: 'React 면접 질문', '백엔드 개발자 면접 준비'",
    };
  }

  // 8. 범용 키워드만 있고 기술 키워드 없음 → 차단 (짧은 쿼리)
  if (hasGenericKeyword && !hasDevKeyword && trimmedQuery.length < 30) {
    return {
      isValid: false,
      category: "not_interview",
      suggestion:
        "구체적인 기술 스택이나 개발 직무를 포함해주세요. 예: 'React 프론트엔드 면접', 'Java 백엔드 면접 준비'",
    };
  }

  // 9. 너무 모호한 입력 (2단어 이하 + 키워드 없음 + 짧음)
  if (words.length <= 2 && !hasAnyKeyword && trimmedQuery.length < 10) {
    return {
      isValid: false,
      category: "too_vague",
      suggestion: `입력이 너무 모호합니다. 예시: "${SUGGESTION_EXAMPLES[Math.floor(Math.random() * SUGGESTION_EXAMPLES.length)]}"`,
    };
  }

  // 10. 기술 키워드가 전혀 없고 짧은 입력
  if (!hasAnyKeyword && trimmedQuery.length < 20) {
    return {
      isValid: false,
      category: "not_interview",
      suggestion:
        "기술면접과 관련된 키워드를 포함해주세요. 예: 'React 면접 질문', '백엔드 개발자 면접'",
    };
  }

  // 유효한 입력
  return { isValid: true };
}

// ── 질문 콘텐츠 기반 비기술 필터링 ──────────────────────────────

// 기술적 맥락을 나타내는 키워드 — 이것이 포함되면 비기술 판정 면제
const DEV_CONTEXT_KEYWORDS = [
  "시스템",
  "아키텍처",
  "설계",
  "구현",
  "알고리즘",
  "데이터",
  "api",
  "서버",
  "클라이언트",
  "모델",
  "파이프라인",
  "인프라",
  "배포",
  "코드",
  "개발",
  "프로그래밍",
  "동시성",
  "트래픽",
  "데이터베이스",
  "인덱스",
  "캐싱",
  "llm",
  "rag",
  "머신러닝",
  "딥러닝",
  "임베딩",
  "transformer",
  "pos",
  "추천 시스템",
  "서빙",
  "레이턴시",
  "스케일",
];

// 순수 비기술 질문만 감지하는 패턴 (기술적 맥락 없이 비기술 키워드만 있는 경우)
const NON_DEV_CONTENT_PATTERNS = [
  // 비개발 직무 면접 (기술 맥락 없는 순수 직무 질문)
  /알바 경험이 없/,
  /이 일을 잘 할 수 있다고/,
  /업무를 익히기 위해/,
  /근무 태도/,
  /출퇴근/,
  // 비기술 업무 질문
  /음료를 제조/,
  /음료 제조/,
  /음료 위생/,
  /매장 청결/,
  /위생 관리.*원칙/,
  /피크타임에 주문이 밀리/,
  // 비기술 면접 유형
  /자기소개서를 작성/,
  /인성면접에서/,
];

/**
 * 질문 content가 비기술 콘텐츠인지 확인
 * - 캐시 검색 시 DB에서 가져온 질문을 필터링하는 용도
 * - 쿼리가 아닌 질문 텍스트(content) 대상
 * - 기술적 맥락이 포함된 질문은 통과 (예: "카페 POS 시스템 동시성 문제")
 */
export function isNonDevContent(content: string): boolean {
  const lower = content.toLowerCase();

  // 기술적 맥락이 있으면 비기술 질문이 아님
  if (DEV_CONTEXT_KEYWORDS.some((kw) => lower.includes(kw))) {
    return false;
  }

  return NON_DEV_CONTENT_PATTERNS.some((p) => p.test(lower));
}
