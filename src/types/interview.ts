/**
 * Interview-related type definitions
 * Based on PRD.md data structure specification
 */

export interface Question {
  id: string;
  content: string;
  hint: string;
  category: string;
  answer: string;
  timeSpent: number;
  isAnswered: boolean;
  isFavorite: boolean;
  isReferenceBased?: boolean; // 레퍼런스 기반 질문 여부
}

export interface InterviewSession {
  id: string;
  createdAt: string;
  query: string;
  questions: Question[];
  totalTime: number;
  isCompleted: boolean;
  user_id?: string; // 소유자 ID (삭제 권한 확인용)
  sharedBy?: {
    id: string;
    username: string;
    nickname: string | null;
  };
}

export interface GenerateQuestionsRequest {
  prompt: string;
}

export interface GenerateQuestionsResponse {
  questions: {
    content: string;
    hint: string;
    category: string;
  }[];
}

export interface FavoriteQuestion {
  id: string;
  questionId: string;
  content: string;
  hint: string;
  category: string;
  savedAt: string;
}

export type InterviewStep =
  | "idle"
  | "searching"
  | "questions"
  | "interview"
  | "complete";

export interface SearchProgress {
  step: number;
  label: string;
  completed: boolean;
}
