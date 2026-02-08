"use client";

import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const KAKAO_OPEN_CHAT_URL = "https://open.kakao.com/o/scbn4tfi";

export default function FloatingContactButton() {
  const pathname = usePathname();

  const isInterviewPage =
    pathname === "/interview" || pathname.endsWith("/interview");

  if (isInterviewPage) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={KAKAO_OPEN_CHAT_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="카카오톡 오픈채팅으로 문의하기"
            className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--gold))] text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold))] focus-visible:ring-offset-2 max-sm:bottom-5 max-sm:right-4"
          >
            <MessageCircle className="!size-6" />
          </a>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={8}>
          문의하기
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
