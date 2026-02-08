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

/**
 * 입력 유효성 검증 (API 호출 전 토큰 절약)
 */
export function validateInterviewInput(query: string): InputValidationResult {
  const trimmedQuery = query.trim();

  // 1. 너무 짧은 입력 (3글자 미만)
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

  // 7. 너무 모호한 입력 (2단어 이하이면서 기술 키워드가 없는 경우)
  const techKeywords = [
    // 직무 관련
    "면접",
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
    "기술",
    "코딩",
    "프로그래밍",
    "신입",
    "경력",
    "취업",
    "이직",
    "준비",
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

  const queryLower = trimmedQuery.toLowerCase();
  const words = trimmedQuery.split(/\s+/);
  const hasTechKeyword = techKeywords.some((keyword) =>
    queryLower.includes(keyword),
  );

  // 2단어 이하이면서 기술 키워드가 없는 경우
  if (words.length <= 2 && !hasTechKeyword && trimmedQuery.length < 10) {
    return {
      isValid: false,
      category: "too_vague",
      suggestion: `입력이 너무 모호합니다. 예시: "${SUGGESTION_EXAMPLES[Math.floor(Math.random() * SUGGESTION_EXAMPLES.length)]}"`,
    };
  }

  // 8. 기술 키워드가 전혀 없고 짧은 입력 (일반적인 대화로 추정)
  if (!hasTechKeyword && trimmedQuery.length < 20) {
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
