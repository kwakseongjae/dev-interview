"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Eye,
  Home,
  Loader2,
  Lock,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import logoImage from "@/assets/images/logo.png";
import logoTextImage from "@/assets/images/logo-text.png";
import Confetti from "react-confetti";

import type { InterviewSession } from "@/types/interview";
import {
  isLoggedIn,
  getSessionByIdApi,
  type ApiSessionDetail,
  createSessionApi,
  submitAnswerApi,
  completeSessionApi,
} from "@/lib/api";
import { formatSecondsKorean } from "@/hooks/useTimer";
import { LoginPromptModal } from "@/components/LoginPromptModal";

function CompleteContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  const [session, setSession] = useState<InterviewSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(true);
  const [windowSize, setWindowSize] = useState(() =>
    typeof window !== "undefined"
      ? { width: window.innerWidth, height: window.innerHeight }
      : { width: 0, height: 0 },
  );
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingSession] = useState<InterviewSession | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
      isReferenceBased: q.is_reference_based || false,
      isTrending: q.is_trending || false,
      trendTopic: q.trend_topic || undefined,
    })),
    totalTime: apiSession.total_time,
    isCompleted: apiSession.is_completed,
  });

  useEffect(() => {
    const loadSession = async () => {
      if (!sessionId) {
        setIsLoading(false);
        return;
      }

      // 로그인 여부 관계없이 API에서 세션 조회 (게스트 세션도 접근 가능)
      try {
        const apiSession = await getSessionByIdApi(sessionId);
        setSession(convertApiSession(apiSession));
        setIsLoading(false);
        return;
      } catch (error) {
        console.error("API 조회 실패:", error);
      }

      setSession(null);
      setIsLoading(false);
    };

    loadSession();

    // Stop confetti after 5 seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, [sessionId]);

  const handleSaveSession = useCallback(async () => {
    if (!pendingSession || !isLoggedIn()) return;

    try {
      // 세션 생성
      const sessionData = await createSessionApi(
        pendingSession.query,
        pendingSession.questions.map((q) => ({
          content: q.content,
          hint: q.hint,
          category: q.category,
        })),
      );

      // 세션의 질문 목록 조회하여 질문 ID 매칭
      const sessionDetail = await getSessionByIdApi(sessionData.session.id);

      // 질문 내용으로 매칭하여 답변 제출
      for (const question of pendingSession.questions) {
        if (question.answer && question.answer.trim().length > 0) {
          // 세션의 질문 중 내용이 일치하는 질문 찾기
          const matchedQuestion = sessionDetail.questions.find(
            (sq) => sq.content === question.content,
          );

          if (matchedQuestion) {
            try {
              await submitAnswerApi(
                sessionData.session.id,
                matchedQuestion.id,
                question.answer,
                question.timeSpent || 0,
              );
            } catch (error) {
              console.error(
                `답변 제출 실패 (question ${matchedQuestion.id}):`,
                error,
              );
            }
          }
        }
      }

      // 세션 완료 처리
      await completeSessionApi(
        sessionData.session.id,
        pendingSession.totalTime,
      );

      // 페이지 새로고침하여 저장된 세션 표시
      window.location.href = `/complete?session=${sessionData.session.id}`;
    } catch (error) {
      console.error("세션 저장 실패:", error);
      alert("세션 저장에 실패했습니다. 다시 시도해주세요.");
    }
  }, [pendingSession]);

  // 로그인 상태 변경 감지하여 세션 저장
  useEffect(() => {
    const checkLoginAndSave = async () => {
      if (isLoggedIn() && pendingSession && !session) {
        // 로그인 후 세션 저장
        await handleSaveSession();
      }
    };
    checkLoginAndSave();
  }, [handleSaveSession, pendingSession, session]);

  const handleLater = () => {
    // 하루 동안 모달 안뜨게 설정
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    localStorage.setItem(
      "loginPrompt_complete_dismissedUntil",
      tomorrow.toISOString(),
    );
    setShowLoginModal(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  const answeredCount =
    session?.questions.filter((q) => q.isAnswered).length || 0;
  const totalQuestions = session?.questions.length || 0;
  const trendingCount =
    session?.questions.filter((q) => q.isTrending).length || 0;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 grain">
      {/* Confetti */}
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
          colors={["#ca8a04", "#1e3a5f", "#fcd34d", "#f5f5dc"]}
        />
      )}

      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-timer-safe/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 text-center max-w-lg mx-auto"
      >
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mb-8"
        >
          <div className="w-24 h-24 mx-auto bg-timer-safe/10 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-timer-safe" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="font-display text-4xl md:text-5xl font-semibold mb-4"
        >
          제출 완료!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-lg text-muted-foreground mb-8"
        >
          총 {totalQuestions}개 질문에 답변을 완료했습니다.
          {trendingCount > 0 && (
            <span className="block text-sm mt-1 text-amber-600">
              트렌드 질문 {trendingCount}개 포함
            </span>
          )}
        </motion.p>

        {/* Stats Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-6 mb-8 bg-card/80 backdrop-blur">
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">소요 시간</span>
                </div>
                <p className="font-display text-2xl font-semibold">
                  {formatSecondsKorean(session?.totalTime || 0)}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm">답변 완료</span>
                </div>
                <p className="font-display text-2xl font-semibold">
                  {answeredCount}/{totalQuestions}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* 게스트 로그인 유도 배너 */}
        {!isLoggedIn() && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="mb-6 p-4 rounded-xl border border-gold/30 bg-gold/5"
          >
            <div className="flex items-start gap-3">
              <Lock className="w-4 h-4 text-gold mt-0.5 shrink-0" />
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">
                  AI 피드백 및 아카이브 저장
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  로그인하면 답변 분석, AI 피드백, 아카이브 저장이 가능해요.
                </p>
              </div>
              <Button
                size="sm"
                className="bg-gold hover:bg-gold/90 text-white h-8 px-3 text-xs shrink-0"
                onClick={() => {
                  if (sessionId) {
                    localStorage.setItem("guestSessionId", sessionId);
                  }
                  window.location.href = `/auth?redirect=/archive/${sessionId}`;
                }}
              >
                로그인
              </Button>
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          {isLoggedIn() ? (
            <Link href={`/archive/${sessionId}`}>
              <Button
                size="lg"
                className="w-full sm:w-auto bg-navy hover:bg-navy-light"
              >
                <Eye className="w-4 h-4 mr-2" />
                결과 보기
              </Button>
            </Link>
          ) : (
            <Button
              size="lg"
              className="w-full sm:w-auto bg-navy hover:bg-navy-light"
              onClick={() => {
                if (sessionId) {
                  localStorage.setItem("guestSessionId", sessionId);
                }
                window.location.href = `/auth?redirect=/archive/${sessionId}`;
              }}
            >
              <Lock className="w-4 h-4 mr-2" />
              로그인하고 결과 보기
            </Button>
          )}
          <Link
            href={`/search?q=${encodeURIComponent(session?.query || "")}${
              session?.questions.some((q) => q.trendTopic)
                ? `&trend_topic=${session.questions.find((q) => q.trendTopic)?.trendTopic}`
                : ""
            }`}
          >
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              <RefreshCw className="w-4 h-4 mr-2" />
              다시 풀기
            </Button>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="lg" className="w-full sm:w-auto">
              <Home className="w-4 h-4 mr-2" />
              홈으로
            </Button>
          </Link>
        </motion.div>

        {/* Encouragement */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 text-sm text-muted-foreground"
        >
          {isLoggedIn()
            ? "수고하셨습니다! 아카이브에서 답변을 다시 확인하실 수 있습니다."
            : "수고하셨습니다! 로그인하면 AI 피드백과 함께 다시 확인할 수 있어요."}
        </motion.p>
      </motion.div>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <Link
          href="/"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <div className="w-9 h-9 rounded-md flex items-center justify-center overflow-hidden">
            <Image
              src={logoImage}
              alt="모카번 Logo"
              width={36}
              height={36}
              className="w-full h-full object-contain"
            />
          </div>
          <Image
            src={logoTextImage}
            alt="모카번"
            width={50}
            height={21}
            className="h-4 w-auto object-contain"
            priority
          />
        </Link>
      </motion.div>

      {/* Login Prompt Modal */}
      <LoginPromptModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        type="complete"
        onLater={handleLater}
      />
    </main>
  );
}

export default function CompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gold" />
        </div>
      }
    >
      <CompleteContent />
    </Suspense>
  );
}
