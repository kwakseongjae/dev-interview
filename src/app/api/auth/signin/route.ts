import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // 입력 검증
    if (!username || !password) {
      return NextResponse.json(
        { error: "아이디와 비밀번호는 필수입니다" },
        { status: 400 },
      );
    }

    const result = await signIn(username, password);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "로그인에 실패했습니다";

    // 인증 실패
    if (message.includes("올바르지 않습니다")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
