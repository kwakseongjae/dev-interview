"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Heart, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";

import {
  selectQuestionsByQuery,
  createQuestionsFromTemplates,
  SEARCH_STEPS,
} from "@/data/dummy-questions";
import type { Question, InterviewSession } from "@/types/interview";
import { setCurrentSession, toggleFavorite, isFavorite as checkIsFavorite } from "@/lib/storage";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";

  const [currentStep, setCurrentStep] = useState(0);
  const [isSearching, setIsSearching] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  // Simulate search progress
  useEffect(() => {
    if (!query) {
      router.push("/");
      return;
    }

    const steps = SEARCH_STEPS.length;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      setCurrentStep(step);

      if (step >= steps) {
        clearInterval(interval);
        setTimeout(() => {
          // Generate questions from templates
          const templates = selectQuestionsByQuery(query);
          const generatedQuestions = createQuestionsFromTemplates(templates);
          setQuestions(generatedQuestions);

          // Check favorites
          const favMap: Record<string, boolean> = {};
          generatedQuestions.forEach((q) => {
            favMap[q.id] = checkIsFavorite(q.id);
          });
          setFavorites(favMap);

          setIsSearching(false);
        }, 500);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [query, router]);

  const handleToggleFavorite = (question: Question) => {
    const isFav = toggleFavorite(question.id, {
      content: question.content,
      hint: question.hint,
      category: question.category,
    });
    setFavorites((prev) => ({ ...prev, [question.id]: isFav }));
  };

  const handleStartInterview = () => {
    // Create new session
    const session: InterviewSession = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      query,
      questions: questions.map((q) => ({
        ...q,
        isFavorite: favorites[q.id] || false,
      })),
      totalTime: 0,
      isCompleted: false,
    };

    // Save to localStorage
    setCurrentSession(session);

    // Navigate to interview page
    router.push(`/interview?session=${session.id}`);
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
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>뒤로</span>
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
        {/* Search Query Display */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <p className="text-muted-foreground text-sm mb-2">검색어</p>
          <h1 className="font-display text-2xl md:text-3xl font-semibold">
            &ldquo;{query}&rdquo;
          </h1>
        </motion.div>

        {/* Search Progress */}
        <AnimatePresence mode="wait">
          {isSearching ? (
            <motion.div
              key="searching"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card className="p-6 bg-card/80 backdrop-blur">
                <div className="flex items-center gap-3 mb-6">
                  <Loader2 className="w-5 h-5 animate-spin text-gold" />
                  <span className="text-lg font-medium">질문을 생성하고 있습니다...</span>
                </div>

                <div className="space-y-4">
                  {SEARCH_STEPS.map((step, index) => (
                    <motion.div
                      key={step.step}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{
                        opacity: currentStep >= index + 1 ? 1 : 0.4,
                        x: 0,
                      }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div
                        className={`
                          w-6 h-6 rounded-full flex items-center justify-center transition-colors
                          ${currentStep > index
                            ? "bg-timer-safe text-white"
                            : currentStep === index
                            ? "bg-gold text-white"
                            : "bg-muted text-muted-foreground"
                          }
                        `}
                      >
                        {currentStep > index ? (
                          <Check className="w-4 h-4" />
                        ) : currentStep === index ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <span className="text-xs">{step.step}</span>
                        )}
                      </div>
                      <span
                        className={
                          currentStep >= index
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }
                      >
                        {step.label}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Results Header */}
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <h2 className="font-display text-xl font-semibold">
                  추천 질문 리스트
                </h2>
                <Badge variant="secondary" className="ml-2">
                  {questions.length}개
                </Badge>
              </div>

              {/* Questions List */}
              <Card className="divide-y divide-border overflow-hidden">
                {questions.map((question, index) => (
                  <motion.div
                    key={question.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <span className="font-display text-lg font-semibold text-gold w-6">
                          {index + 1}.
                        </span>
                        <div className="flex-1">
                          <p className="text-foreground leading-relaxed">
                            {question.content}
                          </p>
                          <Badge
                            variant="outline"
                            className="mt-2 text-xs"
                          >
                            {question.category}
                          </Badge>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleFavorite(question)}
                        className="p-2 rounded-full hover:bg-muted transition-colors"
                        aria-label={favorites[question.id] ? "찜 취소" : "찜하기"}
                      >
                        <Heart
                          className={`w-5 h-5 transition-colors ${
                            favorites[question.id]
                              ? "fill-red-500 text-red-500"
                              : "text-muted-foreground hover:text-red-400"
                          }`}
                        />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </Card>

              {/* CTA Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card
                  className="p-6 bg-navy text-primary-foreground cursor-pointer hover:bg-navy-light transition-colors group"
                  onClick={handleStartInterview}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-xl font-semibold mb-1">
                        이 질문으로 기술면접을 준비할까요?
                      </h3>
                      <p className="text-primary-foreground/70 text-sm">
                        각 질문당 3분씩, 총 {questions.length * 3}분 소요 예상
                      </p>
                    </div>
                    <Button
                      size="lg"
                      className="bg-gold hover:bg-gold-light text-navy font-semibold rounded-xl group-hover:translate-x-1 transition-transform"
                    >
                      시작하기
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gold" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
