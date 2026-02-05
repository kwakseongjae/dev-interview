"use client";

/**
 * ModelAnswerSkeleton - Loading skeleton for model answer section
 */
export function ModelAnswerSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {/* Model answer text skeleton */}
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-11/12 rounded bg-muted" />
        <div className="h-4 w-4/5 rounded bg-muted" />
      </div>

      {/* Key points skeleton */}
      <div className="space-y-2 pt-2">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-6 rounded-md bg-muted"
              style={{ width: `${60 + i * 15}px` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ModelAnswerSkeleton;
