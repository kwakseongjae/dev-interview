"use client";

import { useEffect, useState, Suspense, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Heart,
  Lightbulb,
  Loader2,
  Sparkles,
  RefreshCw,
  Square,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";
import logoImage from "@/assets/images/logo.png";
import logoTextImage from "@/assets/images/logo-text.png";
import { v4 as uuidv4 } from "uuid";

import { SEARCH_STEPS, DEMO_QUESTIONS } from "@/data/dummy-questions";
import type { Question } from "@/types/interview";
import {
  toggleFavoriteApi,
  isLoggedIn,
  checkFavoriteApi,
  createSessionApi,
  type ApiInterviewType,
} from "@/lib/api";
import { InterviewTypeBadge } from "@/components/InterviewTypeSelector";

// API 응답 타입
interface GeneratedQuestion {
  content: string;
  hint: string;
  category: string;
  subcategory?: string;
  isReferenceBased?: boolean;
  isTrending?: boolean;
  trendTopic?: string;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";
  const referenceUrlsParam = searchParams.get("references") || "";
  const interviewTypeCode = searchParams.get("interview_type") || null;
  const interviewTypeId = searchParams.get("interview_type_id") || null;
  const trendTopicParam = searchParams.get("trend_topic") || null;
  const isDemoMode =
    searchParams.get("demo") === "true" &&
    process.env.NODE_ENV !== "production";

  const [currentStep, setCurrentStep] = useState(0);
  const [isSearching, setIsSearching] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [selectedForReplace, setSelectedForReplace] = useState<Set<string>>(
    new Set(),
  );
  const [isReplacing, setIsReplacing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isStartingInterview, setIsStartingInterview] = useState(false);
  const [referenceUrls, setReferenceUrls] = useState<
    Array<{ url: string; type: string }>
  >([]);
  const [validationError, setValidationError] = useState<{
    suggestion: string;
    category: string;
  } | null>(null);
  const [referenceNotice, setReferenceNotice] = useState<string | null>(null);
  const [interviewType, setInterviewType] = useState<ApiInterviewType | null>(
    null,
  );

  // 검색이 이미 시작되었는지 추적하는 ref
  const hasStartedSearch = useRef(false);

  // 면접 범주 정보 구성
  useEffect(() => {
    if (interviewTypeCode && interviewTypeId) {
      // URL 파라미터에서 면접 범주 정보 구성
      const typeInfo: ApiInterviewType = {
        id: interviewTypeId,
        code: interviewTypeCode,
        name: interviewTypeCode,
        displayName:
          interviewTypeCode === "CS"
            ? "CS 기초"
            : interviewTypeCode === "PROJECT"
              ? "프로젝트 기반"
              : interviewTypeCode === "SYSTEM_DESIGN"
                ? "시스템 설계"
                : interviewTypeCode,
        description: null,
        icon:
          interviewTypeCode === "CS"
            ? "Brain"
            : interviewTypeCode === "PROJECT"
              ? "FolderKanban"
              : "Network",
        color:
          interviewTypeCode === "CS"
            ? "blue"
            : interviewTypeCode === "PROJECT"
              ? "green"
              : "purple",
        sortOrder: 0,
      };
      setInterviewType(typeInfo);
    }
  }, [interviewTypeCode, interviewTypeId]);

  // 레퍼런스 URL 파싱 함수 (동기적으로 파싱)
  const parseReferenceUrls = useCallback((): Array<{
    url: string;
    type: string;
  }> => {
    if (!referenceUrlsParam) {
      return [];
    }
    return referenceUrlsParam.split(",").map((param) => {
      const [url, type] = param.split("::");
      return {
        url: decodeURIComponent(url),
        type:
          type ||
          (url.toLowerCase().endsWith(".pdf")
            ? "application/pdf"
            : "image/png"),
      };
    });
  }, [referenceUrlsParam]);

  // API 응답 타입
  interface FetchQuestionsResult {
    questions: GeneratedQuestion[];
    referenceUsed: boolean;
    referenceMessage?: string;
  }

  // API를 통해 질문 생성
  const fetchQuestions = useCallback(
    async (
      excludeQuestions: string[] = [],
      urls?: Array<{ url: string; type: string }>,
    ): Promise<FetchQuestionsResult> => {
      const refsToUse = urls ?? referenceUrls;
      try {
        const requestBody = {
          query,
          exclude_questions: excludeQuestions,
          count: 5,
          reference_urls: refsToUse.length > 0 ? refsToUse : undefined,
          interview_type: interviewTypeCode || undefined,
          trend_topic: trendTopicParam || undefined,
        };
        console.log("질문 생성 API 호출:", {
          query,
          referenceUrlsCount: refsToUse.length,
          referenceUrls: refsToUse,
          interviewType: interviewTypeCode,
          trendTopic: trendTopicParam,
        });
        const response = await fetch("/api/questions/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        // 유효성 검증 에러 처리
        if (response.status === 422 && data.validation_error) {
          const error = new Error("validation_error") as Error & {
            validationError: true;
            suggestion: string;
            category: string;
          };
          error.validationError = true;
          error.suggestion = data.suggestion;
          error.category = data.category;
          throw error;
        }

        if (!response.ok) {
          throw new Error("질문 생성 실패");
        }

        return {
          questions: data.questions as GeneratedQuestion[],
          referenceUsed: data.referenceUsed ?? false,
          referenceMessage: data.referenceMessage,
        };
      } catch (error) {
        console.error("질문 생성 오류:", error);
        throw error;
      }
    },
    [query, referenceUrls, interviewTypeCode, trendTopicParam],
  );

  // GeneratedQuestion을 Question으로 변환
  const convertToQuestions = (
    generatedQuestions: GeneratedQuestion[],
  ): Question[] => {
    return generatedQuestions.map((gq) => ({
      id: uuidv4(),
      content: gq.content,
      hint: gq.hint,
      category: gq.category,
      answer: "",
      timeSpent: 0,
      isAnswered: false,
      isFavorite: false,
      isReferenceBased: gq.isReferenceBased || false,
      isTrending: gq.isTrending || false,
      trendTopic: gq.trendTopic,
    }));
  };

  // 초기 검색 실행
  useEffect(() => {
    if (!query) {
      router.push("/");
      return;
    }

    // 이미 검색이 시작되었으면 중복 실행 방지
    if (hasStartedSearch.current) {
      return;
    }
    hasStartedSearch.current = true;

    // 레퍼런스 URL을 동기적으로 파싱
    const parsedReferenceUrls = parseReferenceUrls();
    setReferenceUrls(parsedReferenceUrls);

    const runSearch = async () => {
      const totalSteps = SEARCH_STEPS.length;

      // 처음 5단계를 점진적으로 진행 (마지막 단계는 API 완료 시 표시)
      const stepsBeforeLast = totalSteps - 1;
      let step = 0;
      let apiDone = false;

      // 데모 모드: 빠른 진행 (300ms 간격), 일반 모드: 2초 간격
      const stepInterval = isDemoMode ? 300 : 2000;

      const interval = setInterval(() => {
        if (apiDone) {
          clearInterval(interval);
          return;
        }
        if (step < stepsBeforeLast) {
          step++;
          setCurrentStep(step);
        }
      }, stepInterval);

      try {
        // 데모 모드: 더미 질문 즉시 반환 (API 호출 없음)
        const result = isDemoMode
          ? await (async () => {
              await new Promise((resolve) => setTimeout(resolve, 1500));
              return {
                questions: DEMO_QUESTIONS.map((q) => ({
                  content: q.content,
                  hint: q.hint,
                  category: q.category,
                })),
                referenceUsed: false,
                referenceMessage: undefined,
              };
            })()
          : await fetchQuestions([], parsedReferenceUrls);
        apiDone = true;
        clearInterval(interval);

        const convertedQuestions = convertToQuestions(result.questions);

        // 레퍼런스 미사용 알림 설정
        if (
          parsedReferenceUrls.length > 0 &&
          !result.referenceUsed &&
          result.referenceMessage
        ) {
          setReferenceNotice(result.referenceMessage);
        }

        // 남은 단계 빠르게 완료
        for (let i = step + 1; i <= totalSteps; i++) {
          setCurrentStep(i);
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        // 최종 결과 표시 전 짧은 딜레이
        await new Promise((resolve) => setTimeout(resolve, 400));

        setQuestions(convertedQuestions);

        // 찜 상태 확인 (로그인한 유저만)
        const favMap: Record<string, boolean> = {};
        if (isLoggedIn()) {
          try {
            await Promise.all(
              convertedQuestions.map(async (q) => {
                try {
                  favMap[q.id] = await checkFavoriteApi(q.id);
                } catch {
                  favMap[q.id] = false;
                }
              }),
            );
          } catch (error) {
            console.error("찜 상태 확인 실패:", error);
          }
        }
        setFavorites(favMap);

        setIsSearching(false);
      } catch (error) {
        // 에러 시에도 검색 완료 상태로 전환
        apiDone = true;
        clearInterval(interval);
        setCurrentStep(totalSteps);
        setIsSearching(false);

        // 유효성 검증 에러인 경우
        const err = error as Error & {
          validationError?: boolean;
          suggestion?: string;
          category?: string;
        };
        if (err.validationError) {
          setValidationError({
            suggestion: err.suggestion || "유효한 검색어를 입력해주세요.",
            category: err.category || "unknown",
          });
        } else {
          alert("질문 생성에 실패했습니다. 다시 시도해주세요.");
        }
      }
    };

    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, router]);

  // 찜하기 토글
  const handleToggleFavorite = async (question: Question) => {
    // 로그인한 유저만 찜하기 가능
    if (!isLoggedIn()) {
      alert("찜하기 기능은 로그인이 필요합니다.");
      return;
    }

    try {
      const isFav = await toggleFavoriteApi(question.id, {
        content: question.content,
        hint: question.hint,
        category: question.category,
      });
      setFavorites((prev) => ({ ...prev, [question.id]: isFav }));
    } catch (error) {
      console.error("찜하기 실패:", error);
      alert("찜하기에 실패했습니다.");
    }
  };

  // 교체할 질문 선택/해제
  const handleToggleSelect = (questionId: string) => {
    setSelectedForReplace((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  // 선택된 질문만 교체
  const handleReplaceSelected = async () => {
    if (selectedForReplace.size === 0) {
      alert("교체할 질문을 선택해주세요.");
      return;
    }

    setIsReplacing(true);

    try {
      // 유지할 질문들
      const keepQuestions = questions.filter(
        (q) => !selectedForReplace.has(q.id),
      );

      // 새 질문 생성 (유지할 질문들 제외, 레퍼런스 URL 포함)
      const response = await fetch("/api/questions/replace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          questions_to_replace: Array.from(selectedForReplace),
          keep_questions: keepQuestions.map((q) => ({ content: q.content })),
          reference_urls: referenceUrls.length > 0 ? referenceUrls : undefined,
          trend_topic: trendTopicParam || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("질문 교체 실패");
      }

      const data = await response.json();
      const newQuestions = convertToQuestions(data.new_questions);

      // 기존 질문에서 선택된 것들을 새 질문으로 교체
      let newQIndex = 0;
      const updatedQuestions = questions.map((q) => {
        if (selectedForReplace.has(q.id) && newQIndex < newQuestions.length) {
          return newQuestions[newQIndex++];
        }
        return q;
      });

      setQuestions(updatedQuestions);
      setSelectedForReplace(new Set());

      // 새 질문들의 찜 상태 초기화 (새로 생성된 질문은 찜 상태가 없음)
      const favMap: Record<string, boolean> = { ...favorites };
      newQuestions.forEach((q) => {
        favMap[q.id] = false;
      });
      setFavorites(favMap);
    } catch (error) {
      console.error("질문 교체 오류:", error);
      alert("질문 교체에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsReplacing(false);
    }
  };

  // 전체 재검색
  const handleRegenerateAll = async () => {
    setIsRegenerating(true);

    try {
      // 기존 질문들 제외하고 새로 생성 (레퍼런스 URL 포함)
      const excludeContents = questions.map((q) => q.content);
      const result = await fetchQuestions(excludeContents);
      const convertedQuestions = convertToQuestions(result.questions);

      // 레퍼런스 미사용 알림 업데이트
      if (
        referenceUrls.length > 0 &&
        !result.referenceUsed &&
        result.referenceMessage
      ) {
        setReferenceNotice(result.referenceMessage);
      } else {
        setReferenceNotice(null);
      }

      setQuestions(convertedQuestions);
      setSelectedForReplace(new Set());

      // 찜 상태 확인 (로그인한 유저만)
      const favMap: Record<string, boolean> = {};
      if (isLoggedIn()) {
        try {
          await Promise.all(
            convertedQuestions.map(async (q) => {
              try {
                favMap[q.id] = await checkFavoriteApi(q.id);
              } catch {
                favMap[q.id] = false;
              }
            }),
          );
        } catch (error) {
          console.error("찜 상태 확인 실패:", error);
        }
      }
      setFavorites(favMap);
    } catch (error) {
      console.error("재검색 오류:", error);
      alert("질문 재생성에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsRegenerating(false);
    }
  };

  // 인터뷰 시작
  const handleStartInterview = async () => {
    // 이미 시작 중이면 무시
    if (isStartingInterview) return;

    // 로그인 상태 확인
    if (!isLoggedIn()) {
      alert("로그인이 필요합니다.");
      router.push("/auth");
      return;
    }

    setIsStartingInterview(true);

    try {
      // API를 통해 세션 생성 (면접 범주 ID 포함)
      const sessionData = await createSessionApi(
        query,
        questions.map((q) => ({
          content: q.content,
          hint: q.hint,
          category: q.category,
        })),
        interviewTypeId,
      );

      router.push(`/interview?session=${sessionData.session.id}`);
    } catch (error) {
      console.error("세션 생성 오류:", error);
      alert("세션 생성에 실패했습니다. 다시 시도해주세요.");
      setIsStartingInterview(false);
    }
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
            <span>뒤로</span>
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
        {/* Search Query Display */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-2">
            <p className="text-muted-foreground text-sm">검색어</p>
            {interviewType && <InterviewTypeBadge type={interviewType} />}
          </div>
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
                  <div className="relative flex items-center justify-center w-8 h-8">
                    <Sparkles className="w-5 h-5 text-gold" />
                    <span className="absolute inset-0 rounded-full bg-gold/20 animate-ping" />
                  </div>
                  <div>
                    <span className="text-lg font-medium">
                      AI가 맞춤 질문을 만들고 있어요
                    </span>
                    <p className="text-sm text-muted-foreground">
                      잠시만 기다려주세요
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {SEARCH_STEPS.map((step, index) => {
                    const isCompleted = currentStep > index;
                    const isCurrent = currentStep === index;
                    const isPending = currentStep < index;

                    return (
                      <motion.div
                        key={step.step}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{
                          opacity: isPending ? 0.35 : 1,
                          x: 0,
                        }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                        className="flex items-center gap-3"
                      >
                        <div
                          className={`
                            w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300
                            ${
                              isCompleted
                                ? "bg-timer-safe text-white"
                                : isCurrent
                                  ? "bg-gold text-white"
                                  : "bg-muted text-muted-foreground"
                            }
                          `}
                        >
                          {isCompleted ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : isCurrent ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <span className="text-xs">{step.step}</span>
                          )}
                        </div>
                        <span
                          className={`text-sm transition-colors duration-300 ${
                            isCompleted
                              ? "text-muted-foreground"
                              : isCurrent
                                ? "text-foreground font-medium"
                                : "text-muted-foreground"
                          }`}
                        >
                          {isCompleted
                            ? step.label.replace(/하고 있어요|있어요/, "완료")
                            : step.label}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </Card>
            </motion.div>
          ) : validationError ? (
            /* Validation Error - Invalid Input */
            <motion.div
              key="validation-error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="p-8 bg-card/80 backdrop-blur border-amber-200/50">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-amber-600" />
                  </div>
                  <h2 className="font-display text-xl font-semibold mb-2">
                    입력을 확인해주세요
                  </h2>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    {validationError.suggestion}
                  </p>

                  {/* 추천 예시 */}
                  <div className="w-full max-w-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-4 h-4 text-gold" />
                      <span className="text-sm font-medium text-muted-foreground">
                        이런 검색어는 어떠세요?
                      </span>
                    </div>
                    <div className="grid gap-2">
                      {[
                        "프론트엔드 개발자 기술면접 준비",
                        "React와 TypeScript 면접 질문",
                        "백엔드 신입 개발자 면접 대비",
                        "JavaScript 비동기 처리 질문",
                      ].map((example, index) => (
                        <Link
                          key={index}
                          href={`/search?q=${encodeURIComponent(example)}`}
                          className="flex items-center gap-2 px-4 py-3 rounded-lg bg-muted/50 hover:bg-gold/10 hover:border-gold/30 border border-transparent transition-all text-sm text-left"
                          onClick={() => {
                            // Reset search state for new query
                            hasStartedSearch.current = false;
                            setValidationError(null);
                            setIsSearching(true);
                          }}
                        >
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          <span>{example}</span>
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6">
                    <Link href="/">
                      <Button variant="outline" className="gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        홈으로 돌아가기
                      </Button>
                    </Link>
                  </div>
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
              {/* Reference Notice */}
              {referenceNotice && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>{referenceNotice}</p>
                </motion.div>
              )}

              {/* Results Header */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  <h2 className="font-display text-xl font-semibold">
                    추천 질문 리스트
                  </h2>
                  <Badge variant="secondary" className="ml-2">
                    {questions.length}개
                  </Badge>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {selectedForReplace.size > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReplaceSelected}
                      disabled={isReplacing}
                      className="gap-2"
                    >
                      {isReplacing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      선택 질문 교체 ({selectedForReplace.size}개)
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerateAll}
                    disabled={isRegenerating || isReplacing}
                    className="gap-2"
                  >
                    {isRegenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    전체 재검색
                  </Button>
                </div>
              </div>

              {/* Selection Guide */}
              {questions.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  💡 교체하고 싶은 질문을 클릭하여 선택한 후 &quot;선택 질문
                  교체&quot; 버튼을 눌러주세요.
                </p>
              )}

              {/* Questions List */}
              <Card className="divide-y divide-border overflow-hidden">
                {questions.map((question, index) => {
                  const isSelected = selectedForReplace.has(question.id);
                  return (
                    <motion.div
                      key={question.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-5 transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-gold/10 hover:bg-gold/15"
                          : "hover:bg-muted/30"
                      }`}
                      onClick={() => handleToggleSelect(question.id)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          {/* Selection Checkbox */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSelect(question.id);
                            }}
                            className="mt-1 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={isSelected ? "선택 해제" : "선택"}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-gold" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>

                          <span className="font-display text-lg font-semibold text-gold w-6">
                            {index + 1}.
                          </span>
                          <div className="flex-1">
                            <p className="text-foreground leading-relaxed">
                              {question.content}
                            </p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {question.category}
                              </Badge>
                              {question.isReferenceBased && (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                                >
                                  레퍼런스 기반
                                </Badge>
                              )}
                              {question.isTrending && (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-amber-50 text-amber-700 border-amber-200"
                                >
                                  트렌드
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(question);
                          }}
                          className="p-2 rounded-full hover:bg-muted transition-colors"
                          aria-label={
                            favorites[question.id] ? "찜 취소" : "찜하기"
                          }
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
                  );
                })}
              </Card>

              {/* CTA Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card
                  className={`p-6 bg-navy text-primary-foreground transition-colors group ${
                    isStartingInterview
                      ? "opacity-70 cursor-not-allowed"
                      : "cursor-pointer hover:bg-navy-light"
                  }`}
                  onClick={
                    isStartingInterview ? undefined : handleStartInterview
                  }
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
                      disabled={isStartingInterview}
                      className="bg-gold hover:bg-gold-light text-navy font-semibold rounded-xl group-hover:translate-x-1 transition-transform disabled:opacity-100"
                    >
                      {isStartingInterview ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          시작 중...
                        </>
                      ) : (
                        <>
                          시작하기
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
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
