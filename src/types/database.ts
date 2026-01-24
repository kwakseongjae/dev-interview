/**
 * Supabase Database Type Definitions
 * Based on api-tasks.md schema
 */

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          nickname: string | null;
          avatar_url: string | null;
          has_seen_teamspace_intro: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          password_hash: string;
          nickname?: string | null;
          avatar_url?: string | null;
          has_seen_teamspace_intro?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          password_hash?: string;
          nickname?: string | null;
          avatar_url?: string | null;
          has_seen_teamspace_intro?: boolean;
          updated_at?: string;
        };
      };
      refresh_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          expires_at: string;
          created_at: string;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          expires_at: string;
          created_at?: string;
          revoked_at?: string | null;
        };
        Update: {
          revoked_at?: string | null;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          description: string | null;
          icon: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          display_name: string;
          description?: string | null;
          icon?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          display_name?: string;
          description?: string | null;
          icon?: string | null;
          sort_order?: number;
        };
      };
      subcategories: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          display_name: string;
          description: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          display_name: string;
          description?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          category_id?: string;
          name?: string;
          display_name?: string;
          description?: string | null;
          sort_order?: number;
        };
      };
      questions: {
        Row: {
          id: string;
          content: string;
          content_normalized: string;
          hint: string | null;
          category_id: string;
          subcategory_id: string | null;
          difficulty: "EASY" | "MEDIUM" | "HARD";
          embedding: number[] | null;
          favorite_count: number;
          is_verified: boolean;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          content: string;
          content_normalized: string;
          hint?: string | null;
          category_id: string;
          subcategory_id?: string | null;
          difficulty?: "EASY" | "MEDIUM" | "HARD";
          embedding?: number[] | null;
          favorite_count?: number;
          is_verified?: boolean;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          content?: string;
          content_normalized?: string;
          hint?: string | null;
          category_id?: string;
          subcategory_id?: string | null;
          difficulty?: "EASY" | "MEDIUM" | "HARD";
          embedding?: number[] | null;
          favorite_count?: number;
          is_verified?: boolean;
        };
      };
      interview_sessions: {
        Row: {
          id: string;
          user_id: string;
          query: string;
          total_time: number;
          is_completed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          query: string;
          total_time?: number;
          is_completed?: boolean;
          created_at?: string;
        };
        Update: {
          query?: string;
          total_time?: number;
          is_completed?: boolean;
        };
      };
      session_questions: {
        Row: {
          id: string;
          session_id: string;
          question_id: string;
          question_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          question_id: string;
          question_order: number;
          created_at?: string;
        };
        Update: {
          question_order?: number;
        };
      };
      answers: {
        Row: {
          id: string;
          session_id: string;
          question_id: string;
          user_id: string;
          content: string;
          time_spent: number;
          ai_score: number | null;
          ai_feedback: string | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          question_id: string;
          user_id: string;
          content: string;
          time_spent?: number;
          ai_score?: number | null;
          ai_feedback?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          time_spent?: number;
          ai_score?: number | null;
          ai_feedback?: string | null;
          is_public?: boolean;
          updated_at?: string;
        };
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          question_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          question_id: string;
          created_at?: string;
        };
        Update: Record<string, never>; // favorites는 업데이트하지 않음
      };
    };
    Functions: {
      search_similar_questions: {
        Args: {
          query_embedding: number[];
          similarity_threshold?: number;
          match_count?: number;
        };
        Returns: {
          id: string;
          content: string;
          hint: string | null;
          category: string;
          favorite_count: number;
          similarity: number;
        }[];
      };
    };
  };
}

// Convenience types
export type User = Database["public"]["Tables"]["users"]["Row"];
export type UserInsert = Database["public"]["Tables"]["users"]["Insert"];
export type PublicUser = Omit<User, "password_hash">;

export type RefreshToken =
  Database["public"]["Tables"]["refresh_tokens"]["Row"];
export type RefreshTokenInsert =
  Database["public"]["Tables"]["refresh_tokens"]["Insert"];

export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Subcategory = Database["public"]["Tables"]["subcategories"]["Row"];

export type Question = Database["public"]["Tables"]["questions"]["Row"];
export type QuestionInsert =
  Database["public"]["Tables"]["questions"]["Insert"];

export type InterviewSession =
  Database["public"]["Tables"]["interview_sessions"]["Row"];
export type InterviewSessionInsert =
  Database["public"]["Tables"]["interview_sessions"]["Insert"];

export type SessionQuestion =
  Database["public"]["Tables"]["session_questions"]["Row"];
export type SessionQuestionInsert =
  Database["public"]["Tables"]["session_questions"]["Insert"];

export type Answer = Database["public"]["Tables"]["answers"]["Row"];
export type AnswerInsert = Database["public"]["Tables"]["answers"]["Insert"];

export type Favorite = Database["public"]["Tables"]["favorites"]["Row"];
export type FavoriteInsert =
  Database["public"]["Tables"]["favorites"]["Insert"];

// JWT Payload Types
export interface AccessTokenPayload {
  sub: string; // user_id
  email: string;
  iat: number;
  exp: number;
  type: "access";
}

export interface RefreshTokenPayload {
  sub: string; // user_id
  jti: string; // token id (DB의 refresh_tokens.id)
  iat: number;
  exp: number;
  type: "refresh";
}

// API Response Types
export interface AuthResponse {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

export interface TokenRefreshResponse {
  accessToken: string;
  refreshToken: string;
}

// Question with relations
export interface QuestionWithCategory extends Question {
  categories: Category;
  subcategories: Subcategory | null;
}

// Session with questions and answers
export interface SessionWithDetails extends InterviewSession {
  questions: (SessionQuestion & {
    questions: QuestionWithCategory;
    answers?: Answer[];
  })[];
}
