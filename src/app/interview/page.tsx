"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  Lightbulb,
  Loader2,
  Send,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

import type { InterviewSession } from "@/types/interview";
import {
  getCurrentSession,
  setCurrentSession,
  saveSession,
  toggleFavorite,
} from "@/lib/storage";
import { useTimer, formatSeconds } from "@/hooks/useTimer";

function InterviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session");

  const [session, setSession] = useState<InterviewSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>(
    {}
  );
  const [questionRemainingTimes, setQuestionRemainingTimes] = useState<
    Record<string, number>
  >({});
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Timer hook
  const timer = useTimer({
    initialTime: 180, // 3 minutes
    onTimeUp: () => {
      // Auto move to next or show warning
      if (currentQuestion) {
        setQuestionRemainingTimes((prev) => ({
          ...prev,
          [currentQuestion.id]: 0,
        }));
      }
    },
  });

  // Load session
  useEffect(() => {
    const loadedSession = getCurrentSession();
    if (loadedSession && loadedSession.id === sessionId) {
      setSession(loadedSession);

      // Initialize answers from session
      const initialAnswers: Record<string, string> = {};
      const initialTimes: Record<string, number> = {};
      const initialRemainingTimes: Record<string, number> = {};
      loadedSession.questions.forEach((q) => {
        initialAnswers[q.id] = q.answer || "";
        initialTimes[q.id] = q.timeSpent || 0;
        // 남은 시간 계산: 180초에서 사용한 시간을 뺀 값, 최소 0
        const remaining = Math.max(0, 180 - (q.timeSpent || 0));
        initialRemainingTimes[q.id] = remaining;
      });
      setAnswers(initialAnswers);
      setQuestionTimes(initialTimes);
      setQuestionRemainingTimes(initialRemainingTimes);

      // 첫 번째 질문의 타이머 시작
      const firstQuestion = loadedSession.questions[0];
      if (firstQuestion) {
        const remainingTime = initialRemainingTimes[firstQuestion.id] || 180;
        timer.reset(remainingTime);
        timer.start();
      }
    } else {
      // Session not found, redirect to home
      router.push("/");
    }
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, router]);

  // Track total time
  useEffect(() => {
    const interval = setInterval(() => {
      setTotalElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentQuestion = session?.questions[currentQuestionIndex];

  // 현재 질문의 남은 시간을 업데이트
  useEffect(() => {
    if (!currentQuestion) return;

    const interval = setInterval(() => {
      if (timer.isRunning && timer.time > 0) {
        setQuestionRemainingTimes((prev) => ({
          ...prev,
          [currentQuestion.id]: timer.time,
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQuestion, timer.isRunning, timer.time]);

  const saveCurrentProgress = useCallback(() => {
    if (!session || !currentQuestion) return;

    // 현재 질문의 사용 시간 계산: 180초에서 남은 시간을 뺀 값
    const remainingTime =
      questionRemainingTimes[currentQuestion.id] ?? timer.time;
    const timeSpent = 180 - remainingTime;

    setQuestionTimes((prev) => ({
      ...prev,
      [currentQuestion.id]: timeSpent,
    }));

    // Update session
    const updatedQuestions = session.questions.map((q, idx) => {
      if (idx === currentQuestionIndex) {
        return {
          ...q,
          answer: answers[q.id] || "",
          timeSpent: timeSpent,
          isAnswered: (answers[q.id] || "").trim().length > 0,
        };
      }
      return {
        ...q,
        answer: answers[q.id] || "",
        timeSpent: questionTimes[q.id] || 0,
        isAnswered: (answers[q.id] || "").trim().length > 0,
      };
    });

    const updatedSession: InterviewSession = {
      ...session,
      questions: updatedQuestions,
      totalTime: totalElapsedTime,
    };

    setSession(updatedSession);
    setCurrentSession(updatedSession);
  }, [
    session,
    currentQuestion,
    currentQuestionIndex,
    answers,
    questionTimes,
    questionRemainingTimes,
    timer.time,
    totalElapsedTime,
  ]);

  const handleAnswerChange = (value: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0 && session) {
      // 현재 질문의 남은 시간 저장
      if (currentQuestion) {
        setQuestionRemainingTimes((prev) => ({
          ...prev,
          [currentQuestion.id]: timer.time,
        }));
      }

      saveCurrentProgress();
      timer.pause();

      const newIndex = currentQuestionIndex - 1;
      const newQuestion = session.questions[newIndex];

      // 새 질문의 남은 시간 불러오기
      const remainingTime = questionRemainingTimes[newQuestion.id] ?? 180;
      timer.reset(remainingTime);

      setCurrentQuestionIndex(newIndex);
      setShowHint(false);
      timer.start();
    }
  };

  const handleNext = () => {
    if (!session) return;

    // 현재 질문의 남은 시간 저장
    if (currentQuestion) {
      setQuestionRemainingTimes((prev) => ({
        ...prev,
        [currentQuestion.id]: timer.time,
      }));
    }

    saveCurrentProgress();
    timer.pause();

    if (currentQuestionIndex < session.questions.length - 1) {
      const newIndex = currentQuestionIndex + 1;
      const newQuestion = session.questions[newIndex];

      // 새 질문의 남은 시간 불러오기
      const remainingTime = questionRemainingTimes[newQuestion.id] ?? 180;
      timer.reset(remainingTime);

      setCurrentQuestionIndex(newIndex);
      setShowHint(false);
      timer.start();
    }
  };

  const handleGoToQuestion = (index: number) => {
    if (!session) return;

    // 현재 질문의 남은 시간 저장
    if (currentQuestion) {
      setQuestionRemainingTimes((prev) => ({
        ...prev,
        [currentQuestion.id]: timer.time,
      }));
    }

    saveCurrentProgress();
    timer.pause();

    const newQuestion = session.questions[index];

    // 새 질문의 남은 시간 불러오기
    const remainingTime = questionRemainingTimes[newQuestion.id] ?? 180;
    timer.reset(remainingTime);

    setCurrentQuestionIndex(index);
    setShowHint(false);
    timer.start();
  };

  const handleToggleFavorite = () => {
    if (!currentQuestion || !session) return;

    const isFav = toggleFavorite(currentQuestion.id, {
      content: currentQuestion.content,
      hint: currentQuestion.hint,
      category: currentQuestion.category,
    });

    const updatedQuestions = session.questions.map((q) =>
      q.id === currentQuestion.id ? { ...q, isFavorite: isFav } : q
    );

    const updatedSession = { ...session, questions: updatedQuestions };
    setSession(updatedSession);
    setCurrentSession(updatedSession);
  };

  const handleSubmit = () => {
    if (!session) return;

    saveCurrentProgress();

    // Final update
    const updatedQuestions = session.questions.map((q) => ({
      ...q,
      answer: answers[q.id] || "",
      isAnswered: (answers[q.id] || "").trim().length > 0,
    }));

    const completedSession: InterviewSession = {
      ...session,
      questions: updatedQuestions,
      totalTime: totalElapsedTime,
      isCompleted: true,
    };

    // Save to archive
    saveSession(completedSession);
    setCurrentSession(null);

    // Navigate to complete page
    router.push(`/complete?session=${session.id}`);
  };

  const getTimerColor = () => {
    if (timer.percentage > 50) return "text-timer-safe";
    if (timer.percentage > 20) return "text-timer-warning";
    return "text-timer-danger timer-pulse";
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
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-gold" />
            </div>
            <span className="font-display text-lg font-semibold tracking-tight hidden sm:inline">
              DevInterview
            </span>
          </Link>

          {/* Timer */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              각 질문은 3분의 시간이 주어집니다
            </span>
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-full bg-card border ${getTimerColor()}`}
            >
              <Clock className="w-4 h-4" />
              <span className="font-mono text-lg font-semibold tabular-nums">
                {timer.formatTime()}
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
