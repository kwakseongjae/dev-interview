"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { KeywordAnalysis as KeywordAnalysisType } from "@/types/interview";

interface KeywordAnalysisProps {
  analysis: KeywordAnalysisType;
  className?: string;
}

/**
 * KeywordAnalysis - Displays keywords categorized by expected, mentioned, and missing
 * Shows which keywords the interviewer expects, which the user mentioned, and which were missed
 */
export function KeywordAnalysis({ analysis, className }: KeywordAnalysisProps) {
  const { expected, mentioned, missing } = analysis;

  // No content to display
  if (expected.length === 0 && mentioned.length === 0 && missing.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Section Header */}
      <h4 className="text-sm font-medium text-foreground flex items-center gap-1.5">
        <KeyIcon />
        키워드 분석
      </h4>

      {/* Keyword Categories */}
      <div className="space-y-2.5">
        {/* Expected Keywords */}
        {expected.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                면접관이 기대하는 키워드
              </span>
              <span className="text-xs text-muted-foreground/60">
                ({expected.length}개)
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {expected.map((keyword, index) => {
                const isMentioned = mentioned.includes(keyword);
                return (
                  <Badge
                    key={index}
                    variant="outline"
                    className={cn(
                      "text-xs font-normal transition-colors",
                      isMentioned
                        ? "border-green-400 bg-green-100 text-green-900 dark:border-green-600 dark:bg-green-900/40 dark:text-green-100"
                        : "border-muted-foreground/40 bg-muted/50 text-muted-foreground",
                    )}
                  >
                    {isMentioned && <CheckIcon className="mr-1 h-3 w-3" />}
                    {keyword}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Mentioned Keywords (not in expected) */}
        {mentioned.filter((k) => !expected.includes(k)).length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-green-600 dark:text-green-400">
                추가로 언급한 키워드
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {mentioned
                .filter((k) => !expected.includes(k))
                .map((keyword, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="text-xs font-normal bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-100"
                  >
                    <PlusIcon className="mr-1 h-3 w-3" />
                    {keyword}
                  </Badge>
                ))}
            </div>
          </div>
        )}

        {/* Missing Keywords */}
        {missing.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                보완하면 좋을 키워드
              </span>
              <span className="text-xs text-muted-foreground/60">
                ({missing.length}개)
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {missing.map((keyword, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs font-normal border-amber-400 bg-amber-100 text-amber-900 dark:border-amber-600 dark:bg-amber-900/40 dark:text-amber-100"
                >
                  <MissingIcon className="mr-1 h-3 w-3" />
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KeyIcon() {
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
        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function MissingIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

export default KeywordAnalysis;
