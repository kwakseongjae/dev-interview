"use client";

import { cn } from "@/lib/utils";

interface FollowUpQuestionsProps {
  questions: string[];
  className?: string;
}

/**
 * FollowUpQuestions - Displays follow-up interview questions
 * Shows questions that interviewer might ask based on the answer
 */
export function FollowUpQuestions({
  questions,
  className,
}: FollowUpQuestionsProps) {
  if (questions.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <h4 className="text-sm font-medium text-foreground">예상 꼬리질문</h4>
      <ul className="space-y-2">
        {questions.map((question, index) => (
          <li
            key={index}
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
              {index + 1}
            </span>
            <span className="leading-relaxed">{question}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FollowUpQuestions;
