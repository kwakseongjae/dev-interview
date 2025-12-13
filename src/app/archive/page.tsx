"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Archive,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Heart,
  Play,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

import type { InterviewSession } from "@/types/interview";
import { getSessions, deleteSession } from "@/lib/storage";
import { SAMPLE_SESSIONS } from "@/data/dummy-sessions";
import { formatSecondsKorean } from "@/hooks/useTimer";

export default function ArchivePage() {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load sessions from localStorage, fallback to sample data if empty
    const storedSessions = getSessions();
    if (storedSessions.length > 0) {
      setSessions(storedSessions);
    } else {
      // Use sample data for demo
      setSessions(SAMPLE_SESSIONS);
    }
    setIsLoading(false);
  }, []);

  const handleDelete = (id: string) => {
    if (confirm("이 면접 기록을 삭제하시겠습니까?")) {
      deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
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
      <header className="relative z-10 w-full px-6 py-4 border-b border-border/50">
        <nav className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>홈</span>
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
              면접 기록
            </Button>
          </Link>
          <Link href="/favorites">
            <Button variant="ghost" size="sm">
              <Heart className="w-4 h-4 mr-2" />
              찜한 질문
            </Button>
          </Link>
        </motion.div>

        {/* Sessions List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-6 bg-muted rounded w-1/3 mb-3" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </Card>
            ))}
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
              const answeredCount = session.questions.filter(
                (q) => q.isAnswered
              ).length;
              const totalQuestions = session.questions.length;
              const favoriteCount = session.questions.filter(
                (q) => q.isFavorite
              ).length;

              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="p-6 hover:shadow-elegant transition-shadow group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="font-display text-lg font-semibold">
                            {session.query}
                          </h2>
                          {session.isCompleted ? (
                            <Badge
                              variant="secondary"
                              className="bg-timer-safe/10 text-timer-safe"
                            >
                              완료
                            </Badge>
                          ) : (
                            <Badge variant="outline">진행 중</Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
                              {answeredCount}/{totalQuestions} 완료
                            </span>
                          </div>
                          {favoriteCount > 0 && (
                            <div className="flex items-center gap-1.5">
                              <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                              <span>{favoriteCount}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link href={`/archive/${session.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Play className="w-4 h-4 mr-1" />
                            보기
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(session.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
