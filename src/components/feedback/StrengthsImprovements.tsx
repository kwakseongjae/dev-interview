"use client";

import { cn } from "@/lib/utils";
import { FormattedText } from "./FormattedText";

interface StrengthsImprovementsProps {
  strengths: string[];
  improvements: string[];
  className?: string;
}

/**
 * StrengthsImprovements - Displays strengths and areas for improvement
 * Shows what was done well and what can be improved
 */
export function StrengthsImprovements({
  strengths,
  improvements,
  className,
}: StrengthsImprovementsProps) {
  const hasContent = strengths.length > 0 || improvements.length > 0;

  if (!hasContent) {
    return null;
  }

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", className)}>
      {/* Strengths */}
      {strengths.length > 0 && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-1.5 text-sm font-medium text-green-700 dark:text-green-400">
            <StrengthIcon />
            잘한 점
          </h4>
          <ul className="space-y-1.5">
            {strengths.map((strength, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-green-500" />
                <FormattedText
                  text={strength}
                  className="leading-relaxed"
                  highlightClassName="font-semibold text-green-700 dark:text-green-300 bg-green-100/50 dark:bg-green-900/30 px-1 rounded"
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvements */}
      {improvements.length > 0 && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400">
            <ImprovementIcon />
            개선할 점
          </h4>
          <ul className="space-y-1.5">
            {improvements.map((improvement, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                <FormattedText
                  text={improvement}
                  className="leading-relaxed"
                  highlightClassName="font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-900/30 px-1 rounded"
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StrengthIcon() {
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
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ImprovementIcon() {
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
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

export default StrengthsImprovements;
