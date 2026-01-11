"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getTeamSpacesApi,
  shareSessionToTeamSpaceApi,
  shareFavoriteToTeamSpaceApi,
  type ApiTeamSpace,
} from "@/lib/api";

interface ShareToTeamSpaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "session" | "favorite";
  sessionId?: string;
  favoriteId?: string;
}

export const ShareToTeamSpaceDialog = ({
  open,
  onOpenChange,
  type,
  sessionId,
  favoriteId,
}: ShareToTeamSpaceDialogProps) => {
  const router = useRouter();
  const [teamSpaces, setTeamSpaces] = useState<ApiTeamSpace[]>([]);
  const [selectedTeamSpaceId, setSelectedTeamSpaceId] = useState<string>("");
  const [weekNumber, setWeekNumber] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadTeamSpaces = async () => {
      if (open) {
        setIsLoading(true);
        try {
          const response = await getTeamSpacesApi();
          setTeamSpaces(response.teamSpaces);
          // 현재 선택된 팀스페이스가 있으면 기본값으로 설정
          const currentTeamSpaceId = localStorage.getItem("currentTeamSpaceId");
          if (
            currentTeamSpaceId &&
            response.teamSpaces.some((ts) => ts.id === currentTeamSpaceId)
          ) {
            setSelectedTeamSpaceId(currentTeamSpaceId);
          }
        } catch (error) {
          console.error("팀스페이스 목록 로드 실패:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadTeamSpaces();
  }, [open]);

  const handleShare = async () => {
    if (!selectedTeamSpaceId) {
      setError("팀스페이스를 선택해주세요");
      return;
    }

    setIsSharing(true);
    setError("");

    try {
      if (type === "session" && sessionId) {
        await shareSessionToTeamSpaceApi(
          selectedTeamSpaceId,
          sessionId,
          weekNumber ? parseInt(weekNumber) : undefined
        );
      } else if (type === "favorite" && favoriteId) {
        await shareFavoriteToTeamSpaceApi(selectedTeamSpaceId, favoriteId);
      }

      onOpenChange(false);
      // 성공 메시지 표시 (선택사항)
      alert("팀스페이스에 공유되었습니다!");
    } catch (error) {
      setError(error instanceof Error ? error.message : "공유에 실패했습니다");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {type === "session" ? "면접 기록 공유" : "찜한 질문 공유"}
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            팀스페이스에 {type === "session" ? "면접 기록을" : "찜한 질문을"}{" "}
            공유하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : teamSpaces.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              참여한 팀스페이스가 없습니다.
            </div>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  팀스페이스 선택
                </label>
                <select
                  value={selectedTeamSpaceId}
                  onChange={(e) => setSelectedTeamSpaceId(e.target.value)}
                  className="w-full h-12 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  disabled={isSharing}
                >
                  <option value="">선택하세요</option>
                  {teamSpaces.map((ts) => (
                    <option key={ts.id} value={ts.id}>
                      {ts.name} ({ts.role === "owner" ? "소유자" : "멤버"})
                    </option>
                  ))}
                </select>
              </div>

              {type === "session" && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    주차 번호 (선택)
                  </label>
                  <Input
                    type="number"
                    placeholder="예: 1"
                    value={weekNumber}
                    onChange={(e) => setWeekNumber(e.target.value)}
                    className="h-12"
                    disabled={isSharing}
                    min="1"
                  />
                </div>
              )}

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleShare}
                  className="flex-1 h-12 bg-navy hover:bg-navy-light"
                  disabled={isSharing || !selectedTeamSpaceId}
                >
                  {isSharing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "공유하기"
                  )}
                </Button>
                <Button
                  onClick={() => onOpenChange(false)}
                  variant="outline"
                  className="h-12"
                  disabled={isSharing}
                >
                  취소
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};


