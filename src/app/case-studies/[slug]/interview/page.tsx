"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CloudCheck,
  Heart,
  Loader2,
  Send,
  BookOpen,
  Target,
  Lightbulb,
  Trophy,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";
import logoImage from "@/assets/images/logo.png";
import logoTextImage from "@/assets/images/logo-text.png";

import {
  isLoggedIn,
  submitAnswerApi,
  completeSessionApi,
  toggleFavoriteApi,
  getSessionByIdApi,
  startCaseStudyInterviewApi,
  getCaseStudyBySlugApi,
} from "@/lib/api";
import { formatSeconds } from "@/hooks/useTimer";
import { HintSection } from "@/components/feedback/HintSection";
import { CompanyLogo } from "@/components/CompanyLogo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { CaseStudy } from "@/types/case-study";
import { LoginPromptModal } from "@/components/LoginPromptModal";

// localStorage 키
const getStorageKey = (slug: string) => `casestudy_interview_${slug}`;

interface LocalProgress {
  sessionId: string;
  answers: Record<string, string>;
  currentQuestionIndex: number;
  totalElapsedTime: number;
  savedAt: number;
  isGuestSession?: boolean;
}

interface SessionQuestion {
  id: string;
  content: string;
  hint: string;
  difficulty: string;
  categories: { name: string; display_name: string };
  order: number;
  isFavorite?: boolean;
}

const SUMMARY_SECTIONS = [
  {
    key: "background" as const,
    label: "배경",
    icon: BookOpen,
    color: "text-blue-600",
  },
  {
    key: "challenge" as const,
    label: "도전 과제",
    icon: Target,
    color: "text-orange-600",
  },
  {
    key: "solution" as const,
    label: "해결 방안",
    icon: Lightbulb,
    color: "text-green-600",
  },
  {
    key: "results" as const,
    label: "결과",
    icon: Trophy,
    color: "text-purple-600",
  },
];

