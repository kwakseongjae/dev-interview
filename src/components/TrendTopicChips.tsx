"use client";

import { useState } from "react";
import { Flame, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getTopicsSorted,
  type TrendTopic,
  type TrendRelevance,
} from "@/data/trend-topics";

// 우선순위별 색상 매핑
const RELEVANCE_COLORS: Record<
  TrendRelevance,
  {
    chipBg: string;
    chipBorder: string;
    chipText: string;
  }
> = {
  critical: {
    chipBg: "bg-amber-50",
    chipBorder: "border-amber-200",
    chipText: "text-amber-700",
  },
  high: {
    chipBg: "bg-blue-50",
    chipBorder: "border-blue-200",
    chipText: "text-blue-700",
  },
  medium: {
    chipBg: "bg-gray-50",
    chipBorder: "border-gray-200",
    chipText: "text-gray-600",
  },
};

// ── 검색 폼 내부에 배치되는 트렌드 토픽 선택 트리거 + Popover ──
interface TrendTopicSelectorProps {
  selectedTopic: TrendTopic | null;
  onSelect: (topic: TrendTopic | null) => void;
  disabled?: boolean;
}

export function TrendTopicSelector({
  selectedTopic,
  onSelect,
  disabled = false,
}: TrendTopicSelectorProps) {
  const [open, setOpen] = useState(false);
  const topics = getTopicsSorted();

  const handleSelect = (topic: TrendTopic) => {
    if (disabled) return;
    onSelect(topic);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex items-center gap-1.5 text-xs md:text-sm transition-colors",
            "focus:outline-none focus-visible:outline-none",
            disabled && "opacity-50 cursor-not-allowed",
            "text-muted-foreground hover:text-foreground cursor-pointer",
          )}
        >
          <Flame className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-500" />
          <span>트렌드 토픽</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground/60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[calc(100vw-2rem)] max-w-[420px] p-3"
        sideOffset={8}
      >
        <div className="space-y-2.5">
          <p className="text-xs text-muted-foreground">
            선택한 트렌드 토픽이 AI 질문 생성에 반영됩니다
          </p>
          <div className="flex flex-wrap gap-1.5">
            {topics.map((topic) => {
              const isSelected = selectedTopic?.id === topic.id;
              const colors = RELEVANCE_COLORS[topic.relevance];

              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => handleSelect(topic)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-xs transition-colors",
                    "focus:outline-none focus-visible:outline-none",
                    isSelected
                      ? `${colors.chipBg} ${colors.chipBorder} ${colors.chipText} shadow-sm`
                      : "bg-card border-border/40 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  {topic.relevance === "critical" && (
                    <Flame className="w-3 h-3 text-amber-400 flex-shrink-0" />
                  )}
                  <span className="whitespace-nowrap">{topic.nameKo}</span>
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── 검색창 내부에 표시되는 선택된 트렌드 태그 Pill ──
interface SelectedTrendPillProps {
  topic: TrendTopic;
  onRemove: () => void;
}

export function SelectedTrendPill({ topic, onRemove }: SelectedTrendPillProps) {
  const colors = RELEVANCE_COLORS[topic.relevance];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs font-medium border",
        colors.chipBg,
        colors.chipBorder,
        colors.chipText,
      )}
    >
      <Flame className="w-3 h-3 flex-shrink-0" />
      <span>{topic.nameKo}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className={cn(
          "ml-0.5 w-4 h-4 rounded-full flex items-center justify-center transition-colors",
          "hover:bg-black/10",
        )}
        aria-label={`${topic.nameKo} 제거`}
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </span>
  );
}

// ── 질문 목록에서 트렌드 배지 표시용 컴포넌트 (기존 유지) ──
export function TrendBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
      <Flame className="w-3 h-3" />
      트렌드
    </span>
  );
}
