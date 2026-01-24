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
import { Checkbox } from "@/components/ui/checkbox";
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
import { useRouter } from "next/navigation";

import type { InterviewSession } from "@/types/interview";
import {
  toggleFavoriteApi,
  isLoggedIn,
  getSessionByIdApi,
  createSessionApi,
  type ApiSessionDetail,
} from "@/lib/api";
import { formatSecondsKorean } from "@/hooks/useTimer";

export default function ArchiveDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<InterviewSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showQuestionSelectDialog, setShowQuestionSelectDialog] =
    useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(
    new Set(),
  );
  const [isCreatingSession, setIsCreatingSession] = useState(false);

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

  useEffect(() => {
    const loadSession = async () => {
      if (!isLoggedIn()) {
        setIsLoading(false);
        return;
      }

      try {
        const apiSession = await getSessionByIdApi(sessionId);
        setSession(convertApiSession(apiSession));
      } catch (error) {
        console.error("세션 조회 실패:", error);
        setSession(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [sessionId]);

  const handleToggleFavorite = async (questionId: string) => {
    if (!session) return;

    // 로그인한 유저만 찜하기 가능
    if (!isLoggedIn()) {
      alert("찜하기 기능은 로그인이 필요합니다.");
      return;
    }

    const question = session.questions.find((q) => q.id === questionId);
    if (!question) return;

    // 이미 찜한 상태인지 확인
    const currentIsFavorite = question.isFavorite;

    try {
      // 현재 찜 상태를 확인하여 토글
      const isFav = await toggleFavoriteApi(questionId, {
        content: question.content,
        hint: question.hint,
        category: question.category,
      });

      // 상태 업데이트
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          questions: prev.questions.map((q) =>
            q.id === questionId ? { ...q, isFavorite: isFav } : q,
          ),
        };
      });
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
          setSession((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              questions: prev.questions.map((q) =>
                q.id === questionId
                  ? { ...q, isFavorite: actualIsFavorited }
                  : q,
              ),
            };
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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleOpenQuestionSelectDialog = () => {
    if (!session) return;
    // 모든 질문을 기본 선택
    setSelectedQuestionIds(new Set(session.questions.map((q) => q.id)));
    setShowQuestionSelectDialog(true);
  };

  const handleToggleQuestionSelect = (questionId: string) => {
    setSelectedQuestionIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (!session) return;
    if (selectedQuestionIds.size === session.questions.length) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(new Set(session.questions.map((q) => q.id)));
    }
  };

  const handleStartInterview = async () => {
    // 이미 시작 중이면 무시
    if (isCreatingSession) return;

    if (!session || selectedQuestionIds.size === 0) {
      alert("최소 1개 이상의 질문을 선택해주세요.");
      return;
    }

    if (!isLoggedIn()) {
      alert("로그인이 필요합니다.");
      router.push("/auth");
      return;
    }

    setIsCreatingSession(true);

    try {
      // 선택한 질문들만 필터링
      const selectedQuestions = session.questions.filter((q) =>
        selectedQuestionIds.has(q.id),
      );

      // 세션 생성 (questionId 포함)
      const sessionData = await createSessionApi(
        session.query,
        selectedQuestions.map((q) => ({
          content: q.content,
          hint: q.hint,
          category: q.category,
          questionId: q.id, // 기존 질문 ID 전달
        })),
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
          className="mt-8 flex justify-center gap-3"
        >
          <Button
            size="lg"
            className="bg-navy hover:bg-navy-light"
            onClick={handleOpenQuestionSelectDialog}
          >
            <RefreshCw className="w-4 h-4 mr-2" />이 질문들로 다시 면접보기
          </Button>
        </motion.div>

        {/* Question Select Dialog */}
        <Dialog
          open={showQuestionSelectDialog}
          onOpenChange={setShowQuestionSelectDialog}
        >
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>면접에 포함할 질문 선택</DialogTitle>
              <DialogDescription>
                면접에 포함할 질문을 선택해주세요. 최소 1개 이상 선택해야
                합니다.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* 전체 선택 */}
              <div className="flex items-center justify-between pb-2 border-b">
                <div
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 text-sm font-medium cursor-pointer hover:text-foreground transition-colors"
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
                    checked={
                      session
                        ? selectedQuestionIds.size === session.questions.length
                        : false
                    }
                    onCheckedChange={handleSelectAll}
                  />
                  전체 선택 ({selectedQuestionIds.size}/
                  {session?.questions.length || 0})
                </div>
              </div>

              {/* 질문 목록 */}
              <div className="space-y-3">
                {session?.questions.map((question, index) => (
                  <Card
                    key={question.id}
                    className={`p-4 transition-all ${
                      selectedQuestionIds.has(question.id)
                        ? "ring-2 ring-gold/50 bg-gold/5"
                        : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedQuestionIds.has(question.id)}
                        onCheckedChange={() =>
                          handleToggleQuestionSelect(question.id)
                        }
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-gold">
                            Q{index + 1}.
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {question.category}
                          </Badge>
                        </div>
                        <p className="text-sm leading-relaxed">
                          {question.content}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* 액션 버튼 */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowQuestionSelectDialog(false)}
                >
                  취소
                </Button>
                <Button
                  onClick={handleStartInterview}
                  disabled={selectedQuestionIds.size === 0 || isCreatingSession}
                  className="bg-navy hover:bg-navy-light"
                >
                  {isCreatingSession ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      시작 중...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      면접 시작 ({selectedQuestionIds.size}개)
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
