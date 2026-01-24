"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Archive,
  ArrowLeft,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Heart,
  Loader2,
  Play,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Link from "next/link";
import Image from "next/image";
import logoImage from "@/assets/images/logo.png";
import logoTextImage from "@/assets/images/logo-text.png";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

import type { InterviewSession } from "@/types/interview";
import {
  getSessionsApi,
  deleteSessionApi,
  getSessionByIdApi,
  toggleFavoriteApi,
  isLoggedIn,
  getTeamSpacesApi,
  getCurrentUser,
  type ApiSession,
  type ApiSessionDetail,
  type ApiTeamSpace,
} from "@/lib/api";
import { cache, createCacheKey } from "@/lib/cache";
import { formatSecondsKorean } from "@/hooks/useTimer";
import { LoginPromptModal } from "@/components/LoginPromptModal";

export default function ArchivePage() {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [useApi, setUseApi] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  const [isMounted, setIsMounted] = useState(false);
  const [teamSpaces, setTeamSpaces] = useState<ApiTeamSpace[]>([]);
  // 실제 팀 스페이스 액세스 상태 (localStorage에서 읽어옴, 변경하지 않음)
  const [actualTeamSpaceId, setActualTeamSpaceId] = useState<string | null>(
    null
  );
  // 페이지 내부에서만 사용하는 뷰 모드 (localStorage와 무관)
  const [viewMode, setViewMode] = useState<"personal" | "team">("personal");
  // 펼쳐진 세션 ID와 해당 세션의 질문 목록
  const [expandedSessions, setExpandedSessions] = useState<
    Map<string, InterviewSession>
  >(new Map());
  const [loadingQuestions, setLoadingQuestions] = useState<Set<string>>(
    new Set()
  );
  // 진행 중인 로딩 Promise를 저장하는 Map
  const loadingPromisesRef = useRef<
    Map<string, Promise<InterviewSession | null>>
  >(new Map());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [teamSpaceRole, setTeamSpaceRole] = useState<"owner" | "member" | null>(
    null
  );

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

  // 현재 사용자 ID 로드
  useEffect(() => {
    const loadCurrentUser = async () => {
      if (isLoggedIn() && isMounted) {
        try {
          const user = await getCurrentUser();
          setCurrentUserId(user?.id || null);
        } catch (error) {
          console.error("사용자 정보 로드 실패:", error);
        }
      }
    };
    loadCurrentUser();
  }, [isMounted]);

  // 팀 스페이스 목록 및 역할 로드
  useEffect(() => {
    const loadTeamSpaces = async () => {
      if (isLoggedIn() && isMounted) {
        try {
          const response = await getTeamSpacesApi();
          setTeamSpaces(response.teamSpaces);

          // 실제 팀 스페이스 액세스 상태 확인
          if (actualTeamSpaceId) {
            const teamSpace = response.teamSpaces.find(
              (ts) => ts.id === actualTeamSpaceId
            );
            if (teamSpace) {
              setTeamSpaceRole(teamSpace.role);
            } else {
              // 실제 팀 스페이스가 목록에 없으면 개인 공간으로 전환
              setActualTeamSpaceId(null);
              setViewMode("personal");
              setTeamSpaceRole(null);
              if (typeof window !== "undefined") {
                localStorage.removeItem("currentTeamSpaceId");
              }
            }
          } else {
            setTeamSpaceRole(null);
          }
        } catch (error) {
          console.error("팀 스페이스 목록 로드 실패:", error);
        }
      }
    };
    loadTeamSpaces();
  }, [isMounted, actualTeamSpaceId]);

  // API 데이터를 InterviewSession 형태로 변환
  const convertApiSession = (apiSession: ApiSession): InterviewSession => ({
    id: apiSession.id,
    createdAt: apiSession.created_at,
    query: apiSession.query,
    questions: [], // 목록에서는 questions 불필요
    totalTime: apiSession.total_time,
    isCompleted: apiSession.is_completed,
    user_id: apiSession.user_id, // 소유자 ID 추가
    sharedBy: apiSession.shared_by || undefined,
  });

  // 데이터 로드
  const loadSessions = useCallback(async () => {
    setIsLoading(true);

    // 로그인 상태면 API 사용
    if (isLoggedIn()) {
      try {
        const startDate = dateRange.from
          ? format(dateRange.from, "yyyy-MM-dd")
          : null;
        const endDate = dateRange.to
          ? format(dateRange.to, "yyyy-MM-dd")
          : null;

        // viewMode에 따라 teamSpaceId 결정
        const teamSpaceIdForApi =
          viewMode === "team" && actualTeamSpaceId ? actualTeamSpaceId : null;

        // 캐시 키 생성
        const cacheKey = createCacheKey("archive_sessions", {
          viewMode,
          teamSpaceId: teamSpaceIdForApi || "null",
          startDate: startDate || "null",
          endDate: endDate || "null",
        });

        // 캐시 확인
        const cachedData = cache.get<InterviewSession[]>(cacheKey);
        if (cachedData) {
          setSessions(cachedData);
          setUseApi(true);
          setIsLoading(false);
          // 백그라운드에서 최신 데이터 가져오기
          getSessionsApi(1, 50, {
            teamSpaceId: teamSpaceIdForApi,
            startDate,
            endDate,
          })
            .then((response) => {
              const converted = response.sessions.map(convertApiSession);
              // 캐시 TTL 5분으로 설정
              cache.set(cacheKey, converted, 5 * 60 * 1000);
              setSessions(converted);
            })
            .catch((error) => {
              console.error("백그라운드 데이터 업데이트 실패:", error);
            });
          return;
        }

        const response = await getSessionsApi(1, 50, {
          teamSpaceId: teamSpaceIdForApi,
          startDate,
          endDate,
        });
        const converted = response.sessions.map(convertApiSession);
        // 캐시에 저장 (5분 TTL)
        cache.set(cacheKey, converted, 5 * 60 * 1000);
        setSessions(converted);
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
          setSessions([]);
          setUseApi(false);
          setIsLoading(false);
          return;
        }
        setSessions([]);
        setUseApi(true);
        setIsLoading(false);
        return;
      }
    }

    // 로그인하지 않은 경우 빈 배열
    setSessions([]);
    setUseApi(false);
    setIsLoading(false);
  }, [viewMode, actualTeamSpaceId, dateRange]);

  useEffect(() => {
    // 마운트된 후에만 데이터 로드
    if (isMounted) {
      loadSessions();
    }
  }, [loadSessions, isMounted]);

  // 로그인 상태 변경 감지하여 데이터 다시 로드
  useEffect(() => {
    const handleAuthStateChange = () => {
      // 로그인 상태 변경 시 데이터 다시 로드
      loadSessions();
    };

    // 커스텀 이벤트 리스너 (로그인/로그아웃 시)
    window.addEventListener("authStateChanged", handleAuthStateChange);

    // storage 이벤트 리스너 (다른 탭에서 로그인/로그아웃 시)
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === "devinterview_access_token" ||
        e.key === "devinterview_refresh_token"
      ) {
        loadSessions();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("authStateChanged", handleAuthStateChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [loadSessions]);

  // 비로그인 상태이고 세션이 없으면 로그인 유도 모달 표시
  useEffect(() => {
    if (!isLoading && !isLoggedIn() && sessions.length === 0) {
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
  }, [isLoading, sessions.length]);

  const handleLater = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    localStorage.setItem(
      "loginPrompt_archive_dismissedUntil",
      tomorrow.toISOString()
    );
    setShowLoginModal(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 면접 기록을 삭제하시겠습니까?")) return;

    setIsDeleting(id);

    try {
      await deleteSessionApi(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      // 펼쳐진 세션에서도 제거
      setExpandedSessions((prev) => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
      // 관련 캐시 삭제
      cache.deletePattern("^archive_sessions:");
    } catch (error) {
      console.error("삭제 실패:", error);
      alert("면접 기록 삭제에 실패했습니다.");
    } finally {
      setIsDeleting(null);
    }
  };

  // 질문 목록 로드 함수 (캐싱 및 재사용, Promise 기반 대기)
  const loadSessionQuestions = useCallback(
    async (
      sessionId: string,
      skipCache = false
    ): Promise<InterviewSession | null> => {
      // 캐시 확인
      if (!skipCache) {
        const cacheKey = `session_questions:${sessionId}`;
        const cachedData = cache.get<InterviewSession>(cacheKey);
        if (cachedData) {
          return cachedData;
        }
      }

      // 이미 로드 중인 Promise가 있으면 기다림
      const existingPromise = loadingPromisesRef.current.get(sessionId);
      if (existingPromise) {
        return existingPromise;
      }

      // 새로운 로딩 Promise 생성
      const loadPromise = (async (): Promise<InterviewSession | null> => {
        // 질문 로드 시작
        setLoadingQuestions((prev) => new Set(prev).add(sessionId));

        try {
          const apiSession = await getSessionByIdApi(sessionId);
          const sessionWithQuestions: InterviewSession = {
            id: apiSession.id,
            query: apiSession.query,
            createdAt: apiSession.created_at,
            questions: apiSession.questions.map((q) => ({
              id: q.id,
              content: q.content,
              hint: q.hint || "",
              category: q.category.display_name,
              subcategory: q.subcategory?.display_name || undefined,
              answer: q.answer?.content || "",
              timeSpent: q.answer?.time_spent || 0,
              isAnswered: !!q.answer,
              isFavorite: q.is_favorited,
            })),
            totalTime: apiSession.total_time,
            isCompleted: apiSession.is_completed,
            sharedBy: undefined, // ApiSessionDetail에는 shared_by가 없으므로 undefined
          };

          // 캐시에 저장 (5분 TTL)
          const cacheKey = `session_questions:${sessionId}`;
          cache.set(cacheKey, sessionWithQuestions, 5 * 60 * 1000);

          return sessionWithQuestions;
        } catch (error) {
          console.error("질문 로드 실패:", error);
          return null;
        } finally {
          setLoadingQuestions((prev) => {
            const newSet = new Set(prev);
            newSet.delete(sessionId);
            return newSet;
          });
          // Promise 완료 후 Map에서 제거
          loadingPromisesRef.current.delete(sessionId);
        }
      })();

      // Promise를 Map에 저장
      loadingPromisesRef.current.set(sessionId, loadPromise);

      return loadPromise;
    },
    []
  );

  // Prefetch 질문 목록 (호버 시)
  const handlePrefetchQuestions = useCallback(
    async (sessionId: string) => {
      // 이미 펼쳐져 있거나 로드 중이면 무시
      if (expandedSessions.has(sessionId) || loadingQuestions.has(sessionId)) {
        return;
      }

      // 백그라운드에서 로드 (에러는 무시)
      loadSessionQuestions(sessionId).catch(() => {
        // Prefetch 실패는 조용히 무시
      });
    },
    [expandedSessions, loadingQuestions, loadSessionQuestions]
  );

  const handleToggleExpand = async (sessionId: string) => {
    // 이미 펼쳐져 있으면 접기
    if (expandedSessions.has(sessionId)) {
      setExpandedSessions((prev) => {
        const newMap = new Map(prev);
        newMap.delete(sessionId);
        return newMap;
      });
      return;
    }

    // 질문 로드
    const sessionWithQuestions = await loadSessionQuestions(sessionId);
    if (sessionWithQuestions) {
      setExpandedSessions((prev) => {
        const newMap = new Map(prev);
        newMap.set(sessionId, sessionWithQuestions);
        return newMap;
      });
    } else {
      alert("질문 목록을 불러올 수 없습니다.");
    }
  };

  const handleToggleQuestionFavorite = async (
    sessionId: string,
    questionId: string,
    currentIsFavorite: boolean
  ) => {
    if (!isLoggedIn()) {
      alert("로그인이 필요합니다.");
      return;
    }

    const expandedSession = expandedSessions.get(sessionId);
    if (!expandedSession) return;

    const question = expandedSession.questions.find((q) => q.id === questionId);
    if (!question) return;

    try {
      const isFav = await toggleFavoriteApi(questionId, {
        content: question.content,
        hint: question.hint,
        category: question.category,
      });

      // 로컬 상태 업데이트
      setExpandedSessions((prev) => {
        const newMap = new Map(prev);
        const session = newMap.get(sessionId);
        if (session) {
          const updatedSession: InterviewSession = {
            ...session,
            questions: session.questions.map((q) =>
              q.id === questionId ? { ...q, isFavorite: isFav } : q
            ),
          };
          newMap.set(sessionId, updatedSession);

          // 캐시도 업데이트
          const cacheKey = `session_questions:${sessionId}`;
          cache.set(cacheKey, updatedSession, 5 * 60 * 1000);
        }
        return newMap;
      });

      // 세션 목록의 favoriteCount도 업데이트 (선택사항)
      // 이 부분은 필요에 따라 구현할 수 있습니다.
    } catch (error) {
      console.error("찜하기 실패:", error);
      const errorMessage = error instanceof Error ? error.message : "";
      // 이미 찜한 질문인 경우 실제 찜 상태를 확인하여 UI 업데이트
      if (
        errorMessage.includes("이미 찜한 질문") ||
        errorMessage.includes("409")
      ) {
        // 실제 찜 상태를 확인하여 UI 업데이트
        try {
          const { checkFavoriteApi } = await import("@/lib/api");
          const actualIsFavorited = await checkFavoriteApi(questionId);
          setExpandedSessions((prev) => {
            const newMap = new Map(prev);
            const session = newMap.get(sessionId);
            if (session) {
              const updatedSession: InterviewSession = {
                ...session,
                questions: session.questions.map((q) =>
                  q.id === questionId
                    ? { ...q, isFavorite: actualIsFavorited }
                    : q
                ),
              };
              newMap.set(sessionId, updatedSession);

              // 캐시도 업데이트
              const cacheKey = `session_questions:${sessionId}`;
              cache.set(cacheKey, updatedSession, 5 * 60 * 1000);
            }
            return newMap;
          });
        } catch (checkError) {
          console.error("찜 상태 확인 실패:", checkError);
        }
        return;
      }
      alert("찜하기에 실패했습니다.");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
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
      <header className="relative z-10 w-full border-b border-border/50">
        <nav className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
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
            <Archive className="w-6 h-6 text-gold" />
            <h1 className="font-display text-3xl font-semibold">아카이브</h1>
          </div>
          <p className="text-muted-foreground">
            지난 면접 기록을 확인하고 다시 연습해보세요.
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
            <Button variant="default" size="sm" className="bg-navy">
              <Archive className="w-4 h-4 mr-2" />
              아카이브
            </Button>
          </Link>
          <Link href="/favorites">
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-red-50/50 group"
            >
              <Heart className="w-4 h-4 mr-2 group-hover:text-red-500 transition-colors" />
              찜한 질문
            </Button>
          </Link>
        </motion.div>

        {/* Filters */}
        {isLoggedIn() &&
          isMounted &&
          teamSpaces.length > 0 &&
          actualTeamSpaceId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-4 mb-6 flex-wrap"
            >
              {/* 개인/팀 스페이스 전환 (페이지 내부 뷰만 변경) */}
              <div className="flex items-center gap-2">
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
              </div>

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
            </motion.div>
          )}

        {/* Sessions List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gold" />
          </div>
        ) : sessions.length === 0 ? (
          <Card className="p-12 text-center">
            <Archive className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-xl font-semibold mb-2">
              아직 기록이 없습니다
            </h2>
            <p className="text-muted-foreground mb-6">
              새로운 면접을 시작하고 기록을 남겨보세요.
            </p>
            <Link href="/">
              <Button className="bg-navy hover:bg-navy-light">
                면접 시작하기
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {sessions.map((session, index) => {
              const expandedSession = expandedSessions.get(session.id);
              const isExpanded = !!expandedSession;
              const isLoadingQuestions = loadingQuestions.has(session.id);
              const sessionQuestions = expandedSession?.questions || [];
              const answeredCount = sessionQuestions.filter(
                (q) => q.isAnswered
              ).length;
              const totalQuestions = sessionQuestions.length;
              const favoriteCount = sessionQuestions.filter(
                (q) => q.isFavorite
              ).length;

              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="overflow-hidden hover:shadow-elegant transition-shadow group">
                    {/* 카드 헤더 (클릭 가능) */}
                    <div
                      className="p-6 cursor-pointer"
                      onClick={() => handleToggleExpand(session.id)}
                      onMouseEnter={() => handlePrefetchQuestions(session.id)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h2 className="font-display text-lg font-semibold truncate flex-1 min-w-0">
                              {session.query}
                            </h2>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <CalendarIcon className="w-4 h-4" />
                              <span>{formatDate(session.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4" />
                              <span>
                                {formatSecondsKorean(session.totalTime)}
                              </span>
                            </div>
                            {totalQuestions > 0 && (
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>
                                  {answeredCount}/{totalQuestions} 완료
                                </span>
                              </div>
                            )}
                            {favoriteCount > 0 && (
                              <div className="flex items-center gap-1.5">
                                <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                                <span>{favoriteCount}</span>
                              </div>
                            )}
                            {/* 팀 스페이스인 경우 작성자 태그 */}
                            {viewMode === "team" && session.sharedBy && (
                              <Badge variant="outline" className="text-xs">
                                <Users className="w-3 h-3 mr-1" />
                                {session.sharedBy.nickname ||
                                  session.sharedBy.username}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleExpand(session.id);
                            }}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                          <Link
                            href={`/archive/${session.id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted/50"
                            >
                              <Play className="w-4 h-4 mr-1" />
                              보기
                            </Button>
                          </Link>
                          {/* 삭제 버튼: 본인 세션이거나 팀스페이스 소유자인 경우에만 표시 */}
                          {(session.user_id === currentUserId ||
                            (viewMode === "team" &&
                              teamSpaceRole === "owner")) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(session.id);
                              }}
                              disabled={isDeleting === session.id}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-red-50/50"
                            >
                              {isDeleting === session.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 질문 목록 (펼쳐질 때만 표시) */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <Separator />
                          <div className="p-6 bg-muted/20">
                            {isLoadingQuestions ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-gold" />
                              </div>
                            ) : sessionQuestions.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                질문이 없습니다.
                              </p>
                            ) : (
                              <div className="space-y-3">
                                <h3 className="text-sm font-semibold mb-3">
                                  질문 목록 ({sessionQuestions.length}개)
                                </h3>
                                {sessionQuestions.map((question, qIndex) => (
                                  <motion.div
                                    key={question.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{
                                      delay: qIndex * 0.05,
                                      duration: 0.2,
                                    }}
                                  >
                                    <Card className="p-4 bg-background group/question">
                                      <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gold/10 flex items-center justify-center">
                                          <span className="text-xs font-semibold text-gold">
                                            {qIndex + 1}
                                          </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1">
                                            <Badge
                                              variant="outline"
                                              className="text-xs"
                                            >
                                              {question.category}
                                            </Badge>
                                            {question.isAnswered && (
                                              <CheckCircle2 className="w-3 h-3 text-timer-safe" />
                                            )}
                                          </div>
                                          <p className="text-sm leading-relaxed line-clamp-2">
                                            {question.content}
                                          </p>
                                        </div>
                                        {isLoggedIn() && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleToggleQuestionFavorite(
                                                session.id,
                                                question.id,
                                                question.isFavorite
                                              );
                                            }}
                                            className="flex-shrink-0 p-1.5 rounded-full hover:bg-muted transition-colors"
                                            aria-label={
                                              question.isFavorite
                                                ? "찜 취소"
                                                : "찜하기"
                                            }
                                          >
                                            <Heart
                                              className={`w-4 h-4 transition-colors ${
                                                question.isFavorite
                                                  ? "fill-red-500 text-red-500"
                                                  : "text-muted-foreground hover:text-red-400"
                                              }`}
                                            />
                                          </button>
                                        )}
                                      </div>
                                    </Card>
                                  </motion.div>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Login Prompt Modal */}
      <LoginPromptModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        type="archive"
        onLater={handleLater}
      />
    </main>
  );
}
