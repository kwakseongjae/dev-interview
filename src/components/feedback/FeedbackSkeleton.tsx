"use client";

import { cn } from "@/lib/utils";

interface FeedbackSkeletonProps {
  className?: string;
  showDetailed?: boolean;
}

/**
 * FeedbackSkeleton - Loading placeholder for feedback components
 * Matches the structure of QuickFeedback and DetailedFeedback
 */
export function FeedbackSkeleton({
  className,
  showDetailed = false,
}: FeedbackSkeletonProps) {
  return (
    <div className={cn("animate-pulse space-y-3", className)}>
      {/* Keywords skeleton */}
      <div className="flex flex-wrap gap-1.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-5 w-16 rounded-md bg-muted"
            style={{ width: `${40 + i * 12}px` }}
          />
        ))}
      </div>

      {/* Score + Summary skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-7 w-16 rounded-md bg-muted" />
        <div className="h-4 flex-1 max-w-[200px] rounded bg-muted" />
      </div>

      {/* Detailed feedback skeleton */}
      {showDetailed && (
        <div className="mt-4 space-y-4 border-t pt-4">
          {/* Strengths */}
          <div className="space-y-2">
            <div className="h-4 w-20 rounded bg-muted" />
            <div className="space-y-1.5">
              <div className="h-3 w-full max-w-[280px] rounded bg-muted" />
              <div className="h-3 w-full max-w-[240px] rounded bg-muted" />
            </div>
          </div>

          {/* Improvements */}
          <div className="space-y-2">
            <div className="h-4 w-20 rounded bg-muted" />
            <div className="space-y-1.5">
              <div className="h-3 w-full max-w-[260px] rounded bg-muted" />
              <div className="h-3 w-full max-w-[220px] rounded bg-muted" />
            </div>
          </div>

          {/* Follow-up questions */}
          <div className="space-y-2">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="space-y-1.5">
              <div className="h-3 w-full max-w-[300px] rounded bg-muted" />
              <div className="h-3 w-full max-w-[280px] rounded bg-muted" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeedbackSkeleton;
