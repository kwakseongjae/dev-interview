import { NextRequest, NextResponse } from "next/server";
import { generateQuestions, type SupportedMediaType } from "@/lib/claude";

// POST /api/questions/replace - 선택된 질문들만 새로 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      query,
      questions_to_replace,
      keep_questions,
      reference_urls,
    }: {
      query: string;
      questions_to_replace: string[];
      keep_questions: Array<{ content: string }>;
      reference_urls?: Array<{ url: string; type: SupportedMediaType }>;
    } = body;

    // 입력 검증
    if (!query) {
      return NextResponse.json(
        { error: "검색 쿼리는 필수입니다" },
        { status: 400 }
      );
    }

    if (
      !questions_to_replace ||
      !Array.isArray(questions_to_replace) ||
      questions_to_replace.length === 0
    ) {
      return NextResponse.json(
        { error: "교체할 질문을 선택해주세요" },
        { status: 400 }
      );
    }

    // 유지할 질문 내용 목록 (중복 생성 방지)
    const keepQuestionContents: string[] = (keep_questions || []).map(
      (q: { content: string }) => q.content
    );

    // 교체할 질문 수만큼 새로 생성
    const replaceCount = questions_to_replace.length;

    // Claude로 새 질문 생성 (기존 질문들과 중복 방지, 레퍼런스 URL 포함)
    const result = await generateQuestions(
      query,
      keepQuestionContents,
      replaceCount,
      reference_urls
    );

    return NextResponse.json({
      new_questions: result.questions,
      replaced_count: replaceCount,
      query,
      referenceUsed: result.referenceUsed,
      referenceMessage: result.referenceMessage,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "질문 교체에 실패했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
