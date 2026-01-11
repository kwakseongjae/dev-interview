import { NextRequest, NextResponse } from "next/server";
import { generateQuestions, type SupportedMediaType } from "@/lib/claude";

// POST /api/questions/generate - Claude로 질문 생성 (세션 저장 없이)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      query,
      exclude_questions,
      count,
      reference_urls,
    }: {
      query: string;
      exclude_questions?: string[];
      count?: number;
      reference_urls?: Array<{ url: string; type: SupportedMediaType }>;
    } = body;

    // 입력 검증
    if (!query) {
      return NextResponse.json(
        { error: "검색 쿼리는 필수입니다" },
        { status: 400 }
      );
    }

    // 제외할 질문 내용 목록 (이미 추천된 질문들)
    const excludeQuestions: string[] = exclude_questions || [];

    // 생성할 질문 수 (기본값: 5)
    const questionCount: number = count || 5;

    console.log("질문 생성 요청:", {
      query,
      excludeQuestionsCount: excludeQuestions.length,
      count: questionCount,
      referenceUrlsCount: reference_urls?.length || 0,
      referenceUrls: reference_urls,
    });

    // Claude로 질문 생성 (레퍼런스 URL 포함)
    const generatedQuestions = await generateQuestions(
      query,
      excludeQuestions,
      questionCount,
      reference_urls
    );

    console.log("생성된 질문:", {
      count: generatedQuestions.length,
      referenceBasedCount: generatedQuestions.filter((q) => q.isReferenceBased)
        .length,
    });

    return NextResponse.json({
      questions: generatedQuestions,
      query,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "질문 생성에 실패했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
