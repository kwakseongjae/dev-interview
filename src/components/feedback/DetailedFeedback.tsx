"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FollowUpQuestions } from "./FollowUpQuestions";
import { StrengthsImprovements } from "./StrengthsImprovements";
import type { DetailedFeedbackData } from "@/types/interview";

interface DetailedFeedbackProps {
  feedback: DetailedFeedbackData | null;
  hasDetailedFeedback: boolean;
  onRequestDetail?: () => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

/**
 * DetailedFeedback - Container for detailed feedback components
 * Shows strengths/improvements, follow-up questions, and overall feedback
 * Includes "Request detailed analysis" button if not yet generated
 */
export function DetailedFeedback({
  feedback,
  hasDetailedFeedback,
  onRequestDetail,
  isLoading = false,
  className,
}: DetailedFeedbackProps) {
  const [error, setError] = useState<string | null>(null);

  const handleRequestDetail = async () => {
    if (!onRequestDetail) return;

    setError(null);
    try {
      await onRequestDetail();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "상세 분석 요청에 실패했습니다",
      );
    }
  };

  // Not yet generated - show request button
  if (!hasDetailedFeedback) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex flex-col items-start gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRequestDetail}
            disabled={isLoading || !onRequestDetail}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <LoadingSpinner />
                분석 중...
              </>
            ) : (
              <>
                <SparklesIcon />
                상세 분석 요청
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            강점, 개선점, 꼬리질문을 AI가 분석합니다
          </p>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  // Show detailed feedback
  if (!feedback) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Strengths and Improvements */}
      <StrengthsImprovements
        strengths={feedback.strengths}
        improvements={feedback.improvements}
      />

      {/* Follow-up Questions */}
      <FollowUpQuestions questions={feedback.followUpQuestions} />

      {/* Detailed Feedback Text */}
      {feedback.detailedFeedback && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">종합 피드백</h4>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {feedback.detailedFeedback}
          </p>
        </div>
      )}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
      />
    </svg>
  );
}

export default DetailedFeedback;
