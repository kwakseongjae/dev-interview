"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isLoggedIn, signInWithGoogle } from "@/lib/api";

interface LoginPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "complete" | "archive" | "interview";
  onLater?: () => void;
}

export const LoginPromptModal = ({
  open,
  onOpenChange,
  type,
  onLater,
}: LoginPromptModalProps) => {
  const [isLoading, setIsLoading] = useState(false);

  // 로그인 상태 감지
  useEffect(() => {
    if (open && isLoggedIn()) {
      onOpenChange(false);
    }
  }, [open, onOpenChange]);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const currentPath = window.location.pathname + window.location.search;
      await signInWithGoogle(currentPath);
    } catch {
      setIsLoading(false);
    }
  };

  const handleLater = () => {
    if (onLater) {
      onLater();
    }
    onOpenChange(false);
  };

  const getContent = () => {
    if (type === "interview") {
      return {
        title: "면접 결과를 저장하시겠어요?",
        description:
          "로그인하면 답변이 아카이브에 저장되고, AI 피드백과 모범 답변을 받아볼 수 있습니다.",
        features: [
          "AI가 분석한 답변 피드백",
          "질문별 모범 답변 제공",
          "아카이브에서 복습 및 관리",
        ],
        warning: "저장하지 않으면 작성한 답변이 사라집니다.",
        loginText: "Google로 로그인하고 저장하기",
        laterText: "저장하지 않고 나가기",
      };
    } else if (type === "complete") {
      return {
        title: "면접 기록을 저장하세요",
        description:
          "로그인하면 방금 보신 면접 기록을 저장할 수 있습니다. 나중에 다시 확인하고 연습해보세요.",
        loginText: "Google로 로그인하고 저장하기",
      };
    } else {
      return {
        title: "로그인하고 더 많은 기능을 이용하세요",
        description:
          "로그인하면 면접 기록을 저장하고, 찜한 질문을 관리할 수 있습니다.",
        loginText: "Google로 로그인하기",
      };
    }
  };

  const content = getContent();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{content.title}</DialogTitle>
          <DialogDescription className="text-base pt-2">
            {content.description}
          </DialogDescription>
        </DialogHeader>

        {/* interview 타입: 로그인 혜택 */}
        {"features" in content && content.features && (
          <ul className="space-y-1.5 pt-1">
            {content.features.map((feat: string) => (
              <li
                key={feat}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <span className="text-gold">&#10003;</span>
                {feat}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-3 pt-4">
          <Button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full h-12 bg-navy hover:bg-navy-light"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              content.loginText
            )}
          </Button>
          <Button onClick={handleLater} variant="ghost" className="w-full h-12">
            {"laterText" in content ? content.laterText : "나중에 하기"}
          </Button>
          {"warning" in content && (
            <p className="text-xs text-center text-destructive">
              {content.warning}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
