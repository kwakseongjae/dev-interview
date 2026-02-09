"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
// Image import 제거 - 일반 img 태그 사용
import {
  getTeamSpacesApi,
  setLastSelectedTeamSpaceApi,
  isLoggedIn,
  type ApiTeamSpace,
} from "@/lib/api";

interface TeamSpaceSelectorProps {
  currentTeamSpaceId: string | null;
  onSelect: (teamSpaceId: string | null) => void;
}

export const TeamSpaceSelector = ({
  currentTeamSpaceId,
  onSelect,
}: TeamSpaceSelectorProps) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [teamSpaces, setTeamSpaces] = useState<ApiTeamSpace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 컴포넌트 마운트 시 팀스페이스 목록 로드 (현재 선택된 팀스페이스 정보 표시를 위해)
  useEffect(() => {
    const loadTeamSpaces = async () => {
      if (!isLoggedIn()) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await getTeamSpacesApi();
        setTeamSpaces(response.teamSpaces);
      } catch (error) {
        console.error("팀스페이스 목록 로드 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTeamSpaces();
  }, []);

  // Sheet가 열릴 때마다 최신 팀스페이스 목록 로드
  useEffect(() => {
    const loadTeamSpaces = async () => {
      if (!isOpen || !isLoggedIn()) {
        return;
      }

      try {
        const response = await getTeamSpacesApi();
        setTeamSpaces(response.teamSpaces);
      } catch (error) {
        console.error("팀스페이스 목록 로드 실패:", error);
      }
    };

    loadTeamSpaces();
  }, [isOpen]);

  const currentTeamSpace = teamSpaces.find(
    (ts) => ts.id === currentTeamSpaceId,
  );

  const handleCreateNew = () => {
    setIsOpen(false);
    router.push("/team-spaces/new");
  };

  const handleSelect = async (teamSpaceId: string | null) => {
    onSelect(teamSpaceId);
    // localStorage에 저장하여 전역적으로 사용
    if (teamSpaceId) {
      localStorage.setItem("currentTeamSpaceId", teamSpaceId);
    } else {
      localStorage.removeItem("currentTeamSpaceId");
    }

    // 서버에 마지막 선택한 팀스페이스 저장
    if (isLoggedIn()) {
      try {
        await setLastSelectedTeamSpaceApi(teamSpaceId);
      } catch (error) {
        console.error("마지막 선택 팀스페이스 저장 실패:", error);
      }
    }

    setIsOpen(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-muted-foreground hover:text-foreground hover:bg-gold/10 group"
      >
        {currentTeamSpace ? (
          <>
            {currentTeamSpace.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentTeamSpace.avatar_url}
                alt={currentTeamSpace.name}
                className="w-4 h-4 rounded mr-2 object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <Users className="w-4 h-4 mr-2" />
            )}
            <span className="max-w-[100px] truncate">
              {currentTeamSpace.name}
            </span>
          </>
        ) : (
          <>
            <Users className="w-4 h-4 mr-2" />
            <span>팀스페이스</span>
          </>
        )}
        <ChevronDown className="w-4 h-4 ml-1" />
      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>팀스페이스 선택</SheetTitle>
            <SheetDescription>
              팀스페이스를 선택하거나 새로 만드세요.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <Button
              onClick={handleCreateNew}
              className="w-full h-12 bg-navy hover:bg-navy-light"
            >
              <Plus className="w-4 h-4 mr-2" />새 팀스페이스
            </Button>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                로딩 중...
              </div>
            ) : teamSpaces.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                참여한 팀스페이스가 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  내 팀스페이스
                </div>
                {teamSpaces.map((teamSpace) => (
                  <button
                    key={teamSpace.id}
                    onClick={() => handleSelect(teamSpace.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      currentTeamSpaceId === teamSpace.id
                        ? "bg-gold/10 border-gold"
                        : "hover:bg-muted border-border"
                    }`}
                  >
                    {teamSpace.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={teamSpace.avatar_url}
                        alt={teamSpace.name}
                        className="w-10 h-10 rounded-lg object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const fallback = e.currentTarget
                            .nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${
                        teamSpace.avatar_url ? "hidden" : ""
                      }`}
                    >
                      <Users className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{teamSpace.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {teamSpace.role === "owner" ? "소유자" : "멤버"}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {currentTeamSpaceId && (
              <Button
                onClick={() => handleSelect(null)}
                variant="outline"
                className="w-full"
              >
                개인 공간으로 전환
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
