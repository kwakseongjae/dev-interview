"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Eye,
  Home,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import Confetti from "react-confetti";

import type { InterviewSession } from "@/types/interview";
import { getSessionById } from "@/lib/storage";
import { isLoggedIn, getSessionByIdApi, type ApiSessionDetail } from "@/lib/api";
import { formatSecondsKorean } from "@/hooks/useTimer";

function CompleteContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  const [session, setSession] = useState<InterviewSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(true);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    // Get window size for confetti
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });

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
  const convertApiSession = (apiSession: ApiSessionDetail): InterviewSession => ({
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

  useEffect(() => {
    const loadSession = async () => {
      if (!sessionId) {
        setIsLoading(false);
        return;
      }

      // 로그인 상태면 API에서 먼저 조회 시도
      if (isLoggedIn()) {
        try {
          const apiSession = await getSessionByIdApi(sessionId);
          setSession(convertApiSession(apiSession));
          setIsLoading(false);
          return;
        } catch (error) {
          console.error("API 조회 실패, 로컬 스토리지 폴백:", error);
        }
      }

      // 로컬 스토리지에서 조회
      const loadedSession = getSessionById(sessionId);
      setSession(loadedSession);
      setIsLoading(false);
    };

    loadSession();

    // Stop confetti after 5 seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  const answeredCount = session?.questions.filter((q) => q.isAnswered).length || 0;
  const totalQuestions = session?.questions.length || 0;

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

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link href={`/archive/${sessionId}`}>
            <Button size="lg" className="w-full sm:w-auto bg-navy hover:bg-navy-light">
              <Eye className="w-4 h-4 mr-2" />
              결과 보기
            </Button>
          </Link>
          <Link href={`/search?q=${encodeURIComponent(session?.query || "")}`}>
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
          수고하셨습니다! 아카이브에서 답변을 다시 확인하실 수 있습니다.
        </motion.p>
      </motion.div>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <div className="w-6 h-6 rounded-md bg-navy flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-gold" />
          </div>
          <span className="font-display text-sm">DevInterview</span>
        </Link>
      </motion.div>
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
