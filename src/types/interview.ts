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
}

export interface InterviewSession {
  id: string;
  createdAt: string;
  query: string;
  questions: Question[];
  totalTime: number;
  isCompleted: boolean;
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

export type InterviewStep = 'idle' | 'searching' | 'questions' | 'interview' | 'complete';

export interface SearchProgress {
  step: number;
  label: string;
  completed: boolean;
}
