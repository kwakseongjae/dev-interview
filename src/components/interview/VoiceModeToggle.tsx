"use client";

import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceModeToggleProps {
  mode: "text" | "voice";
  onToggle: (mode: "text" | "voice") => void;
  disabled?: boolean;
}

export function VoiceModeToggle({
  mode,
  onToggle,
  disabled = false,
}: VoiceModeToggleProps) {
  const isVoice = mode === "voice";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(isVoice ? "text" : "voice")}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 md:py-2 min-h-[44px] md:min-h-0 text-sm font-medium transition-all",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        isVoice
          ? "bg-red-500 text-white"
          : "bg-muted text-foreground hover:bg-muted/80",
      )}
      title={isVoice ? "텍스트 입력으로 전환" : "음성 입력으로 전환"}
    >
      {isVoice ? (
        <>
          <Mic className="w-4 h-4" />
          <span>음성 입력</span>
        </>
      ) : (
        <>
          <Mic className="w-4 h-4" />
          <span>음성 입력</span>
        </>
      )}
    </button>
  );
}
