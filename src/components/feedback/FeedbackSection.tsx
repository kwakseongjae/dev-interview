"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { KeywordAnalysis } from "./KeywordAnalysis";
import { StrengthsImprovements } from "./StrengthsImprovements";
import { FollowUpQuestions } from "./FollowUpQuestions";
import { FeedbackSkeleton } from "./FeedbackSkeleton";
import type {
  FeedbackData,
  KeywordAnalysis as KeywordAnalysisType,
} from "@/types/interview";
import {
  getFeedbackApi,
  generateFullFeedbackApi,
  type ApiFeedbackData,
} from "@/lib/api";

interface FeedbackSectionProps {
  answerId: string;
  hasAnswer: boolean;
  className?: string;
}

/**
 * FeedbackSection - Main feedback container with expand/collapse
 * One-click to load complete feedback (keyword analysis, score, summary, strengths, improvements, followUpQuestions)
 */
export function FeedbackSection({
  answerId,
  hasAnswer,
  className,
}: FeedbackSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Convert API response to FeedbackData
  const convertApiFeedback = useCallback(
    (api: ApiFeedbackData): FeedbackData => ({
      keywords: api.keywords,
      score: api.score ?? 3,
      summary: api.summary ?? "",
      strengths: api.strengths,
      improvements: api.improvements,
      followUpQuestions: api.followUpQuestions,
      detailedFeedback: api.detailedFeedback ?? undefined,
      hasDetailedFeedback: api.hasDetailedFeedback,
      keywordAnalysis: api.keywordAnalysis,
    }),
    [],
  );

  // Load or generate full feedback (one-click)
  const loadFeedback = useCallback(async () => {
    if (!hasAnswer || hasLoaded) return;

    setIsLoading(true);
    try {
      // Try to get existing feedback first
      const { feedback: existing } = await getFeedbackApi(answerId);

      if (existing && existing.hasDetailedFeedback) {
        // Already have full feedback
        setFeedback(convertApiFeedback(existing));
      } else {
        // Generate full feedback in one call
        const { feedback: generated } = await generateFullFeedbackApi(answerId);
        setFeedback(convertApiFeedback(generated));
      }
    } catch (error) {
      console.error("피드백 로드 실패:", error);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [answerId, hasAnswer, hasLoaded, convertApiFeedback]);

  // Load feedback when section becomes visible
  const handleToggleExpand = useCallback(() => {
    if (!isExpanded && !hasLoaded) {
      loadFeedback();
    }
    setIsExpanded((prev) => !prev);
  }, [isExpanded, hasLoaded, loadFeedback]);

  // Don't show anything if no answer
  if (!hasAnswer) {
    return null;
  }

  // Extract keyword analysis
  const keywordAnalysis: KeywordAnalysisType | null = feedback?.keywordAnalysis
    ? {
        expected: feedback.keywordAnalysis.expected ?? [],
        mentioned: feedback.keywordAnalysis.mentioned ?? [],
        missing: feedback.keywordAnalysis.missing ?? [],
      }
    : null;

  return (
    <div className={cn("border-t pt-4", className)}>
      {/* Toggle Button */}
      <button
        onClick={handleToggleExpand}
        className="flex w-full items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-2 font-medium">
          <span className="text-base">AI 피드백</span>
          {feedback && !isLoading && (
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-xs font-medium",
                feedback.score >= 4
                  ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                  : feedback.score === 3
                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                    : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
              )}
            >
              {feedback.score}점
            </span>
          )}
        </span>
        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>

      {/* Expandable Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-4 space-y-4">
              {isLoading ? (
                <FeedbackSkeleton />
              ) : feedback ? (
                <>
                  {/* Score + Summary */}
                  <ScoreSummary
                    score={feedback.score}
                    summary={feedback.summary}
                  />

                  {/* Keyword Analysis */}
                  {keywordAnalysis && (
                    <KeywordAnalysis
                      analysis={keywordAnalysis}
                      className="border-t pt-4"
                    />
                  )}

                  {/* Strengths and Improvements */}
                  <StrengthsImprovements
                    strengths={feedback.strengths ?? []}
                    improvements={feedback.improvements ?? []}
                    className="border-t pt-4"
                  />

                  {/* Follow-up Questions */}
                  <FollowUpQuestions
                    questions={feedback.followUpQuestions ?? []}
                    className="border-t pt-4"
                  />

                  {/* Detailed Feedback Text */}
                  {feedback.detailedFeedback && (
                    <div className="space-y-2 border-t pt-4">
                      <h4 className="text-sm font-medium text-foreground">
                        종합 피드백
                      </h4>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {feedback.detailedFeedback}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  피드백을 불러올 수 없습니다.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * ScoreSummary - Displays score badge and summary text
 */
function ScoreSummary({ score, summary }: { score: number; summary: string }) {
  const scoreLabel = getScoreLabel(score);
  const scoreColorClass = getScoreColorClass(score);

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2 py-1",
          scoreColorClass,
        )}
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-current/10 text-xs font-bold">
          {score}
        </span>
        <span className="text-sm font-medium">{scoreLabel}</span>
      </div>
      {summary && <p className="text-sm text-muted-foreground">{summary}</p>}
    </div>
  );
}

function getScoreColorClass(score: number): string {
  if (score >= 4) {
    return "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300";
  }
  if (score === 3) {
    return "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300";
  }
  return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300";
}

function getScoreLabel(score: number): string {
  switch (score) {
    case 5:
      return "우수";
    case 4:
      return "양호";
    case 3:
      return "보통";
    case 2:
      return "부족";
    case 1:
      return "미흡";
    default:
      return "평가됨";
  }
}

export default FeedbackSection;
