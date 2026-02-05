"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Brain, FolderKanban, Network, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApiInterviewType } from "@/lib/api";

// 아이콘 매핑
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain,
  FolderKanban,
  Network,
};

// 색상 매핑 (Tailwind 클래스)
const COLOR_MAP: Record<
  string,
  {
    bg: string;
    bgLight: string;
    border: string;
    text: string;
    selectedBg: string;
    hoverBorder: string;
  }
> = {
  blue: {
    bg: "bg-blue-100",
    bgLight: "bg-blue-50",
    border: "border-blue-300",
    text: "text-blue-600",
    selectedBg: "bg-blue-50",
    hoverBorder: "hover:border-blue-200",
  },
  green: {
    bg: "bg-emerald-100",
    bgLight: "bg-emerald-50",
    border: "border-emerald-300",
    text: "text-emerald-600",
    selectedBg: "bg-emerald-50",
    hoverBorder: "hover:border-emerald-200",
  },
  purple: {
    bg: "bg-purple-100",
    bgLight: "bg-purple-50",
    border: "border-purple-300",
    text: "text-purple-600",
    selectedBg: "bg-purple-50",
    hoverBorder: "hover:border-purple-200",
  },
};

interface InterviewTypeSelectorProps {
  interviewTypes: ApiInterviewType[];
  selectedTypeId: string | null;
  onSelect: (typeId: string | null) => void;
  disabled?: boolean;
}

export function InterviewTypeSelector({
  interviewTypes,
  selectedTypeId,
  onSelect,
  disabled = false,
}: InterviewTypeSelectorProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[160px] rounded-xl bg-muted/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  const handleSelect = (typeId: string) => {
    if (disabled) return;
    // 같은 타입 클릭 시 선택 해제
    if (selectedTypeId === typeId) {
      onSelect(null);
    } else {
      onSelect(typeId);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {interviewTypes.map((type) => {
        const isSelected = selectedTypeId === type.id;
        const IconComponent = ICON_MAP[type.icon || "Brain"] || Brain;
        const colors = COLOR_MAP[type.color || "blue"] || COLOR_MAP.blue;

        return (
          <motion.button
            key={type.id}
            type="button"
            onClick={() => handleSelect(type.id)}
            disabled={disabled}
            className={cn(
              "relative flex flex-col items-start text-left p-4 rounded-xl border-2 transition-all duration-200",
              "focus:outline-none focus-visible:outline-none",
              disabled && "opacity-50 cursor-not-allowed",
              isSelected
                ? `${colors.selectedBg} ${colors.border} shadow-md`
                : `bg-card border-border/50 ${colors.hoverBorder} hover:shadow-sm`,
            )}
          >
            {/* 선택 표시 */}
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={cn(
                  "absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center",
                  colors.bg,
                  colors.text,
                )}
              >
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
              </motion.div>
            )}

            {/* 아이콘 */}
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
                colors.bg,
              )}
            >
              <IconComponent className={cn("w-5 h-5", colors.text)} />
            </div>

            {/* 제목 */}
            <h3
              className={cn(
                "text-base font-semibold mb-1",
                isSelected ? colors.text : "text-foreground",
              )}
            >
              {type.displayName}
            </h3>

            {/* 설명 - 전체 표시 */}
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              {type.description}
            </p>

            {/* 선택 시 혜택 안내 */}
            <div
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium mt-auto pt-2 border-t border-border/30 w-full",
                isSelected ? colors.text : "text-muted-foreground",
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>이 분야 맞춤 질문 생성</span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

// 선택된 면접 범주를 배지로 표시하는 컴포넌트
interface InterviewTypeBadgeProps {
  type: ApiInterviewType;
  size?: "sm" | "md";
}

export function InterviewTypeBadge({
  type,
  size = "sm",
}: InterviewTypeBadgeProps) {
  const IconComponent = ICON_MAP[type.icon || "Brain"] || Brain;
  const colors = COLOR_MAP[type.color || "blue"] || COLOR_MAP.blue;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        colors.bg,
        colors.text,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
      )}
    >
      <IconComponent className={cn(size === "sm" ? "w-3 h-3" : "w-4 h-4")} />
      {type.displayName}
    </span>
  );
}
