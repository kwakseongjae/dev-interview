import { NextRequest, NextResponse } from "next/server";
import { getOrGenerateHint } from "@/lib/hint-generator";

// GET /api/questions/:id/hint - 힌트 조회 (없으면 자동 생성)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: questionId } = await params;

    // UUID 형식 검증
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(questionId)) {
      return NextResponse.json(
        { error: "유효하지 않은 질문 ID입니다" },
        { status: 400 }
      );
    }

    const hint = await getOrGenerateHint(questionId);

    return NextResponse.json({ hint });
  } catch (error) {
    // 보안: 상세한 에러 메시지 노출 방지
    console.error("힌트 조회 실패:", error);

    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("찾을 수 없습니다")) {
      return NextResponse.json(
        { error: "질문을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "힌트를 가져올 수 없습니다" },
      { status: 500 }
    );
  }
}
