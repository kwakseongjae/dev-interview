"use client";

import { useEffect, useState, useCallback, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CloudCheck,
  Heart,
  Lightbulb,
  Loader2,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import Image from "next/image";
import logoImage from "@/assets/images/logo.png";
import logoTextImage from "@/assets/images/logo-text.png";

import type { InterviewSession } from "@/types/interview";
import {
  isLoggedIn,
  submitAnswerApi,
  completeSessionApi,
  toggleFavoriteApi,
  getSessionByIdApi,
  type ApiSessionDetail,
} from "@/lib/api";
import { formatSeconds } from "@/hooks/useTimer";

// 로컬 스토리지 키 생성
const getStorageKey = (sessionId: string) => `interview_progress_${sessionId}`;

// 로컬 스토리지에 저장할 데이터 타입
interface LocalProgress {
  answers: Record<string, string>;
  currentQuestionIndex: number;
  totalElapsedTime: number;
  savedAt: number; // timestamp
}

function InterviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session");

  const [session, setSession] = useState<InterviewSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isRestoredFromLocal, setIsRestoredFromLocal] = useState(false);

  // 총 소요시간 트래킹용 ref
  const totalTimeRef = useRef(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 로컬 스토리지에 진행상황 저장
  const saveToLocal = useCallback(() => {
    if (!sessionId) return;

    const now = Date.now();
    const progress: LocalProgress = {
      answers,
      currentQuestionIndex,
      totalElapsedTime: totalTimeRef.current,
      savedAt: now,
    };

    try {
      localStorage.setItem(getStorageKey(sessionId), JSON.stringify(progress));
      setLastSavedAt(new Date(now));
    } catch (error) {
      console.error("로컬 저장 실패:", error);
    }
  }, [sessionId, answers, currentQuestionIndex]);

  // 로컬 스토리지에서 진행상황 복원
  const loadFromLocal = useCallback((): LocalProgress | null => {
    if (!sessionId) return null;

    try {
      const saved = localStorage.getItem(getStorageKey(sessionId));
      if (!saved) return null;

      const progress: LocalProgress = JSON.parse(saved);

      // 24시간 이상 지난 데이터는 무시
      const hoursSinceSave = (Date.now() - progress.savedAt) / (1000 * 60 * 60);
      if (hoursSinceSave > 24) {
        localStorage.removeItem(getStorageKey(sessionId));
        return null;
      }

      return progress;
    } catch (error) {
      console.error("로컬 데이터 로드 실패:", error);
      return null;
    }
  }, [sessionId]);

  // 로컬 스토리지 클린업
  const clearLocalProgress = useCallback(() => {
    if (!sessionId) return;

    try {
      localStorage.removeItem(getStorageKey(sessionId));
    } catch (error) {
      console.error("로컬 데이터 삭제 실패:", error);
    }
  }, [sessionId]);

  // API 데이터를 InterviewSession 형태로 변환
  const convertApiSession = (
    apiSession: ApiSessionDetail,
  ): InterviewSession => ({
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
  });

  // Load session
  useEffect(() => {
    const loadSession = async () => {
      if (!sessionId) {
        router.push("/");
        return;
      }

      if (!isLoggedIn()) {
        router.push("/");
        return;
      }

      try {
        const apiSession = await getSessionByIdApi(sessionId);
        const loadedSession = convertApiSession(apiSession);

        setSession(loadedSession);

        // 로컬 스토리지에서 진행상황 복원 시도
        const localProgress = loadFromLocal();

        if (localProgress) {
          // 로컬에 저장된 데이터가 있으면 복원
          setIsRestoredFromLocal(true);

          // 로컬 답변과 서버 답변 병합 (로컬 우선, 단 비어있으면 서버 데이터 사용)
          const mergedAnswers: Record<string, string> = {};
          loadedSession.questions.forEach((q) => {
            const localAnswer = localProgress.answers[q.id];
            const serverAnswer = q.answer || "";
            // 로컬에 답변이 있으면 로컬 사용, 없으면 서버 데이터 사용
            mergedAnswers[q.id] =
              localAnswer !== undefined && localAnswer !== ""
                ? localAnswer
                : serverAnswer;
          });

          setAnswers(mergedAnswers);
          setCurrentQuestionIndex(localProgress.currentQuestionIndex);

          // 소요시간: 로컬 시간과 서버 시간 중 큰 값 사용
          const restoredTime = Math.max(
            localProgress.totalElapsedTime,
            loadedSession.totalTime,
          );
          setTotalElapsedTime(restoredTime);
          totalTimeRef.current = restoredTime;

          // 복원 알림을 3초 후에 숨김
          setTimeout(() => setIsRestoredFromLocal(false), 3000);
        } else {
          // 로컬 데이터 없으면 서버 데이터로 초기화
          const initialAnswers: Record<string, string> = {};
          loadedSession.questions.forEach((q) => {
            initialAnswers[q.id] = q.answer || "";
          });
          setAnswers(initialAnswers);

          // 기존 세션의 총 소요시간이 있으면 이어서 카운트
          if (loadedSession.totalTime > 0) {
            setTotalElapsedTime(loadedSession.totalTime);
            totalTimeRef.current = loadedSession.totalTime;
          }
        }
      } catch (error) {
        console.error("세션 로드 실패:", error);
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [sessionId, router, loadFromLocal]);

  // Track total time - 안정적인 타이머 로직
  useEffect(() => {
    // 컴포넌트 마운트 시 타이머 시작
    timerIntervalRef.current = setInterval(() => {
      totalTimeRef.current += 1;
      setTotalElapsedTime(totalTimeRef.current);
    }, 1000);

    // 컴포넌트 언마운트 시 정리
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, []);

  // 10초마다 로컬 스토리지에 자동 저장
  useEffect(() => {
    if (!session || isLoading) return;

    // 10초마다 자동 저장
    autoSaveIntervalRef.current = setInterval(() => {
      saveToLocal();
    }, 10000);

    // 페이지 이탈 전 저장 (beforeunload)
    const handleBeforeUnload = () => {
      saveToLocal();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    // 컴포넌트 언마운트 시 정리
    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [session, isLoading, saveToLocal]);

  const currentQuestion = session?.questions[currentQuestionIndex];

  const saveCurrentProgress = useCallback(() => {
    if (!session || !currentQuestion) return;

    // Update session with current answers
    const updatedQuestions = session.questions.map((q) => ({
      ...q,
      answer: answers[q.id] || "",
      isAnswered: (answers[q.id] || "").trim().length > 0,
    }));

    const updatedSession: InterviewSession = {
      ...session,
      questions: updatedQuestions,
      totalTime: totalTimeRef.current,
    };

    setSession(updatedSession);
  }, [session, currentQuestion, answers]);

  const handleAnswerChange = (value: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0 && session) {
      saveCurrentProgress();
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setShowHint(false);
    }
  };

  const handleNext = () => {
    if (!session) return;

    saveCurrentProgress();

    if (currentQuestionIndex < session.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowHint(false);
    }
  };

  const handleGoToQuestion = (index: number) => {
    if (!session) return;

    saveCurrentProgress();
    setCurrentQuestionIndex(index);
    setShowHint(false);
  };

  const handleToggleFavorite = async () => {
    if (!currentQuestion || !session) return;

    // 로그인한 유저만 찜하기 가능
    if (!isLoggedIn()) {
      alert("찜하기 기능은 로그인이 필요합니다.");
      return;
    }

    try {
      const isFav = await toggleFavoriteApi(currentQuestion.id, {
        content: currentQuestion.content,
        hint: currentQuestion.hint,
        category: currentQuestion.category,
      });

      const updatedQuestions = session.questions.map((q) =>
        q.id === currentQuestion.id ? { ...q, isFavorite: isFav } : q,
      );

      const updatedSession = { ...session, questions: updatedQuestions };
      setSession(updatedSession);
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
          const actualIsFavorited = await checkFavoriteApi(currentQuestion.id);
          const updatedQuestions = session.questions.map((q) =>
            q.id === currentQuestion.id
              ? { ...q, isFavorite: actualIsFavorited }
              : q,
          );
          const updatedSession = { ...session, questions: updatedQuestions };
          setSession(updatedSession);
        } catch (checkError) {
          console.error("찜 상태 확인 실패:", checkError);
        }
        return;
      }
      alert("찜하기에 실패했습니다.");
    }
  };

  const handleSubmit = async () => {
    if (!session) return;

    // 타이머 및 자동저장 정지
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (autoSaveIntervalRef.current) {
      clearInterval(autoSaveIntervalRef.current);
      autoSaveIntervalRef.current = null;
    }

    const finalTotalTime = totalTimeRef.current;

    // Final update
    const updatedQuestions = session.questions.map((q) => ({
      ...q,
      answer: answers[q.id] || "",
      isAnswered: (answers[q.id] || "").trim().length > 0,
    }));

    // 로그인 상태면 API로 답변 제출 및 서버에 저장
    if (isLoggedIn()) {
      try {
        // 각 질문에 대한 답변을 API로 제출
        for (const question of updatedQuestions) {
          if (question.answer && question.answer.trim().length > 0) {
            await submitAnswerApi(
              session.id,
              question.id,
              question.answer,
              0, // timeSpent는 더 이상 사용하지 않음
            );
          }
        }

        // 세션 완료 처리 - 총 소요시간만 전달
        await completeSessionApi(session.id, finalTotalTime);

        // 제출 성공 시 로컬 스토리지 클린업
        clearLocalProgress();

        // Navigate to complete page
        router.push(`/complete?session=${session.id}`);
        return;
      } catch (error) {
        console.error("API 제출 실패:", error);
        alert("세션 저장에 실패했습니다. 다시 시도해주세요.");

        // 에러 발생 시 타이머 및 자동저장 다시 시작
        timerIntervalRef.current = setInterval(() => {
          totalTimeRef.current += 1;
          setTotalElapsedTime(totalTimeRef.current);
        }, 1000);
        autoSaveIntervalRef.current = setInterval(() => {
          saveToLocal();
        }, 10000);
        return;
      }
    } else {
      // 로그인하지 않은 경우
      alert("로그인이 필요합니다.");
      router.push("/auth");
    }
  };

  const isQuestionAnswered = (questionId: string) => {
    return (answers[questionId] || "").trim().length > 0;
  };

  const answeredCount =
    session?.questions.filter((q) => isQuestionAnswered(q.id)).length || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  if (!session || !currentQuestion) {
    return null;
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-6 py-3">
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
              className="h-5 w-auto object-contain hidden sm:block"
              priority
            />
          </Link>

          {/* Total Time & Auto-save indicator */}
          <div className="flex items-center gap-4">
            {isRestoredFromLocal ? (
              <div className="flex items-center gap-1.5 text-xs text-gold animate-pulse">
                <CloudCheck className="w-3.5 h-3.5" />
                <span>진행상황 복원됨</span>
              </div>
            ) : lastSavedAt ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CloudCheck className="w-3.5 h-3.5 text-timer-safe" />
                <span className="hidden sm:inline">자동 저장됨</span>
              </div>
            ) : null}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>소요 시간</span>
              <span className="font-mono font-medium text-foreground tabular-nums">
                {formatSeconds(totalElapsedTime)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card/50">
          <div className="p-4">
            <h2 className="font-display text-lg font-semibold mb-1">
              질문 목록
            </h2>
            <p className="text-sm text-muted-foreground">
              {answeredCount}/{session.questions.length} 완료
            </p>
          </div>

          <Separator />

          <nav className="flex-1 p-4 space-y-2">
            {session.questions.map((question, index) => (
              <button
                key={question.id}
                onClick={() => handleGoToQuestion(index)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors
                  ${
                    index === currentQuestionIndex
                      ? "bg-navy text-primary-foreground"
                      : "hover:bg-muted"
                  }
                `}
              >
                <div
                  className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                    ${
                      isQuestionAnswered(question.id)
                        ? "bg-timer-safe text-white"
                        : index === currentQuestionIndex
                          ? "bg-gold text-navy"
                          : "bg-muted-foreground/20 text-muted-foreground"
                    }
                  `}
                >
                  {isQuestionAnswered(question.id) ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="text-sm truncate">Q{index + 1}</span>
                {question.isFavorite && (
                  <Heart className="w-3 h-3 fill-red-500 text-red-500 ml-auto flex-shrink-0" />
                )}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-border">
            <Button
              onClick={handleSubmit}
              className="w-full bg-gold hover:bg-gold-light text-navy font-semibold"
              size="lg"
            >
              <Send className="w-4 h-4 mr-2" />
              제출하기
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              총 소요 시간: {formatSeconds(totalElapsedTime)}
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-6 md:p-8 max-w-4xl mx-auto w-full">
            {/* Question */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Question Header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">
                        {currentQuestion.category}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        질문 {currentQuestionIndex + 1}/
                        {session.questions.length}
                      </span>
                    </div>
                    <h1 className="font-display text-2xl md:text-3xl font-semibold leading-snug">
                      {currentQuestion.content}
                    </h1>
                  </div>
                  <button
                    onClick={handleToggleFavorite}
                    className="p-2 rounded-full hover:bg-muted transition-colors flex-shrink-0"
                    aria-label={
                      currentQuestion.isFavorite ? "찜 취소" : "찜하기"
                    }
                  >
                    <Heart
                      className={`w-6 h-6 transition-colors ${
                        currentQuestion.isFavorite
                          ? "fill-red-500 text-red-500"
                          : "text-muted-foreground hover:text-red-400"
                      }`}
                    />
                  </button>
                </div>

                {/* Answer Textarea */}
                <Card className="p-1">
                  <Textarea
                    value={answers[currentQuestion.id] || ""}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    placeholder="답변을 입력해주세요..."
                    className="min-h-[250px] text-base border-0 focus-visible:ring-0 resize-none"
                  />
                </Card>

                {/* Hint Section */}
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHint(!showHint)}
                    className="gap-2"
                  >
                    <Lightbulb
                      className={`w-4 h-4 ${showHint ? "text-gold" : ""}`}
                    />
                    {showHint ? "힌트 숨기기" : "힌트 보기"}
                  </Button>

                  <AnimatePresence>
                    {showHint && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <Card className="p-4 bg-gold/5 border-gold/20">
                          <div className="flex items-start gap-3">
                            <Lightbulb className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-sm text-gold mb-1">
                                힌트
                              </p>
                              <p className="text-muted-foreground">
                                {currentQuestion.hint}
                              </p>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentQuestionIndex === 0}
                    className="gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    이전
                  </Button>

                  <div className="flex items-center gap-1">
                    {session.questions.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => handleGoToQuestion(index)}
                        className={`
                          w-2 h-2 rounded-full transition-colors
                          ${
                            index === currentQuestionIndex
                              ? "bg-navy"
                              : isQuestionAnswered(session.questions[index].id)
                                ? "bg-timer-safe"
                                : "bg-muted-foreground/30"
                          }
                        `}
                        aria-label={`질문 ${index + 1}로 이동`}
                      />
                    ))}
                  </div>

                  {currentQuestionIndex < session.questions.length - 1 ? (
                    <Button
                      onClick={handleNext}
                      className="gap-2 bg-navy hover:bg-navy-light"
                    >
                      다음
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmit}
                      className="gap-2 bg-gold hover:bg-gold-light text-navy"
                    >
                      제출하기
                      <Send className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Mobile Bottom Bar */}
          <div className="md:hidden border-t border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">
                {answeredCount}/{session.questions.length} 완료
              </span>
              <span className="text-sm text-muted-foreground">
                {formatSeconds(totalElapsedTime)}
              </span>
            </div>
            <Button
              onClick={handleSubmit}
              className="w-full bg-gold hover:bg-gold-light text-navy font-semibold"
            >
              <Send className="w-4 h-4 mr-2" />
              제출하기
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function InterviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gold" />
        </div>
      }
    >
      <InterviewContent />
    </Suspense>
  );
}
