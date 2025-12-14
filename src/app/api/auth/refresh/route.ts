import { NextRequest, NextResponse } from "next/server";
import { refreshTokens } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    // 입력 검증
    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token이 필요합니다" },
        { status: 400 }
      );
    }

    const result = await refreshTokens(refreshToken);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "토큰 갱신에 실패했습니다";

    // 토큰 만료 또는 유효하지 않음
    if (message.includes("만료") || message.includes("유효하지 않은")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
