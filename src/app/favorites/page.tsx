"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Archive,
  ArrowLeft,
  Heart,
  Loader2,
  Play,
  Sparkles,
  Trash2,
  Share2,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import Image from "next/image";
import logoImage from "@/assets/images/logo.png";
import logoTextImage from "@/assets/images/logo-text.png";

import type { FavoriteQuestion } from "@/types/interview";
import {
  getFavoritesApi,
  getTeamSpaceFavoritesApi,
  getTeamSpacesApi,
  removeFavoriteApi,
  addFavoriteApi,
  createSessionApi,
  isLoggedIn,
  type ApiFavorite,
  type TeamSpaceFavorite,
  type ApiTeamSpace,
} from "@/lib/api";
import { cache, createCacheKey } from "@/lib/cache";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import { ShareToTeamSpaceDialog } from "@/components/ShareToTeamSpaceDialog";
import { useRouter } from "next/navigation";

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteQuestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [useApi, setUseApi] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedFavoriteId, setSelectedFavoriteId] = useState<string | null>(
    null
  );
  const [isMounted, setIsMounted] = useState(false);
  const [teamSpaces, setTeamSpaces] = useState<ApiTeamSpace[]>([]);
  // 실제 팀 스페이스 액세스 상태 (localStorage에서 읽어옴, 변경하지 않음)
  const [actualTeamSpaceId, setActualTeamSpaceId] = useState<string | null>(
    null
  );
  // 페이지 내부에서만 사용하는 뷰 모드 (localStorage와 무관)
  const [viewMode, setViewMode] = useState<"personal" | "team">("personal");
  // 면접 시작 모달 상태
  const [showStartInterviewDialog, setShowStartInterviewDialog] =
    useState(false);
  const [interviewTitle, setInterviewTitle] = useState("");
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // 실제 팀 스페이스 액세스 상태 로드
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      const storedTeamSpaceId = localStorage.getItem("currentTeamSpaceId");
      setActualTeamSpaceId(storedTeamSpaceId);
      // localStorage에 팀 스페이스가 있으면 팀 스페이스 뷰로 시작
      setViewMode(storedTeamSpaceId ? "team" : "personal");
    }
  }, []);

  // 팀 스페이스 목록 로드
  useEffect(() => {
    const loadTeamSpaces = async () => {
      if (isLoggedIn() && isMounted) {
        try {
          const response = await getTeamSpacesApi();
          setTeamSpaces(response.teamSpaces);

          // 실제 팀 스페이스 액세스 상태 확인
          if (actualTeamSpaceId) {
            const exists = response.teamSpaces.some(
              (ts) => ts.id === actualTeamSpaceId
            );
            if (!exists) {
              // 실제 팀 스페이스가 목록에 없으면 개인 공간으로 전환
              setActualTeamSpaceId(null);
              setViewMode("personal");
              if (typeof window !== "undefined") {
                localStorage.removeItem("currentTeamSpaceId");
              }
            }
          }
        } catch (error) {
          console.error("팀 스페이스 목록 로드 실패:", error);
        }
      }
    };
    loadTeamSpaces();
  }, [isMounted, actualTeamSpaceId]);

  // API 데이터를 FavoriteQuestion 형태로 변환
  const convertApiFavorite = (apiFav: ApiFavorite): FavoriteQuestion => ({
    id: apiFav.id,
    questionId: apiFav.question_id,
    content: apiFav.content,
    hint: apiFav.hint || "",
    category: apiFav.category,
    savedAt: apiFav.created_at,
  });

  // 팀 스페이스 찜한 질문을 FavoriteQuestion 형태로 변환
  const convertTeamSpaceFavorite = (
    tsFav: TeamSpaceFavorite
  ): FavoriteQuestion & {
    favoritedBy?: Array<{
      id: string;
      username: string;
      nickname: string | null;
      shared_at: string;
      is_mine: boolean;
    }>;
    isMine?: boolean;
  } => ({
    id: tsFav.id,
    questionId: tsFav.question_id,
    content: tsFav.content,
    hint: tsFav.hint || "",
    category: tsFav.category,
    savedAt: tsFav.created_at,
    favoritedBy: tsFav.favorited_by,
    isMine: tsFav.is_mine,
  });

  // 데이터 로드
  const loadFavorites = useCallback(async () => {
    setIsLoading(true);

    // 로그인 상태면 API 사용
    if (isLoggedIn()) {
      try {
        // 캐시 키 생성
        const cacheKey = createCacheKey("favorites", {
          viewMode,
          teamSpaceId: actualTeamSpaceId || "null",
        });

        // 캐시 확인
        const cachedData = cache.get<FavoriteQuestion[]>(cacheKey);
        if (cachedData) {
          setFavorites(cachedData);
          setUseApi(true);
          setIsLoading(false);
          // 백그라운드에서 최신 데이터 가져오기
          if (viewMode === "team" && actualTeamSpaceId) {
            getTeamSpaceFavoritesApi(actualTeamSpaceId)
              .then((response) => {
                const converted = response.favorites.map(
                  convertTeamSpaceFavorite
                );
                cache.set(cacheKey, converted);
                setFavorites(converted);
              })
              .catch((error) => {
                console.error("백그라운드 데이터 업데이트 실패:", error);
              });
          } else {
            getFavoritesApi()
              .then((response) => {
                const converted = response.favorites.map(convertApiFavorite);
                cache.set(cacheKey, converted);
                setFavorites(converted);
              })
              .catch((error) => {
                console.error("백그라운드 데이터 업데이트 실패:", error);
              });
          }
          return;
        }

        // viewMode에 따라 API 호출 결정
        if (viewMode === "team" && actualTeamSpaceId) {
          // 팀 스페이스 찜한 질문 조회
          const response = await getTeamSpaceFavoritesApi(actualTeamSpaceId);
          const converted = response.favorites.map(convertTeamSpaceFavorite);
          // 캐시에 저장
          cache.set(cacheKey, converted);
          setFavorites(converted);
        } else {
          // 개인 찜한 질문 조회
          const response = await getFavoritesApi();
          const converted = response.favorites.map(convertApiFavorite);
          // 캐시에 저장
          cache.set(cacheKey, converted);
          setFavorites(converted);
        }
        setUseApi(true);
        setIsLoading(false);
        return;
      } catch (error) {
        console.error("API 호출 실패:", error);
        // 인증 오류인 경우 조용히 처리 (로그인하지 않은 상태로 간주)
        const errorMessage = error instanceof Error ? error.message : "";
        if (
          errorMessage.includes("인증이 필요") ||
          errorMessage.includes("401")
        ) {
          // 로그인하지 않은 상태로 처리
          setFavorites([]);
          setUseApi(false);
          setIsLoading(false);
          return;
        }
        setFavorites([]);
        setUseApi(true);
        setIsLoading(false);
        return;
      }
    }

    // 로그인하지 않은 경우 빈 배열
    setFavorites([]);
    setUseApi(false);
    setIsLoading(false);
  }, [viewMode, actualTeamSpaceId]);

  useEffect(() => {
    // 마운트된 후에만 데이터 로드
    if (isMounted) {
      loadFavorites();
    }
  }, [loadFavorites, isMounted]);

  // 로그인 상태 변경 감지하여 데이터 다시 로드
  useEffect(() => {
    const handleAuthStateChange = () => {
      // 로그인 상태 변경 시 데이터 다시 로드
      loadFavorites();
    };

    const handleFocus = () => {
      // 페이지 포커스 시 로그인 상태 확인 후 데이터 다시 로드
      loadFavorites();
    };

    // 커스텀 이벤트 리스너 (로그인/로그아웃 시)
    window.addEventListener("authStateChanged", handleAuthStateChange);

    // 페이지 포커스 시 데이터 다시 로드
    window.addEventListener("focus", handleFocus);

    // storage 이벤트 리스너 (다른 탭에서 로그인/로그아웃 시)
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === "devinterview_access_token" ||
        e.key === "devinterview_refresh_token"
      ) {
        loadFavorites();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("authStateChanged", handleAuthStateChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [loadFavorites]);

  // 비로그인 상태이고 찜한 질문이 없으면 로그인 유도 모달 표시
  useEffect(() => {
    if (!isLoading && !isLoggedIn() && favorites.length === 0) {
      const dismissedUntil = localStorage.getItem(
        "loginPrompt_archive_dismissedUntil"
      );
      if (dismissedUntil) {
        const dismissedDate = new Date(dismissedUntil);
        if (dismissedDate > new Date()) {
          return;
        }
      }
      setTimeout(() => setShowLoginModal(true), 1000);
    }
  }, [isLoading, favorites.length]);

  const handleLater = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    localStorage.setItem(
      "loginPrompt_archive_dismissedUntil",
      tomorrow.toISOString()
    );
    setShowLoginModal(false);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === favorites.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(favorites.map((f) => f.id)));
    }
  };

  const handleToggleFavorite = async (
    id: string,
    questionId: string,
    currentIsMine?: boolean
  ) => {
    if (!isLoggedIn()) {
      alert("로그인이 필요합니다.");
      return;
    }

    setIsRemoving(id);

    try {
      if (viewMode === "personal") {
        // 개인 공간: 찜 off하면 목록에서 제거
        await removeFavoriteApi(questionId);
        setFavorites((prev) => prev.filter((f) => f.id !== id));
        setSelectedIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      } else {
        // 팀 스페이스: 찜 토글
        if (currentIsMine) {
          // 찜 off
          await removeFavoriteApi(questionId);
          // 내가 찜을 off했으므로 isMine을 false로 변경
          // 다른 팀원이 찜하고 있는지 확인하기 위해 목록 다시 로드
          await loadFavorites();
        } else {
          // 찜 on
          await addFavoriteApi(questionId);
          // 목록 다시 로드하여 isMine 상태 업데이트
          await loadFavorites();
        }
      }
      // 관련 캐시 삭제
      cache.deletePattern("^favorites:");
    } catch (error) {
      console.error("찜 토글 실패:", error);
      alert("찜하기에 실패했습니다.");
    } finally {
      setIsRemoving(null);
    }
  };

  // 선택한 질문들 중 내가 찜한 것들만 찜 해제
  const handleUnfavoriteSelected = async () => {
    if (!isLoggedIn()) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (selectedIds.size === 0) return;

    // 선택한 질문들 중 내가 찜한 것들만 필터링
    const favoritesToUnfavorite = favorites.filter((fav) => {
      if (!selectedIds.has(fav.id)) return false;

      if (viewMode === "personal") {
        return true; // 개인 공간에서는 모두 내가 찜한 것
      } else {
        // 팀 스페이스에서는 isMine이 true인 것만
        const favoriteWithMine = fav as FavoriteQuestion & {
          isMine?: boolean;
        };
        return favoriteWithMine.isMine ?? false;
      }
    });

    if (favoritesToUnfavorite.length === 0) {
      alert("선택한 질문 중 찜 해제할 수 있는 질문이 없습니다.");
      return;
    }

    setIsRemoving("bulk");

    try {
      // 선택한 질문들 중 내가 찜한 것들만 찜 해제
      await Promise.all(
        favoritesToUnfavorite.map((fav) => removeFavoriteApi(fav.questionId))
      );

      // 목록 다시 로드
      await loadFavorites();

      // 선택 해제
      setSelectedIds(new Set());

      // 관련 캐시 삭제
      cache.deletePattern("^favorites:");
    } catch (error) {
      console.error("찜 해제 실패:", error);
      alert("찜 해제에 실패했습니다.");
    } finally {
      setIsRemoving(null);
    }
  };

  // 면접 시작
  const handleStartInterview = async () => {
    if (!isLoggedIn()) {
      alert("로그인이 필요합니다.");
      router.push("/auth");
      return;
    }

    if (selectedIds.size === 0) {
      alert("최소 1개 이상의 질문을 선택해주세요.");
      return;
    }

    if (!interviewTitle.trim()) {
      alert("면접 제목을 입력해주세요.");
      return;
    }

    setIsCreatingSession(true);

    try {
      // 선택한 질문들만 필터링
      const selectedQuestions = favorites.filter((f) => selectedIds.has(f.id));

      // 세션 생성 (questionId 포함)
      const sessionData = await createSessionApi(
        interviewTitle.trim(),
        selectedQuestions.map((q) => ({
          content: q.content,
          hint: q.hint,
          category: q.category,
          questionId: q.questionId, // 기존 질문 ID 전달
        }))
      );

      // 면접 페이지로 이동
      router.push(`/interview?session=${sessionData.session.id}`);
    } catch (error) {
      console.error("세션 생성 실패:", error);
      alert("면접 시작에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsCreatingSession(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <main className="min-h-screen grain">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-navy/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full px-6 py-4 border-b border-border/50">
        <nav className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>홈</span>
          </Link>
          <Link href="/" className="flex items-center gap-1">
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
        </nav>
      </header>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Heart className="w-6 h-6 text-red-500 fill-red-500" />
            <h1 className="font-display text-3xl font-semibold">찜한 질문</h1>
          </div>
          <p className="text-muted-foreground">
            관심 있는 질문을 모아서 집중적으로 연습하세요.
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-4 mb-6"
        >
          <Link href="/archive">
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-gold/10 group"
            >
              <Archive className="w-4 h-4 mr-2 group-hover:text-gold transition-colors" />
              아카이브
            </Button>
          </Link>
          <Link href="/favorites">
            <Button variant="default" size="sm" className="bg-navy">
              <Heart className="w-4 h-4 mr-2" />
              찜한 질문
            </Button>
          </Link>
        </motion.div>

        {/* 개인/팀 스페이스 전환 (페이지 내부 뷰만 변경) */}
        {isLoggedIn() &&
          isMounted &&
          teamSpaces.length > 0 &&
          actualTeamSpaceId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 mb-6"
            >
              <Button
                variant={viewMode === "personal" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setViewMode("personal");
                }}
              >
                개인 공간
              </Button>
              {(() => {
                const currentTeamSpace = actualTeamSpaceId
                  ? teamSpaces.find((ts) => ts.id === actualTeamSpaceId)
                  : null;

                return currentTeamSpace ? (
                  <Button
                    variant={viewMode === "team" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setViewMode("team");
                    }}
                  >
                    {currentTeamSpace.avatar_url ? (
                      <img
                        src={currentTeamSpace.avatar_url}
                        alt={currentTeamSpace.name}
                        className="w-4 h-4 rounded mr-1 object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <Users className="w-4 h-4 mr-1" />
                    )}
                    {currentTeamSpace.name}
                  </Button>
                ) : null;
              })()}
            </motion.div>
          )}

        {/* Favorites List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gold" />
          </div>
        ) : favorites.length === 0 ? (
          <Card className="p-12 text-center">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-xl font-semibold mb-2">
              찜한 질문이 없습니다
            </h2>
            <p className="text-muted-foreground mb-6">
              면접 중에 마음에 드는 질문을 찜해보세요.
            </p>
            <Link href="/">
              <Button className="bg-navy hover:bg-navy-light">
                면접 시작하기
              </Button>
            </Link>
          </Card>
        ) : (
          <>
            {/* Actions Bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex items-center justify-between mb-4"
            >
              <div className="flex items-center gap-3">
                <div
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelectAll();
                    }
                  }}
                >
                  <Checkbox
                    checked={selectedIds.size === favorites.length}
                    onCheckedChange={handleSelectAll}
                  />
                  전체 선택
                </div>
                <span className="text-sm text-muted-foreground">
                  총 {favorites.length}개
                </span>
              </div>

              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2">
                  {/* 선택한 질문들 중 내가 찜한 것들만 찜 해제 */}
                  {(() => {
                    const myFavoritedCount = favorites.filter((fav) => {
                      if (!selectedIds.has(fav.id)) return false;
                      if (viewMode === "personal") return true;
                      const favoriteWithMine = fav as FavoriteQuestion & {
                        isMine?: boolean;
                      };
                      return favoriteWithMine.isMine ?? false;
                    }).length;

                    return myFavoritedCount > 0 ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleUnfavoriteSelected}
                        disabled={isRemoving === "bulk"}
                        className="text-destructive hover:text-destructive hover:bg-red-50/50"
                      >
                        {isRemoving === "bulk" ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Heart className="w-4 h-4 mr-2 fill-red-500 text-red-500" />
                        )}
                        찜 해제 ({myFavoritedCount})
                      </Button>
                    ) : null;
                  })()}
                  <Button
                    size="sm"
                    className="bg-gold/50 hover:bg-gold/70 text-navy"
                    onClick={() => {
                      setInterviewTitle("");
                      setShowStartInterviewDialog(true);
                    }}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    선택한 {selectedIds.size}개로 연습하기
                  </Button>
                </div>
              )}
            </motion.div>

            <div className="space-y-4">
              {favorites.map((favorite, index) => (
                <motion.div
                  key={favorite.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className={`p-5 transition-all group ${
                      selectedIds.has(favorite.id)
                        ? "ring-2 ring-gold/50 bg-gold/5"
                        : "hover:shadow-elegant"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={selectedIds.has(favorite.id)}
                        onCheckedChange={() => handleToggleSelect(favorite.id)}
                        className="mt-1"
                      />

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-foreground leading-relaxed flex-1">
                            {favorite.content}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {favorite.category}
                          </Badge>
                          <span>{formatDate(favorite.savedAt)}</span>
                          {/* 팀 스페이스인 경우 찜한 사용자 태그들 */}
                          {viewMode === "team" &&
                            (
                              favorite as FavoriteQuestion & {
                                favoritedBy?: Array<{
                                  id: string;
                                  username: string;
                                  nickname: string | null;
                                  shared_at: string;
                                  is_mine: boolean;
                                }>;
                              }
                            ).favoritedBy &&
                            (
                              favorite as FavoriteQuestion & {
                                favoritedBy?: Array<{
                                  id: string;
                                  username: string;
                                  nickname: string | null;
                                  shared_at: string;
                                  is_mine: boolean;
                                }>;
                              }
                            ).favoritedBy &&
                            (
                              favorite as FavoriteQuestion & {
                                favoritedBy?: Array<{
                                  id: string;
                                  username: string;
                                  nickname: string | null;
                                  shared_at: string;
                                  is_mine: boolean;
                                }>;
                              }
                            ).favoritedBy!.map((user) => (
                              <Badge
                                key={user.id}
                                variant="outline"
                                className="text-xs"
                              >
                                <Users className="w-3 h-3 mr-1" />
                                {user.nickname || user.username}
                              </Badge>
                            ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isLoggedIn() && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted/50"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFavoriteId(favorite.id);
                              setShowShareDialog(true);
                            }}
                          >
                            <Share2 className="w-4 h-4 mr-1" />
                            공유
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            const favoriteWithMine =
                              favorite as FavoriteQuestion & {
                                isMine?: boolean;
                              };
                            handleToggleFavorite(
                              favorite.id,
                              favorite.questionId,
                              viewMode === "personal"
                                ? true
                                : favoriteWithMine.isMine
                            );
                          }}
                          disabled={isRemoving === favorite.id}
                          className="hover:bg-red-50/50"
                        >
                          {isRemoving === favorite.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            (() => {
                              const favoriteWithMine =
                                favorite as FavoriteQuestion & {
                                  isMine?: boolean;
                                };
                              const isMine =
                                viewMode === "personal"
                                  ? true
                                  : favoriteWithMine.isMine ?? false;
                              return (
                                <Heart
                                  className={`w-4 h-4 transition-colors ${
                                    isMine
                                      ? "fill-red-500 text-red-500"
                                      : "text-muted-foreground hover:text-red-400"
                                  }`}
                                />
                              );
                            })()
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Login Prompt Modal */}
      <LoginPromptModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        type="archive"
        onLater={handleLater}
      />

      {/* Share Dialog */}
      {isLoggedIn() && selectedFavoriteId && (
        <ShareToTeamSpaceDialog
          open={showShareDialog}
          onOpenChange={(open) => {
            setShowShareDialog(open);
            if (!open) {
              setSelectedFavoriteId(null);
            }
          }}
          type="favorite"
          favoriteId={selectedFavoriteId}
        />
      )}

      {/* 면접 시작 모달 */}
      <Dialog
        open={showStartInterviewDialog}
        onOpenChange={setShowStartInterviewDialog}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>면접 시작하기</DialogTitle>
            <DialogDescription>
              면접 제목을 입력하고 선택한 질문으로 면접을 시작하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* 면접 제목 입력 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">면접 제목</label>
              <Input
                placeholder="예: 프론트엔드 개발자 면접"
                value={interviewTitle}
                onChange={(e) => setInterviewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && interviewTitle.trim()) {
                    handleStartInterview();
                  }
                }}
              />
            </div>

            {/* 선택한 질문 목록 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                선택한 질문 ({selectedIds.size}개)
              </label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-lg p-4">
                {favorites
                  .filter((f) => selectedIds.has(f.id))
                  .map((favorite, index) => (
                    <Card key={favorite.id} className="p-3 bg-background">
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gold/10 flex items-center justify-center">
                          <span className="text-xs font-semibold text-gold">
                            {index + 1}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <Badge variant="outline" className="text-xs mb-1">
                            {favorite.category}
                          </Badge>
                          <p className="text-sm leading-relaxed line-clamp-2">
                            {favorite.content}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowStartInterviewDialog(false);
                  setInterviewTitle("");
                }}
              >
                취소
              </Button>
              <Button
                onClick={handleStartInterview}
                disabled={
                  !interviewTitle.trim() ||
                  selectedIds.size === 0 ||
                  isCreatingSession
                }
                className="bg-navy hover:bg-navy-light"
              >
                {isCreatingSession ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    시작 중...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    면접 시작하기
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
