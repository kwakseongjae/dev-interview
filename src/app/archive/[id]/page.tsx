"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Heart,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

import type { InterviewSession } from "@/types/interview";
import { getSessionById, toggleFavorite } from "@/lib/storage";
import { SAMPLE_SESSIONS } from "@/data/dummy-sessions";
import { formatSecondsKorean } from "@/hooks/useTimer";

export default function ArchiveDetailPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<InterviewSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Try to load from localStorage first
    let loadedSession = getSessionById(sessionId);

    // Fallback to sample data for demo
    if (!loadedSession) {
      loadedSession =
        SAMPLE_SESSIONS.find((s) => s.id === sessionId) || null;
    }

    setSession(loadedSession);
    setIsLoading(false);
  }, [sessionId]);

  const handleToggleFavorite = (questionId: string) => {
    if (!session) return;

    const question = session.questions.find((q) => q.id === questionId);
    if (!question) return;

    toggleFavorite(questionId, {
      content: question.content,
      hint: question.hint,
      category: question.category,
    });

    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        questions: prev.questions.map((q) =>
          q.id === questionId ? { ...q, isFavorite: !q.isFavorite } : q
        ),
      };
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6">
        <h1 className="font-display text-2xl font-semibold mb-4">
          기록을 찾을 수 없습니다
        </h1>
        <p className="text-muted-foreground mb-6">
          요청하신 면접 기록이 존재하지 않습니다.
        </p>
        <Link href="/archive">
          <Button>아카이브로 돌아가기</Button>
        </Link>
      </main>
    );
  }

  const answeredCount = session.questions.filter((q) => q.isAnswered).length;

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
            href="/archive"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>아카이브</span>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-gold" />
            </div>
            <span className="font-display text-xl font-semibold tracking-tight">
              DevInterview
            </span>
          </Link>
        </nav>
      </header>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Session Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-display text-2xl md:text-3xl font-semibold mb-3">
            {session.query}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(session.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{formatSecondsKorean(session.totalTime)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {answeredCount}/{session.questions.length} 완료
              </span>
            </div>
          </div>
        </motion.div>

        {/* Questions and Answers */}
        <div className="space-y-6">
          {session.questions.map((question, index) => (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="overflow-hidden">
                {/* Question Header */}
                <div className="p-5 bg-muted/30">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-display text-lg font-semibold text-gold">
                          Q{index + 1}.
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {question.category}
                        </Badge>
                        {question.isAnswered && (
                          <CheckCircle2 className="w-4 h-4 text-timer-safe" />
                        )}
                      </div>
                      <p className="text-foreground leading-relaxed">
                        {question.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleFavorite(question.id)}
                        className="p-2 rounded-full hover:bg-muted transition-colors"
                        aria-label={question.isFavorite ? "찜 취소" : "찜하기"}
                      >
                        <Heart
                          className={`w-5 h-5 transition-colors ${
                            question.isFavorite
                              ? "fill-red-500 text-red-500"
                              : "text-muted-foreground hover:text-red-400"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Answer */}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium text-muted-foreground">
                      A:
                    </span>
                    {question.timeSpent > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({formatSecondsKorean(question.timeSpent)})
                      </span>
                    )}
                  </div>
                  {question.answer ? (
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                      {question.answer}
                    </p>
                  ) : (
                    <p className="text-muted-foreground italic">
                      답변이 작성되지 않았습니다.
                    </p>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 flex justify-center"
        >
          <Link href={`/search?q=${encodeURIComponent(session.query)}`}>
            <Button size="lg" className="bg-navy hover:bg-navy-light">
              <RefreshCw className="w-4 h-4 mr-2" />
              이 질문들로 다시 면접보기
            </Button>
          </Link>
        </motion.div>
      </div>
    </main>
  );
}
