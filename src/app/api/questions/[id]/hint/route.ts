import { NextRequest, NextResponse } from "next/server";
import { getOrGenerateHint } from "@/lib/hint-generator";

// GET /api/questions/:id/hint - 힌트 조회 (없으면 자동 생성)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const questionId = params.id;
    const hint = await getOrGenerateHint(questionId);

    return NextResponse.json({ hint });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "힌트를 가져오는데 실패했습니다";

    if (message.includes("찾을 수 없습니다")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
