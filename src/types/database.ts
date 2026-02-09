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
          nickname: string | null;
          avatar_url: string | null;
          has_seen_teamspace_intro: boolean;
          last_selected_team_space_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          nickname?: string | null;
          avatar_url?: string | null;
          has_seen_teamspace_intro?: boolean;
          last_selected_team_space_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          nickname?: string | null;
          avatar_url?: string | null;
          has_seen_teamspace_intro?: boolean;
          last_selected_team_space_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_last_selected_team_space_id_fkey";
            columns: ["last_selected_team_space_id"];
            isOneToOne: false;
            referencedRelation: "team_spaces";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [];
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
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
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
          is_trending: boolean;
          trend_topic: string | null;
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
          is_trending?: boolean;
          trend_topic?: string | null;
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
          is_trending?: boolean;
          trend_topic?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "questions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "questions_subcategory_id_fkey";
            columns: ["subcategory_id"];
            isOneToOne: false;
            referencedRelation: "subcategories";
            referencedColumns: ["id"];
          },
        ];
      };
      interview_sessions: {
        Row: {
          id: string;
          user_id: string;
          query: string;
          total_time: number;
          is_completed: boolean;
          interview_type_id: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          query: string;
          total_time?: number;
          is_completed?: boolean;
          interview_type_id?: string | null;
          created_at?: string;
        };
        Update: {
          query?: string;
          total_time?: number;
          is_completed?: boolean;
          interview_type_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "interview_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interview_sessions_interview_type_id_fkey";
            columns: ["interview_type_id"];
            isOneToOne: false;
            referencedRelation: "interview_types";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: "session_questions_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "interview_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_questions_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: "answers_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "interview_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "answers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: "favorites_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favorites_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
        ];
      };
      interview_types: {
        Row: {
          id: string;
          code: string;
          name: string;
          display_name: string;
          description: string | null;
          icon: string | null;
          color: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          display_name: string;
          description?: string | null;
          icon?: string | null;
          color?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          code?: string;
          name?: string;
          display_name?: string;
          description?: string | null;
          icon?: string | null;
          color?: string | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      answer_feedback: {
        Row: {
          id: string;
          answer_id: string;
          keywords: string[];
          quick_score: number | null;
          summary: string | null;
          strengths: string[];
          improvements: string[];
          follow_up_questions: string[];
          detailed_feedback: string | null;
          pre_gen_model: string;
          detail_model: string | null;
          pre_gen_tokens: number | null;
          detail_tokens: number | null;
          created_at: string;
          detail_generated_at: string | null;
          // Keyword analysis columns
          expected_keywords: string[];
          mentioned_keywords: string[];
          missing_keywords: string[];
          // Model answer columns
          model_answer: string | null;
          model_answer_key_points: string[];
          model_answer_code_example: string | null;
          model_answer_model: string | null;
          model_answer_tokens: number | null;
          model_answer_generated_at: string | null;
        };
        Insert: {
          id?: string;
          answer_id: string;
          keywords?: string[];
          quick_score?: number | null;
          summary?: string | null;
          strengths?: string[];
          improvements?: string[];
          follow_up_questions?: string[];
          detailed_feedback?: string | null;
          pre_gen_model?: string;
          detail_model?: string | null;
          pre_gen_tokens?: number | null;
          detail_tokens?: number | null;
          created_at?: string;
          detail_generated_at?: string | null;
          // Keyword analysis columns
          expected_keywords?: string[];
          mentioned_keywords?: string[];
          missing_keywords?: string[];
          // Model answer columns
          model_answer?: string | null;
          model_answer_key_points?: string[];
          model_answer_code_example?: string | null;
          model_answer_model?: string | null;
          model_answer_tokens?: number | null;
          model_answer_generated_at?: string | null;
        };
        Update: {
          keywords?: string[];
          quick_score?: number | null;
          summary?: string | null;
          strengths?: string[];
          improvements?: string[];
          follow_up_questions?: string[];
          detailed_feedback?: string | null;
          detail_model?: string | null;
          detail_tokens?: number | null;
          detail_generated_at?: string | null;
          // Keyword analysis columns
          expected_keywords?: string[];
          mentioned_keywords?: string[];
          missing_keywords?: string[];
          // Model answer columns
          model_answer?: string | null;
          model_answer_key_points?: string[];
          model_answer_code_example?: string | null;
          model_answer_model?: string | null;
          model_answer_tokens?: number | null;
          model_answer_generated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "answer_feedback_answer_id_fkey";
            columns: ["answer_id"];
            isOneToOne: true;
            referencedRelation: "answers";
            referencedColumns: ["id"];
          },
        ];
      };
      team_spaces: {
        Row: {
          id: string;
          name: string;
          avatar_url: string | null;
          password_hash: string | null;
          invite_code: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          avatar_url?: string | null;
          password_hash?: string | null;
          invite_code?: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          avatar_url?: string | null;
          password_hash?: string | null;
          invite_code?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_spaces_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      team_space_members: {
        Row: {
          id: string;
          team_space_id: string;
          user_id: string;
          role: "owner" | "member";
          joined_at: string;
        };
        Insert: {
          id?: string;
          team_space_id: string;
          user_id: string;
          role?: "owner" | "member";
          joined_at?: string;
        };
        Update: {
          role?: "owner" | "member";
        };
        Relationships: [
          {
            foreignKeyName: "team_space_members_team_space_id_fkey";
            columns: ["team_space_id"];
            isOneToOne: false;
            referencedRelation: "team_spaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_space_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      team_space_sessions: {
        Row: {
          id: string;
          team_space_id: string;
          session_id: string;
          shared_by: string;
          shared_at: string;
          week_number: number | null;
        };
        Insert: {
          id?: string;
          team_space_id: string;
          session_id: string;
          shared_by: string;
          shared_at?: string;
          week_number?: number | null;
        };
        Update: {
          week_number?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "team_space_sessions_team_space_id_fkey";
            columns: ["team_space_id"];
            isOneToOne: false;
            referencedRelation: "team_spaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_space_sessions_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "interview_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_space_sessions_shared_by_fkey";
            columns: ["shared_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      team_space_favorites: {
        Row: {
          id: string;
          team_space_id: string;
          favorite_id: string;
          shared_by: string;
          shared_at: string;
        };
        Insert: {
          id?: string;
          team_space_id: string;
          favorite_id: string;
          shared_by: string;
          shared_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "team_space_favorites_team_space_id_fkey";
            columns: ["team_space_id"];
            isOneToOne: false;
            referencedRelation: "team_spaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_space_favorites_favorite_id_fkey";
            columns: ["favorite_id"];
            isOneToOne: false;
            referencedRelation: "favorites";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_space_favorites_shared_by_fkey";
            columns: ["shared_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      question_generation_history: {
        Row: {
          id: string;
          user_id: string;
          question_content: string;
          question_fingerprint: string;
          reference_fingerprint: string | null;
          interview_type_id: string | null;
          session_id: string | null;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          question_content: string;
          question_fingerprint: string;
          reference_fingerprint?: string | null;
          interview_type_id?: string | null;
          session_id?: string | null;
          created_at?: string;
          expires_at?: string;
        };
        Update: {
          expires_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "question_generation_history_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "question_generation_history_interview_type_id_fkey";
            columns: ["interview_type_id"];
            isOneToOne: false;
            referencedRelation: "interview_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "question_generation_history_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "interview_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
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
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Convenience types
export type User = Database["public"]["Tables"]["users"]["Row"];
export type UserInsert = Database["public"]["Tables"]["users"]["Insert"];

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

export type AnswerFeedback =
  Database["public"]["Tables"]["answer_feedback"]["Row"];
export type AnswerFeedbackInsert =
  Database["public"]["Tables"]["answer_feedback"]["Insert"];
export type AnswerFeedbackUpdate =
  Database["public"]["Tables"]["answer_feedback"]["Update"];

export type InterviewType =
  Database["public"]["Tables"]["interview_types"]["Row"];
export type InterviewTypeInsert =
  Database["public"]["Tables"]["interview_types"]["Insert"];

export type QuestionGenerationHistory =
  Database["public"]["Tables"]["question_generation_history"]["Row"];
export type QuestionGenerationHistoryInsert =
  Database["public"]["Tables"]["question_generation_history"]["Insert"];

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
