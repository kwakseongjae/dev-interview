/**
 * Dummy question data for demo mode
 * Separated for easy replacement with real API data
 */

import type { Question } from "@/types/interview";
import { v4 as uuidv4 } from "uuid";

export interface QuestionTemplate {
  content: string;
  hint: string;
  category: string;
}

// Frontend 3년차 기본 질문 세트
export const FRONTEND_3YEARS_QUESTIONS: QuestionTemplate[] = [
  {
    content:
      "React의 Virtual DOM 동작 원리와 실제 DOM과의 차이점을 설명해주세요.",
    hint: "Reconciliation, Diffing Algorithm, Batch Update 키워드를 활용해보세요.",
    category: "React",
  },
  {
    content:
      "상태관리 라이브러리(Redux, Recoil, Zustand 등)를 비교하고 선택 기준을 말씀해주세요.",
    hint: "Flux 패턴, Atomic 상태, 보일러플레이트, 러닝커브를 비교해보세요.",
    category: "State Management",
  },
  {
    content: "웹 성능 최적화를 위해 적용해본 기법들을 설명해주세요.",
    hint: "Code Splitting, Lazy Loading, 이미지 최적화, 번들 사이즈 분석을 언급해보세요.",
    category: "Performance",
  },
  {
    content: "TypeScript의 주요 타입 시스템과 실무 활용 경험을 말씀해주세요.",
    hint: "Generic, Union/Intersection, Type Guard, Utility Types를 설명해보세요.",
    category: "TypeScript",
  },
  {
    content: "프론트엔드 테스트 전략과 경험에 대해 설명해주세요.",
    hint: "Unit Test, Integration Test, E2E Test, Testing Library 활용법을 말씀해보세요.",
    category: "Testing",
  },
];

// Backend 3년차 질문 세트
export const BACKEND_3YEARS_QUESTIONS: QuestionTemplate[] = [
  {
    content: "RESTful API 설계 원칙과 실제 프로젝트 적용 경험을 말씀해주세요.",
    hint: "HTTP 메서드, 상태 코드, 리소스 네이밍, HATEOAS를 포함해보세요.",
    category: "API Design",
  },
  {
    content: "데이터베이스 인덱싱 전략과 쿼리 최적화 경험을 설명해주세요.",
    hint: "B-Tree, 복합 인덱스, 실행 계획 분석, N+1 문제를 언급해보세요.",
    category: "Database",
  },
  {
    content: "마이크로서비스 아키텍처의 장단점과 적용 경험을 말씀해주세요.",
    hint: "서비스 분리 기준, 통신 방식, 데이터 일관성, 모니터링을 설명해보세요.",
    category: "Architecture",
  },
  {
    content: "인증/인가 구현 방식과 보안 고려사항을 설명해주세요.",
    hint: "JWT, OAuth2.0, Session, RBAC, CORS 정책을 포함해보세요.",
    category: "Security",
  },
  {
    content: "캐싱 전략과 실제 적용 사례를 설명해주세요.",
    hint: "Redis, CDN, 브라우저 캐시, 캐시 무효화 전략을 언급해보세요.",
    category: "Caching",
  },
];

// CS 기본 질문 세트
export const CS_FUNDAMENTALS_QUESTIONS: QuestionTemplate[] = [
  {
    content: "프로세스와 스레드의 차이점을 설명해주세요.",
    hint: "메모리 공유, 컨텍스트 스위칭, 동기화 문제를 포함해보세요.",
    category: "OS",
  },
  {
    content: "HTTP/HTTPS의 동작 방식과 차이점을 설명해주세요.",
    hint: "TCP 3-way handshake, TLS/SSL, 인증서를 언급해보세요.",
    category: "Network",
  },
  {
    content: "시간 복잡도와 공간 복잡도에 대해 설명해주세요.",
    hint: "Big-O 표기법, 최선/평균/최악 케이스, 트레이드오프를 설명해보세요.",
    category: "Algorithm",
  },
  {
    content: "객체지향 프로그래밍의 4가지 특성을 설명해주세요.",
    hint: "캡슐화, 상속, 다형성, 추상화의 개념과 실제 예시를 들어보세요.",
    category: "OOP",
  },
  {
    content: "SQL과 NoSQL의 차이점과 선택 기준을 설명해주세요.",
    hint: "ACID, 스키마, 확장성, 사용 사례별 적합성을 비교해보세요.",
    category: "Database",
  },
];

// 질문 선택 로직 (키워드 기반)
export function selectQuestionsByQuery(query: string): QuestionTemplate[] {
  const lowerQuery = query.toLowerCase();

  if (
    lowerQuery.includes("프론트엔드") ||
    lowerQuery.includes("frontend") ||
    lowerQuery.includes("react") ||
    lowerQuery.includes("vue") ||
    lowerQuery.includes("javascript") ||
    lowerQuery.includes("타입스크립트")
  ) {
    return FRONTEND_3YEARS_QUESTIONS;
  }

  if (
    lowerQuery.includes("백엔드") ||
    lowerQuery.includes("backend") ||
    lowerQuery.includes("서버") ||
    lowerQuery.includes("api") ||
    lowerQuery.includes("java") ||
    lowerQuery.includes("python") ||
    lowerQuery.includes("node")
  ) {
    return BACKEND_3YEARS_QUESTIONS;
  }

  if (
    lowerQuery.includes("cs") ||
    lowerQuery.includes("기초") ||
    lowerQuery.includes("알고리즘") ||
    lowerQuery.includes("자료구조") ||
    lowerQuery.includes("신입")
  ) {
    return CS_FUNDAMENTALS_QUESTIONS;
  }

  // 기본값: 프론트엔드 질문
  return FRONTEND_3YEARS_QUESTIONS;
}

// QuestionTemplate을 Question으로 변환
export function createQuestionsFromTemplates(
  templates: QuestionTemplate[],
): Question[] {
  return templates.map((template) => ({
    id: uuidv4(),
    content: template.content,
    hint: template.hint,
    category: template.category,
    answer: "",
    timeSpent: 0,
    isAnswered: false,
    isFavorite: false,
  }));
}

// 검색 진행 단계
export const SEARCH_STEPS = [
  { step: 1, label: "검색어를 분석하고 있어요" },
  { step: 2, label: "관련 기술 스택을 파악하고 있어요" },
  { step: 3, label: "면접 출제 경향을 확인하고 있어요" },
  { step: 4, label: "난이도를 조정하고 있어요" },
  { step: 5, label: "핵심 질문을 선별하고 있어요" },
  { step: 6, label: "힌트를 생성하고 있어요" },
];
