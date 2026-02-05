"use client";

import { useState, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface HintSectionProps {
  hint: string;
  /** 초기 열림 상태 (uncontrolled 모드) */
  defaultOpen?: boolean;
  /** 외부에서 열림 상태 제어 (controlled 모드) */
  isOpen?: boolean;
  /** 열림 상태 변경 핸들러 (controlled 모드) */
  onToggle?: () => void;
  className?: string;
}

/**
 * HintSection - 힌트를 토글 버튼으로 표시하는 컴포넌트
 * AI 분석 섹션과 일관된 스타일을 유지하면서 독립적으로 사용 가능
 *
 * @example Uncontrolled 모드 (아카이브/찜 페이지)
 * <HintSection hint={question.hint} />
 *
 * @example Controlled 모드 (면접 페이지)
 * <HintSection hint={question.hint} isOpen={showHint} onToggle={() => setShowHint(!showHint)} />
 */
export const HintSection = memo(function HintSection({
  hint,
  defaultOpen = false,
  isOpen: controlledIsOpen,
  onToggle,
  className,
}: HintSectionProps) {
  // Controlled vs Uncontrolled 모드 결정
  const isControlled = controlledIsOpen !== undefined;
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);

  // 실제 열림 상태
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const handleToggle = useCallback(() => {
    if (isControlled && onToggle) {
      onToggle();
    } else {
      setInternalIsOpen((prev) => !prev);
    }
  }, [isControlled, onToggle]);

  // 힌트가 없으면 렌더링하지 않음
  if (!hint || hint.trim() === "") {
    return null;
  }

  return (
    <div className={cn("", className)}>
      {/* 힌트 토글 버튼 - 터치 타겟 44px 이상 확보 */}
      <button
        onClick={handleToggle}
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2.5 md:py-2 min-h-[44px] md:min-h-0 rounded-lg text-sm font-medium transition-all",
          isOpen
            ? "bg-gold text-white"
            : "bg-muted hover:bg-muted/80 text-foreground",
        )}
        aria-expanded={isOpen}
        aria-controls="hint-content"
      >
        <Lightbulb className="w-4 h-4" />
        <span>{isOpen ? "힌트 숨기기" : "힌트 보기"}</span>
      </button>

      {/* 힌트 콘텐츠 */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id="hint-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-lg border-l-4 border-gold bg-gold/5 p-4">
              {/* 섹션 헤더 */}
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gold/20">
                <Lightbulb className="w-4 h-4 text-gold" />
                <h4 className="font-medium text-gold text-sm">힌트</h4>
              </div>

              {/* 힌트 텍스트 */}
              <p className="text-sm leading-relaxed text-muted-foreground">
                {hint}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default HintSection;
