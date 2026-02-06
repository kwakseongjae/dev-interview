/**
 * Case Study related type definitions
 * Tech blog/conference-based interview feature
 */

// 케이스 스터디 구조화 요약
export interface CaseStudySummary {
  background: string;
  challenge: string;
  solution: string;
  results: string;
  keyTakeaways: string[];
}

// 케이스 스터디
export interface CaseStudy {
  id: string;
  title: string;
  slug: string;
  companyName: string;
  companyLogoUrl: string | null;
  companySlug: string;
  sourceUrl: string;
  sourceType: "blog" | "conference" | "paper";
  sourceLanguage: "ko" | "en";
  publishedAt: string | null;
  summary: CaseStudySummary;
  domains: string[];
  technologies: string[];
  difficulty: "A" | "B" | "C";
  seedQuestions: { content: string; hint: string; category: string }[];
  viewCount: number;
  interviewCount: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
}

// 케이스 스터디 목록 아이템 (최소 필드)
export interface CaseStudyListItem {
  id: string;
  title: string;
  slug: string;
  companyName: string;
  companySlug: string;
  sourceType: "blog" | "conference" | "paper";
  publishedAt: string | null;
  domains: string[];
  technologies: string[];
  difficulty: "A" | "B" | "C";
  viewCount: number;
  interviewCount: number;
  isFavorite?: boolean;
}

// 필터 옵션
export interface CaseStudyFilters {
  companies: string[];
  domains: string[];
  difficulty: string[];
  sourceType: string[];
  search: string;
  sort: "recent" | "popular" | "difficulty";
}

// 난이도 표시 매핑
export const DIFFICULTY_CONFIG = {
  A: {
    label: "A레벨",
    description: "기본",
    color: "text-green-600 bg-green-50 border-green-200",
  },
  B: {
    label: "B레벨",
    description: "심화",
    color: "text-yellow-600 bg-yellow-50 border-yellow-200",
  },
  C: {
    label: "C레벨",
    description: "고난도",
    color: "text-red-600 bg-red-50 border-red-200",
  },
} as const;

// 소스 타입 매핑
export const SOURCE_TYPE_CONFIG = {
  blog: { label: "블로그", icon: "FileText" },
  conference: { label: "컨퍼런스", icon: "Video" },
  paper: { label: "논문", icon: "GraduationCap" },
} as const;
