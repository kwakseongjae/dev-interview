"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Lightbulb, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ModelAnswerSkeleton } from "./ModelAnswerSkeleton";
import { generateModelAnswerApi, type ApiModelAnswerData } from "@/lib/api";

interface ModelAnswerSectionProps {
  answerId: string;
  className?: string;
}

/**
 * ModelAnswerSection - Displays AI-generated exemplary answer
 * Lazy loads on user request, caches result
 */
export function ModelAnswerSection({
  answerId,
  className,
}: ModelAnswerSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [modelAnswer, setModelAnswer] = useState<ApiModelAnswerData | null>(
    null,
  );
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load model answer on first expand
  const loadModelAnswer = useCallback(async () => {
    if (hasLoaded) return;

    setIsLoading(true);
    setError(null);
    try {
      const { modelAnswer: data } = await generateModelAnswerApi(answerId);
      setModelAnswer(data);
    } catch (err) {
      console.error("모범 답변 로드 실패:", err);
      setError("모범 답변을 불러올 수 없습니다.");
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [answerId, hasLoaded]);

  // Toggle expand and load if needed
  const handleToggleExpand = useCallback(() => {
    if (!isExpanded && !hasLoaded) {
      loadModelAnswer();
    }
    setIsExpanded((prev) => !prev);
  }, [isExpanded, hasLoaded, loadModelAnswer]);

  return (
    <div className={cn("border-t pt-4", className)}>
      {/* Toggle Button */}
      <button
        onClick={handleToggleExpand}
        className="flex w-full items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-2 font-medium">
          <Lightbulb className="h-4 w-4 text-gold" />
          <span className="text-base">모범 답변 보기</span>
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
                <ModelAnswerSkeleton />
              ) : error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : modelAnswer ? (
                <>
                  {/* Model Answer Text */}
                  <div className="space-y-2">
                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                      {modelAnswer.modelAnswer}
                    </p>
                  </div>

                  {/* Key Points */}
                  {modelAnswer.keyPoints &&
                    modelAnswer.keyPoints.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                          핵심 포인트
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {modelAnswer.keyPoints.map((point, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="bg-gold/10 text-gold border-gold/20 dark:bg-gold/20 dark:text-gold dark:border-gold/30"
                            >
                              {point}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Code Example */}
                  {modelAnswer.codeExample && (
                    <div className="space-y-2">
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
                </>
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

export default ModelAnswerSection;
