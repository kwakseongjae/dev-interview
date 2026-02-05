"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Lightbulb, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { KeywordAnalysis } from "./KeywordAnalysis";
import { StrengthsImprovements } from "./StrengthsImprovements";
import { FollowUpQuestions } from "./FollowUpQuestions";
import { FeedbackSkeleton } from "./FeedbackSkeleton";
import { ModelAnswerSkeleton } from "./ModelAnswerSkeleton";
import { FormattedText } from "./FormattedText";
import { Badge } from "@/components/ui/badge";
import { Code2 } from "lucide-react";
import type {
  FeedbackData,
  KeywordAnalysis as KeywordAnalysisType,
} from "@/types/interview";
import {
  getFeedbackApi,
  generateFullFeedbackApi,
  generateModelAnswerApi,
  type ApiFeedbackData,
  type ApiModelAnswerData,
} from "@/lib/api";

interface AIAnalysisSectionProps {
  answerId: string;
  hasAnswer: boolean;
  className?: string;
}

type ActiveSection = "none" | "feedback" | "modelAnswer";

/**
 * AIAnalysisSection - 피드백과 모범 답변을 나란히 버튼으로 제공
 * 두 기능 모두 즉시 발견 가능하고 독립적으로 열 수 있음
 */
export function AIAnalysisSection({
  answerId,
  hasAnswer,
  className,
}: AIAnalysisSectionProps) {
  // 각 섹션의 열림 상태 (독립적)
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [modelAnswerOpen, setModelAnswerOpen] = useState(false);

  // 피드백 상태
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [feedbackLoaded, setFeedbackLoaded] = useState(false);

  // 모범 답변 상태
  const [modelAnswerLoading, setModelAnswerLoading] = useState(false);
  const [modelAnswer, setModelAnswer] = useState<ApiModelAnswerData | null>(
    null,
  );
  const [modelAnswerLoaded, setModelAnswerLoaded] = useState(false);
  const [modelAnswerError, setModelAnswerError] = useState<string | null>(null);

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

  // 피드백 로드
  const loadFeedback = useCallback(async () => {
    if (feedbackLoaded) return;

    setFeedbackLoading(true);
    try {
      const { feedback: existing } = await getFeedbackApi(answerId);

      if (existing && existing.hasDetailedFeedback) {
        setFeedback(convertApiFeedback(existing));
      } else {
        const { feedback: generated } = await generateFullFeedbackApi(answerId);
        setFeedback(convertApiFeedback(generated));
      }
    } catch (error) {
      console.error("피드백 로드 실패:", error);
    } finally {
      setFeedbackLoading(false);
      setFeedbackLoaded(true);
    }
  }, [answerId, feedbackLoaded, convertApiFeedback]);

  // 모범 답변 로드
  const loadModelAnswer = useCallback(async () => {
    if (modelAnswerLoaded) return;

    setModelAnswerLoading(true);
    setModelAnswerError(null);
    try {
      const { modelAnswer: data } = await generateModelAnswerApi(answerId);
      setModelAnswer(data);
    } catch (error) {
      console.error("모범 답변 로드 실패:", error);
      setModelAnswerError("모범 답변을 불러올 수 없습니다.");
    } finally {
      setModelAnswerLoading(false);
      setModelAnswerLoaded(true);
    }
  }, [answerId, modelAnswerLoaded]);

  // 피드백 토글
  const handleToggleFeedback = useCallback(() => {
    if (!feedbackOpen && !feedbackLoaded) {
      loadFeedback();
    }
    setFeedbackOpen((prev) => !prev);
  }, [feedbackOpen, feedbackLoaded, loadFeedback]);

  // 모범 답변 토글
  const handleToggleModelAnswer = useCallback(() => {
    if (!modelAnswerOpen && !modelAnswerLoaded) {
      loadModelAnswer();
    }
    setModelAnswerOpen((prev) => !prev);
  }, [modelAnswerOpen, modelAnswerLoaded, loadModelAnswer]);

  if (!hasAnswer) {
    return null;
  }

  // 키워드 분석 추출
  const keywordAnalysis: KeywordAnalysisType | null = feedback?.keywordAnalysis
    ? {
        expected: feedback.keywordAnalysis.expected ?? [],
        mentioned: feedback.keywordAnalysis.mentioned ?? [],
        missing: feedback.keywordAnalysis.missing ?? [],
      }
    : null;

  return (
    <div className={cn("border-t pt-4", className)}>
      {/* 버튼 그룹 - 나란히 배치 */}
      <div className="flex flex-wrap items-center gap-2">
        {/* AI 피드백 버튼 */}
        <button
          onClick={handleToggleFeedback}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            feedbackOpen
              ? "bg-navy text-white"
              : "bg-muted hover:bg-muted/80 text-foreground",
          )}
        >
          {feedbackLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <MessageSquare className="w-4 h-4" />
          )}
          <span>AI 피드백</span>
          {feedback && !feedbackLoading && (
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-xs font-medium",
                feedbackOpen
                  ? "bg-white/20 text-white"
                  : feedback.score >= 4
                    ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                    : feedback.score === 3
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                      : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
              )}
            >
              {feedback.score}점
            </span>
          )}
        </button>

        {/* 모범 답변 버튼 */}
        <button
          onClick={handleToggleModelAnswer}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            modelAnswerOpen
              ? "bg-gold text-white"
              : "bg-muted hover:bg-muted/80 text-foreground",
          )}
        >
          {modelAnswerLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Lightbulb className="w-4 h-4" />
          )}
          <span>모범 답변</span>
        </button>
      </div>

      {/* 피드백 콘텐츠 */}
      <AnimatePresence initial={false}>
        {feedbackOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-lg border-l-4 border-navy bg-navy/5 p-4">
              {/* 섹션 헤더 */}
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-navy/20">
                <MessageSquare className="w-4 h-4 text-navy" />
                <h3 className="font-medium text-navy">AI 피드백</h3>
              </div>

              {feedbackLoading ? (
                <FeedbackSkeleton />
              ) : feedback ? (
                <div className="space-y-4">
                  {/* Score + Summary */}
                  <ScoreSummary
                    score={feedback.score}
                    summary={feedback.summary}
                  />

                  {/* Keyword Analysis */}
                  {keywordAnalysis && (
                    <KeywordAnalysis
                      analysis={keywordAnalysis}
                      className="border-t border-navy/10 pt-4"
                    />
                  )}

                  {/* Strengths and Improvements */}
                  <StrengthsImprovements
                    strengths={feedback.strengths ?? []}
                    improvements={feedback.improvements ?? []}
                    className="border-t border-navy/10 pt-4"
                  />

                  {/* Follow-up Questions */}
                  <FollowUpQuestions
                    questions={feedback.followUpQuestions ?? []}
                    className="border-t border-navy/10 pt-4"
                  />

                  {/* Detailed Feedback Text */}
                  {feedback.detailedFeedback && (
                    <div className="space-y-2 border-t border-navy/10 pt-4">
                      <h4 className="text-sm font-medium text-foreground">
                        종합 피드백
                      </h4>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        <FormattedText
                          text={feedback.detailedFeedback}
                          highlightClassName="font-semibold text-navy dark:text-navy-light bg-navy/10 dark:bg-navy/20 px-1 rounded"
                        />
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  피드백을 불러올 수 없습니다.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 모범 답변 콘텐츠 */}
      <AnimatePresence initial={false}>
        {modelAnswerOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-lg border-l-4 border-gold bg-gold/5 p-4">
              {/* 섹션 헤더 */}
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gold/20">
                <Lightbulb className="w-4 h-4 text-gold" />
                <h3 className="font-medium text-gold">모범 답변</h3>
              </div>

              {modelAnswerLoading ? (
                <ModelAnswerSkeleton />
              ) : modelAnswerError ? (
                <p className="text-sm text-destructive">{modelAnswerError}</p>
              ) : modelAnswer ? (
                <div className="space-y-4">
                  {/* Model Answer Text */}
                  <div className="space-y-2">
                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                      <FormattedText
                        text={modelAnswer.modelAnswer}
                        highlightClassName="font-semibold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/40 px-1 rounded"
                      />
                    </p>
                  </div>

                  {/* Key Points */}
                  {modelAnswer.keyPoints &&
                    modelAnswer.keyPoints.length > 0 && (
                      <div className="space-y-2 border-t border-gold/10 pt-4">
                        <h4 className="text-sm font-medium text-foreground">
                          핵심 포인트
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {modelAnswer.keyPoints.map((point, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/30 dark:text-amber-100 dark:border-amber-700"
                            >
                              {point}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Code Example */}
                  {modelAnswer.codeExample && (
                    <div className="space-y-2 border-t border-gold/10 pt-4">
                      <h4 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <Code2 className="h-4 w-4" />
                        코드 예시
                      </h4>
                      <pre className="bg-muted/50 rounded-lg p-4 text-sm overflow-x-auto">
                        <code className="text-foreground">
                          {modelAnswer.codeExample}
                        </code>
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  모범 답변을 불러올 수 없습니다.
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

export default AIAnalysisSection;
