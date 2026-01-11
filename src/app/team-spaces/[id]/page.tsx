"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Loader2,
  Calendar as CalendarIcon,
  Heart,
  Users,
  Clock,
  CheckCircle2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import Link from "next/link";
import Image from "next/image";
import logoImage from "@/assets/images/logo.png";
import logoTextImage from "@/assets/images/logo-text.png";
import {
  getTeamSpaceByIdApi,
  getTeamSpaceSessionsApi,
  getTeamSpaceFavoritesApi,
  type TeamSpaceSession,
  type TeamSpaceFavorite,
  isLoggedIn,
} from "@/lib/api";
import { formatSecondsKorean } from "@/hooks/useTimer";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

function TeamSpaceContent() {
  const params = useParams();
  const router = useRouter();
  const teamSpaceId = params.id as string;

  const [teamSpace, setTeamSpace] = useState<{
    id: string;
    name: string;
    avatar_url: string | null;
    role: "owner" | "member";
  } | null>(null);
  const [sessions, setSessions] = useState<TeamSpaceSession[]>([]);
  const [favorites, setFavorites] = useState<TeamSpaceFavorite[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  const [activeTab, setActiveTab] = useState<"sessions" | "favorites">(
    "sessions"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const startDate = dateRange.from
          ? format(dateRange.from, "yyyy-MM-dd")
          : null;
        const endDate = dateRange.to
          ? format(dateRange.to, "yyyy-MM-dd")
          : null;

        const [teamSpaceRes, sessionsRes, favoritesRes] = await Promise.all([
          getTeamSpaceByIdApi(teamSpaceId),
          getTeamSpaceSessionsApi(
            teamSpaceId,
            selectedWeek || undefined,
            startDate || undefined,
            endDate || undefined
          ).catch(() => ({ sessions: [] })),
          getTeamSpaceFavoritesApi(teamSpaceId).catch(() => ({
            favorites: [],
          })),
        ]);

        setTeamSpace(teamSpaceRes.teamSpace);
        setSessions(sessionsRes.sessions);
        setFavorites(favoritesRes.favorites);
      } catch (error) {
        // 팀스페이스 정보 조회 실패만 에러로 처리
        setError(
          error instanceof Error
            ? error.message
            : "팀스페이스를 불러올 수 없습니다"
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (isLoggedIn()) {
      loadData();
    } else {
      router.push("/auth");
    }
  }, [teamSpaceId, router, selectedWeek, dateRange]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // 주차별 그룹화 (주차 필터가 선택된 경우에만 사용)
  const sessionsByWeek = sessions.reduce((acc, session) => {
    const week = session.week_number || 0;
    if (!acc[week]) {
      acc[week] = [];
    }
    acc[week].push(session);
    return acc;
  }, {} as Record<number, TeamSpaceSession[]>);

  const weeks = Object.keys(sessionsByWeek)
    .map(Number)
    .sort((a, b) => b - a);

  const filteredSessions = selectedWeek
    ? sessionsByWeek[selectedWeek] || []
    : sessions;

  const myFavorites = favorites.filter((f) => f.is_mine);
  const otherFavorites = favorites.filter((f) => !f.is_mine);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  if (!teamSpace) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">
          <p className="text-muted-foreground">
            {error || "팀스페이스를 찾을 수 없습니다."}
          </p>
          <Link href="/">
            <Button className="mt-4 w-full">홈으로</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <main className="min-h-screen grain">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-navy/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full px-6 py-4">
        <nav className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1 group">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden">
              <Image
                src={logoImage}
                alt="모카번 Logo"
                width={48}
                height={48}
                className="w-full h-full object-contain"
              />
            </div>
            <Image
              src={logoTextImage}
              alt="모카번"
              width={66}
              height={28}
              className="h-5 w-auto object-contain"
              priority
            />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="outline" size="sm">
                홈으로
              </Button>
            </Link>
            {teamSpace.role === "owner" && (
              <Link href={`/team-spaces/${teamSpaceId}/manage`}>
                <Button variant="outline" size="sm">
                  관리
                </Button>
              </Link>
            )}
          </div>
        </nav>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Team Space Info */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            {teamSpace.avatar_url ? (
              <img
                src={teamSpace.avatar_url}
                alt={teamSpace.name}
                className="w-16 h-16 rounded-lg object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallback = e.currentTarget
                    .nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className={`w-16 h-16 rounded-lg bg-muted flex items-center justify-center ${
                teamSpace.avatar_url ? "hidden" : ""
              }`}
            >
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold">{teamSpace.name}</h1>
              <p className="text-muted-foreground">
                {teamSpace.role === "owner" ? "소유자" : "멤버"}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab("sessions")}
            className={`pb-3 px-4 font-medium transition-colors ${
              activeTab === "sessions"
                ? "text-foreground border-b-2 border-gold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            면접 기록 ({sessions.length})
          </button>
          <button
            onClick={() => setActiveTab("favorites")}
            className={`pb-3 px-4 font-medium transition-colors ${
              activeTab === "favorites"
                ? "text-foreground border-b-2 border-gold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            찜한 질문 ({favorites.length})
          </button>
        </div>

        {/* Content */}
        {activeTab === "sessions" ? (
          <div>
            {/* Filters */}
            <div className="flex gap-2 mb-6 flex-wrap items-center">
              {/* 주차 필터 (기존) */}
              {weeks.length > 0 && (
                <>
                  <Button
                    variant={selectedWeek === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedWeek(null)}
                  >
                    전체
                  </Button>
                  {weeks.map((week) => (
                    <Button
                      key={week}
                      variant={selectedWeek === week ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedWeek(week)}
                    >
                      {week}주차
                    </Button>
                  ))}
                </>
              )}

              {/* 날짜 범위 선택 */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {dateRange.from && dateRange.to
                      ? `${format(dateRange.from, "yyyy-MM-dd", {
                          locale: ko,
                        })} ~ ${format(dateRange.to, "yyyy-MM-dd", {
                          locale: ko,
                        })}`
                      : dateRange.from
                      ? format(dateRange.from, "yyyy-MM-dd", { locale: ko })
                      : "기간 선택"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => {
                      setDateRange({
                        from: range?.from,
                        to: range?.to,
                      });
                    }}
                    numberOfMonths={2}
                    locale={ko}
                  />
                  {(dateRange.from || dateRange.to) && (
                    <div className="p-3 border-t flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDateRange({ from: undefined, to: undefined });
                        }}
                      >
                        <X className="w-4 h-4 mr-1" />
                        초기화
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              {/* 전체 보기 버튼 */}
              {(dateRange.from || dateRange.to) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDateRange({ from: undefined, to: undefined });
                  }}
                >
                  전체 보기
                </Button>
              )}
            </div>

            {/* Sessions List */}
            {filteredSessions.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">
                  공유된 면접 기록이 없습니다.
                </p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredSessions.map((session) => (
                  <Card key={session.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{session.query}</h3>
                          {session.week_number && (
                            <Badge variant="outline">
                              {session.week_number}주차
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatSecondsKorean(session.total_time)}
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            {session.is_completed ? "완료" : "진행 중"}
                          </div>
                          {/* 작성자 태그 */}
                          <Badge variant="outline" className="text-xs">
                            <Users className="w-3 h-3 mr-1" />
                            {session.shared_by.nickname ||
                              session.shared_by.username}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDate(session.created_at)}
                        </p>
                      </div>
                      <Link href={`/archive/${session.id}`}>
                        <Button variant="outline" size="sm">
                          보기
                        </Button>
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* My Favorites */}
            {myFavorites.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">내가 찜한 질문</h2>
                <div className="grid gap-4">
                  {myFavorites.map((favorite) => (
                    <Card key={favorite.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium mb-2">{favorite.content}</p>
                          {favorite.hint && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {favorite.hint}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline">{favorite.category}</Badge>
                            {favorite.subcategory && (
                              <Badge variant="outline">
                                {favorite.subcategory}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Other Favorites */}
            {otherFavorites.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">팀원이 찜한 질문</h2>
                <div className="grid gap-4">
                  {otherFavorites.map((favorite) => (
                    <Card key={favorite.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <p className="font-medium">{favorite.content}</p>
                            {favorite.favorited_by[0] && (
                              <Badge variant="outline" className="text-xs">
                                <Users className="w-3 h-3 mr-1" />
                                {favorite.favorited_by[0].nickname ||
                                  favorite.favorited_by[0].username}
                              </Badge>
                            )}
                          </div>
                          {favorite.hint && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {favorite.hint}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline">{favorite.category}</Badge>
                            {favorite.subcategory && (
                              <Badge variant="outline">
                                {favorite.subcategory}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {favorites.length === 0 && (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">
                  공유된 찜한 질문이 없습니다.
                </p>
              </Card>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function TeamSpacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gold" />
        </div>
      }
    >
      <TeamSpaceContent />
    </Suspense>
  );
}

