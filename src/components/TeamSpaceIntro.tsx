"use client";

import { useState, useEffect } from "react";
import { Users, Share2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  isLoggedIn,
  getTeamSpaceIntroStatusApi,
  markTeamSpaceIntroSeenApi,
} from "@/lib/api";

export const TeamSpaceIntro = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [, setIsLoading] = useState(true);

  useEffect(() => {
    const checkIntroStatus = async () => {
      // 로그인하지 않은 경우 인트로 표시하지 않음
      if (!isLoggedIn()) {
        setIsLoading(false);
        return;
      }

      try {
        // API를 통해 인트로를 봤는지 확인
        const { hasSeenIntro } = await getTeamSpaceIntroStatusApi();
        if (!hasSeenIntro) {
          setIsOpen(true);
        }
      } catch (error) {
        console.error("팀스페이스 인트로 상태 확인 실패:", error);
        // API 실패 시 localStorage로 폴백
        const hasSeenIntro = localStorage.getItem("teamSpace_intro_seen");
        if (!hasSeenIntro) {
          setIsOpen(true);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkIntroStatus();
  }, []);

  const handleClose = async () => {
    setIsOpen(false);

    // API를 통해 인트로를 봤음으로 표시
    try {
      await markTeamSpaceIntroSeenApi();
    } catch (error) {
      console.error("팀스페이스 인트로 상태 업데이트 실패:", error);
    }

    // localStorage에도 저장 (폴백용)
    localStorage.setItem("teamSpace_intro_seen", "true");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">팀스페이스 기능 소개</DialogTitle>
          <DialogDescription className="text-base pt-2">
            팀과 함께 면접 준비를 더 효율적으로 해보세요!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-gold" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">팀과 함께 면접 준비</h3>
                <p className="text-sm text-muted-foreground">
                  팀스페이스를 만들어 팀원들과 면접 기록과 찜한 질문을 공유할 수
                  있습니다.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-navy/10 flex items-center justify-center flex-shrink-0">
                <Share2 className="w-5 h-5 text-navy" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">간편한 초대</h3>
                <p className="text-sm text-muted-foreground">
                  링크 하나로 팀원을 초대할 수 있습니다. 비밀번호를 설정하여
                  보안을 강화할 수도 있습니다.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">주차별 관리</h3>
                <p className="text-sm text-muted-foreground">
                  면접 기록을 주차별로 정리하고, 누가 어떤 면접을 봤는지 확인할
                  수 있습니다.
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleClose} className="bg-navy hover:bg-navy-light">
            시작하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
