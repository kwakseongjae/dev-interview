"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isLoggedIn } from "@/lib/api";

interface LoginPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "complete" | "archive";
  onLater?: () => void;
}

export const LoginPromptModal = ({
  open,
  onOpenChange,
  type,
  onLater,
}: LoginPromptModalProps) => {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 로그인 상태 감지
  useEffect(() => {
    if (open && isLoggedIn()) {
      onOpenChange(false);
    }
  }, [open, onOpenChange]);

  if (!isClient) return null;

  const handleLogin = () => {
    const currentPath = window.location.pathname + window.location.search;
    router.push(`/auth?redirect=${encodeURIComponent(currentPath)}`);
  };

  const handleLater = () => {
    if (onLater) {
      onLater();
    }
    onOpenChange(false);
  };

  const getContent = () => {
    if (type === "complete") {
      return {
        title: "면접 기록을 저장하세요",
        description:
          "로그인하면 방금 보신 면접 기록을 저장할 수 있습니다. 나중에 다시 확인하고 연습해보세요.",
        loginText: "로그인하고 저장하기",
      };
    } else {
      return {
        title: "로그인하고 더 많은 기능을 이용하세요",
        description:
          "로그인하면 면접 기록을 저장하고, 찜한 질문을 관리할 수 있습니다.",
        loginText: "로그인하기",
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
        <div className="flex flex-col gap-3 pt-4">
          <Button
            onClick={handleLogin}
            className="w-full h-12 bg-navy hover:bg-navy-light"
          >
            {content.loginText}
          </Button>
          <Button onClick={handleLater} variant="ghost" className="w-full h-12">
            나중에 하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};


