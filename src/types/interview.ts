/**
 * Interview-related type definitions
 * Based on PRD.md data structure specification
 */

// Interview Type (면접 범주) types
export type InterviewTypeCode = "CS" | "PROJECT" | "SYSTEM_DESIGN";

export interface InterviewTypeInfo {
  id: string;
  code: string; // 'CS' | 'PROJECT' | 'SYSTEM_DESIGN' but stored as string from API
  name: string;
  displayName: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
}

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
  interviewType?: InterviewTypeInfo | null; // 면접 범주
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

// AI Feedback Types
export interface QuickFeedbackData {
  keywords: string[];
  score: number; // 1-5
  summary: string;
}

export interface DetailedFeedbackData {
  strengths: string[];
  improvements: string[];
  followUpQuestions: string[];
  detailedFeedback: string;
}

export interface FeedbackData extends QuickFeedbackData {
  strengths?: string[];
  improvements?: string[];
  followUpQuestions?: string[];
  detailedFeedback?: string;
  hasDetailedFeedback: boolean;
  keywordAnalysis?: KeywordAnalysis;
}

// Enhanced keyword analysis for better UX
export interface KeywordAnalysis {
  expected: string[]; // Keywords the interviewer expects
  mentioned: string[]; // Keywords the user actually used
  missing: string[]; // Expected keywords not mentioned
}

// Full feedback data (one-click complete analysis)
export interface FullFeedbackData {
  keywordAnalysis: KeywordAnalysis;
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  followUpQuestions: string[];
  detailedFeedback: string;
}

export interface QuestionWithFeedback extends Question {
  feedback?: FeedbackData | null;
}

// Model Answer Types
export interface ModelAnswerData {
  modelAnswer: string;
  keyPoints: string[];
  codeExample?: string | null;
}

export interface FeedbackWithModelAnswer extends FeedbackData {
  modelAnswer?: ModelAnswerData | null;
  hasModelAnswer: boolean;
}