export default function CaseStudyInterviewPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [caseStudy, setCaseStudy] = useState<CaseStudy | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<SessionQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isRestoredFromLocal, setIsRestoredFromLocal] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const totalTimeRef = useRef(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialized = useRef(false);
  const isGuestModeRef = useRef(false);

  // localStorage 저장
  const saveToLocal = useCallback(() => {
    if (!sessionId) return;
    const progress: LocalProgress = {
      sessionId,
      answers,
      currentQuestionIndex,
      totalElapsedTime: totalTimeRef.current,
      savedAt: Date.now(),
      isGuestSession: isGuestModeRef.current,
    };
    try {
      localStorage.setItem(getStorageKey(slug), JSON.stringify(progress));
      setLastSavedAt(new Date());
    } catch (error) {
      console.error("로컬 저장 실패:", error);
    }
  }, [sessionId, answers, currentQuestionIndex, slug]);

  // localStorage 로드
  const loadFromLocal = useCallback((): LocalProgress | null => {
    try {
      const saved = localStorage.getItem(getStorageKey(slug));
      if (!saved) return null;
      const progress: LocalProgress = JSON.parse(saved);
      // 24시간 지난 데이터는 무시
      const hoursSinceSave = (Date.now() - progress.savedAt) / (1000 * 60 * 60);
      if (hoursSinceSave > 24) {
        localStorage.removeItem(getStorageKey(slug));
        return null;
      }
      return progress;
    } catch {
      return null;
    }
  }, [slug]);

  // localStorage 정리
  const clearLocalProgress = useCallback(() => {
    try {
      localStorage.removeItem(getStorageKey(slug));
    } catch {
      // ignore
    }
  }, [slug]);

  // 타이머 시작
  const startTimer = useCallback(() => {
    if (timerIntervalRef.current) return;
    timerIntervalRef.current = setInterval(() => {
      totalTimeRef.current += 1;
      setTotalElapsedTime(totalTimeRef.current);
    }, 1000);
  }, []);

  // 타이머 정지
  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // 자동저장 시작
  const startAutoSave = useCallback(() => {
    if (autoSaveIntervalRef.current) return;
    autoSaveIntervalRef.current = setInterval(() => {
      saveToLocal();
    }, 10000);
  }, [saveToLocal]);

  // 자동저장 정지
  const stopAutoSave = useCallback(() => {
    if (autoSaveIntervalRef.current) {
      clearInterval(autoSaveIntervalRef.current);
      autoSaveIntervalRef.current = null;
    }
  }, []);

  // Guest 모드 초기화: seedQuestions로 로컬 세션 구성
  const initGuestMode = useCallback(
    (csData: CaseStudy, localProgress: LocalProgress | null) => {
      setCaseStudy(csData);
      setIsGuestMode(true);
      isGuestModeRef.current = true;

      // localStorage에 Guest 세션이 남아있으면 복원
      if (localProgress?.sessionId && localProgress.isGuestSession) {
        setSessionId(localProgress.sessionId);
        // seedQuestions 기반으로 질문 복원
        const guestQuestions: SessionQuestion[] = csData.seedQuestions.map(
          (q, i) => ({
            id: localProgress.sessionId + "_q" + i,
            content: q.content,
            hint: q.hint,
            difficulty: "MEDIUM",
            categories: {
              name: q.category.toUpperCase(),
              display_name: q.category,
            },
            order: i + 1,
            isFavorite: false,
          }),
        );
        setQuestions(guestQuestions);

        // 답변 복원
        const restoredAnswers: Record<string, string> = {};
        for (const q of guestQuestions) {
          restoredAnswers[q.id] = localProgress.answers[q.id] || "";
        }
        setAnswers(restoredAnswers);
        setCurrentQuestionIndex(localProgress.currentQuestionIndex);

        const restoredTime = localProgress.totalElapsedTime;
        setTotalElapsedTime(restoredTime);
        totalTimeRef.current = restoredTime;

        setIsRestoredFromLocal(true);
        setTimeout(() => setIsRestoredFromLocal(false), 3000);
      } else {
        // 새 Guest 세션
        const guestSessionId = crypto.randomUUID();
        setSessionId(guestSessionId);

        const guestQuestions: SessionQuestion[] = csData.seedQuestions.map(
          (q, i) => ({
            id: guestSessionId + "_q" + i,
            content: q.content,
            hint: q.hint,
            difficulty: "MEDIUM",
            categories: {
              name: q.category.toUpperCase(),
              display_name: q.category,
            },
            order: i + 1,
            isFavorite: false,
          }),
        );
        setQuestions(guestQuestions);

        const initialAnswers: Record<string, string> = {};
        for (const q of guestQuestions) {
          initialAnswers[q.id] = "";
        }
        setAnswers(initialAnswers);
      }

      setIsLoading(false);
      startTimer();
      startAutoSave();
    },
    [startTimer, startAutoSave],
  );

  // 로그인 후 Guest 답변을 API 세션으로 마이그레이션
  const migrateGuestSession = useCallback(
    async (csData: CaseStudy, localProgress: LocalProgress) => {
      try {
        // API 세션 생성
        const startResult = await startCaseStudyInterviewApi(slug);
        const newSessionId = startResult.session.id;

        // 답변 제출
        for (const q of startResult.questions) {
          // localProgress의 답변을 매칭 (질문 순서 기반)
          const guestQuestionId =
            localProgress.sessionId + "_q" + (q.order - 1);
          const answer = localProgress.answers[guestQuestionId];
          if (answer && answer.trim().length > 0) {
            await submitAnswerApi(newSessionId, q.id, answer, 0);
          }
        }

        // 세션 완료
        await completeSessionApi(newSessionId, localProgress.totalElapsedTime);

        // localStorage 정리
        clearLocalProgress();

        // 완료 페이지로 이동
        router.push(`/complete?session=${newSessionId}`);
      } catch (error) {
        console.error("Guest 세션 마이그레이션 실패:", error);
        // 실패 시 일반 로그인 흐름으로 진행
        clearLocalProgress();
      }
    },
    [slug, router, clearLocalProgress],
  );

  // 초기화
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const init = async () => {
      const loggedIn = isLoggedIn();

      try {
        // localStorage 확인
        const localProgress = loadFromLocal();

        // 로그인 후 돌아온 경우: Guest 데이터가 남아있으면 마이그레이션
        if (loggedIn && localProgress?.isGuestSession) {
          const { caseStudy: csData } = await getCaseStudyBySlugApi(slug);
          setCaseStudy(csData);
          setIsLoading(true);
          await migrateGuestSession(csData, localProgress);
          return;
        }

        if (loggedIn) {
          // 기존 로그인 사용자 흐름
          if (localProgress?.sessionId && !localProgress.isGuestSession) {
            // 기존 세션 복원 시도
            try {
              const apiSession = await getSessionByIdApi(
                localProgress.sessionId,
              );

              if (apiSession.is_completed) {
                clearLocalProgress();
                router.push(`/complete?session=${localProgress.sessionId}`);
                return;
              }

              const { caseStudy: csData } = await getCaseStudyBySlugApi(slug);
              setCaseStudy(csData);

              setSessionId(localProgress.sessionId);
              const restoredQuestions: SessionQuestion[] =
                apiSession.questions.map((q) => ({
                  id: q.id,
                  content: q.content,
                  hint: q.hint || "",
                  difficulty: q.difficulty,
                  categories: q.category,
                  order: q.order,
                  isFavorite: q.is_favorited,
                }));
              setQuestions(restoredQuestions);

              const mergedAnswers: Record<string, string> = {};
              for (const q of restoredQuestions) {
                const localAnswer = localProgress.answers[q.id];
                const serverAnswer =
                  apiSession.questions.find((aq) => aq.id === q.id)?.answer
                    ?.content || "";
                mergedAnswers[q.id] =
                  localAnswer !== undefined && localAnswer !== ""
                    ? localAnswer
                    : serverAnswer;
              }
              setAnswers(mergedAnswers);
              setCurrentQuestionIndex(localProgress.currentQuestionIndex);

              const restoredTime = Math.max(
                localProgress.totalElapsedTime,
                apiSession.total_time,
              );
              setTotalElapsedTime(restoredTime);
              totalTimeRef.current = restoredTime;

              setIsRestoredFromLocal(true);
              setTimeout(() => setIsRestoredFromLocal(false), 3000);

              setIsLoading(false);
              startTimer();
              startAutoSave();
              return;
            } catch {
              clearLocalProgress();
            }
          }

          // 새 세션 생성 (로그인 상태)
          const [startResult, csResult] = await Promise.all([
            startCaseStudyInterviewApi(slug),
            getCaseStudyBySlugApi(slug),
          ]);

          setCaseStudy(csResult.caseStudy);
          setSessionId(startResult.session.id);

          const newQuestions: SessionQuestion[] = startResult.questions.map(
            (q) => ({
              id: q.id,
              content: q.content,
              hint: q.hint,
              difficulty: q.difficulty,
              categories: q.categories,
              order: q.order,
              isFavorite: false,
            }),
          );
          setQuestions(newQuestions);

          const initialAnswers: Record<string, string> = {};
          for (const q of newQuestions) {
            initialAnswers[q.id] = "";
          }
          setAnswers(initialAnswers);

          setIsLoading(false);
          startTimer();
          startAutoSave();
        } else {
          // 비로그인: Guest 모드
          const { caseStudy: csData } = await getCaseStudyBySlugApi(slug);

          if (csData.seedQuestions.length === 0) {
            router.push(`/case-studies/${slug}`);
            return;
          }

          initGuestMode(csData, localProgress);
        }
      } catch (error) {
        console.error("면접 세션 초기화 실패:", error);
        router.push(`/case-studies/${slug}`);
      }
    };

    init();
  }, [
    slug,
    router,
    loadFromLocal,
    clearLocalProgress,
    startTimer,
    startAutoSave,
    initGuestMode,
    migrateGuestSession,
  ]);

  // beforeunload 저장
  useEffect(() => {
    if (isLoading || !sessionId) return;

    const handleBeforeUnload = () => {
      saveToLocal();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isLoading, sessionId, saveToLocal]);

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopTimer();
      stopAutoSave();
    };
  }, [stopTimer, stopAutoSave]);

  const currentQuestion = questions[currentQuestionIndex];

  const handleAnswerChange = (value: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setShowHint(false);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowHint(false);
    }
  };

  const handleGoToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    setShowHint(false);
  };

  const handleToggleFavorite = async () => {
    if (!currentQuestion) return;

    if (isGuestMode) {
      alert("로그인 후 찜하기 기능을 이용할 수 있습니다.");
      return;
    }

    try {
      const isFav = await toggleFavoriteApi(currentQuestion.id, {
        content: currentQuestion.content,
        hint: currentQuestion.hint,
        category: currentQuestion.categories.display_name,
      });

      setQuestions((prev) =>
        prev.map((q) =>
          q.id === currentQuestion.id ? { ...q, isFavorite: isFav } : q,
        ),
      );
    } catch (error) {
      console.error("찜하기 실패:", error);
    }
  };

  const handleSubmit = async () => {
    if (!sessionId || isSubmitting) return;

    // Guest 모드: 로그인 모달 표시
    if (isGuestMode) {
      saveToLocal();
      setShowLoginModal(true);
      return;
    }

    setIsSubmitting(true);
    stopTimer();
    stopAutoSave();

    const finalTotalTime = totalTimeRef.current;

    try {
      // 각 답변 제출
      for (const q of questions) {
        const answer = answers[q.id];
        if (answer && answer.trim().length > 0) {
          await submitAnswerApi(sessionId, q.id, answer, 0);
        }
      }

      // 세션 완료
      await completeSessionApi(sessionId, finalTotalTime);

      // localStorage 정리
      clearLocalProgress();

      // 완료 페이지로 이동
      router.push(`/complete?session=${sessionId}`);
    } catch (error) {
      console.error("제출 실패:", error);
      alert("세션 저장에 실패했습니다. 다시 시도해주세요.");

      // 에러 시 타이머/자동저장 재시작
      setIsSubmitting(false);
      startTimer();
      startAutoSave();
    }
  };

  const isQuestionAnswered = (questionId: string) => {
    return (answers[questionId] || "").trim().length > 0;
  };

  const answeredCount = questions.filter((q) =>
    isQuestionAnswered(q.id),
  ).length;

  if (isLoading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
        <p className="text-sm text-muted-foreground">
          면접 세션을 준비하고 있습니다...
        </p>
      </main>
    );
  }

  if (!caseStudy || !currentQuestion || !sessionId) {
    return null;
  }

  // 사례 참고자료 패널 콘텐츠
  const referenceContent = (
    <div className="space-y-4 p-4">
      {SUMMARY_SECTIONS.map((section) => {
        const Icon = section.icon;
        const content = caseStudy.summary[section.key];
        if (!content) return null;

        return (
          <div key={section.key}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${section.color}`} />
              <h4 className="font-semibold text-sm">{section.label}</h4>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {content}
            </p>
          </div>
        );
      })}

      {caseStudy.summary.keyTakeaways.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-gold" />
            <h4 className="font-semibold text-sm">핵심 인사이트</h4>
          </div>
          <ul className="space-y-1.5">
            {caseStudy.summary.keyTakeaways.map((takeaway, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="text-gold font-medium mt-0.5">{i + 1}.</span>
                <span className="leading-relaxed">{takeaway}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  // 면접 영역 콘텐츠
  const interviewContent = (
    <div className="flex-1 flex flex-col p-4 md:p-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-5 flex-1"
        >
          {/* Question Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">
                  {currentQuestion.categories.display_name}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Q {currentQuestionIndex + 1}/{questions.length}
                </span>
              </div>
              <h2 className="font-display text-xl md:text-2xl font-semibold leading-snug">
                {currentQuestion.content}
              </h2>
            </div>
            <button
              onClick={handleToggleFavorite}
              className="p-2 rounded-full hover:bg-muted transition-colors flex-shrink-0"
              aria-label={currentQuestion.isFavorite ? "찜 취소" : "찜하기"}
            >
              <Heart
                className={`w-5 h-5 transition-colors ${
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
          <HintSection
            hint={currentQuestion.hint}
            isOpen={showHint}
            onToggle={() => setShowHint(!showHint)}
          />

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
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
              {questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleGoToQuestion(index)}
                  className={`
                    w-2 h-2 rounded-full transition-colors
                    ${
                      index === currentQuestionIndex
                        ? "bg-navy"
                        : isQuestionAnswered(questions[index].id)
                          ? "bg-timer-safe"
                          : "bg-muted-foreground/30"
                    }
                  `}
                  aria-label={`질문 ${index + 1}로 이동`}
                />
              ))}
            </div>

            {currentQuestionIndex < questions.length - 1 ? (
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
                disabled={isSubmitting}
                className="gap-2 bg-gold hover:bg-gold-light text-navy"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                제출하기
              </Button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );

  return (
    <main className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 md:px-6 py-3">
          {/* Left: Back + Logo + Title */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/case-studies/${slug}`}
              className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2 min-w-0">
              <CompanyLogo companySlug={caseStudy.companySlug} size={24} />
              <span className="font-medium text-sm truncate hidden sm:inline">
                {caseStudy.title}
              </span>
            </div>
          </div>

          {/* Right: Timer + Save indicator */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {isRestoredFromLocal ? (
              <div className="flex items-center gap-1.5 text-xs text-gold animate-pulse">
                <CloudCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">진행상황 복원됨</span>
              </div>
            ) : lastSavedAt ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CloudCheck className="w-3.5 h-3.5 text-timer-safe" />
                <span className="hidden sm:inline">자동 저장됨</span>
              </div>
            ) : null}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono font-medium text-foreground tabular-nums">
                {formatSeconds(totalElapsedTime)}
              </span>
            </div>
            <Link href="/" className="flex items-center gap-1 flex-shrink-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
                <Image
                  src={logoImage}
                  alt="모카번 Logo"
                  width={32}
                  height={32}
                  className="w-full h-full object-contain"
                />
              </div>
              <Image
                src={logoTextImage}
                alt="모카번"
                width={50}
                height={20}
                className="h-4 w-auto object-contain hidden md:block"
                priority
              />
            </Link>
          </div>
        </div>
      </header>

      {/* Desktop: Split Layout */}
      <div className="flex-1 hidden md:flex overflow-hidden">
        {/* Left: Reference Panel */}
        <aside className="w-[360px] shrink-0 h-full overflow-y-auto border-r border-border bg-card/50">
          <div className="p-4 border-b border-border">
            <h3 className="font-display font-semibold text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              사례 참고자료
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {answeredCount}/{questions.length} 완료
            </p>
          </div>
          {referenceContent}
        </aside>

        {/* Right: Interview Area */}
        <div className="flex-1 h-full overflow-y-auto flex flex-col">
          {interviewContent}
        </div>
      </div>

      {/* Mobile: Accordion + Interview Area */}
      <div className="flex-1 flex flex-col md:hidden">
        {/* Mobile Reference Accordion */}
        <Accordion
          type="single"
          collapsible
          className="border-b border-border px-4"
        >
          <AccordionItem value="reference" className="border-b-0">
            <AccordionTrigger className="text-sm py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span className="font-semibold">사례 참고자료</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>{referenceContent}</AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Mobile Interview Area */}
        <div className="flex-1 overflow-y-auto">{interviewContent}</div>

        {/* Mobile Bottom Bar */}
        <div className="border-t border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">
              {answeredCount}/{questions.length} 완료
            </span>
            <span className="text-sm text-muted-foreground">
              {formatSeconds(totalElapsedTime)}
            </span>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-gold hover:bg-gold-light text-navy font-semibold"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            제출하기
          </Button>
        </div>
      </div>

      {/* Guest 모드: 로그인 유도 모달 */}
      <LoginPromptModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        type="interview"
        onLater={() => {
          // "나중에 하기": localStorage에만 보존, 상세 페이지로 이동
          saveToLocal();
          router.push(`/case-studies/${slug}`);
        }}
      />
    </main>
  );
}
