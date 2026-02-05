import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/auth/check-username?username=xxx - 아이디 중복 확인
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json(
        { error: "아이디를 입력해주세요" },
        { status: 400 },
      );
    }

    // 아이디 길이 검증 (4-20자)
    if (username.length < 4 || username.length > 20) {
      return NextResponse.json(
        { error: "아이디는 4글자 이상 20글자 이하여야 합니다" },
        { status: 400 },
      );
    }

    // 아이디 형식 검증 (영문, 숫자, 언더스코어만 허용)
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { error: "아이디는 영문, 숫자, 언더스코어만 사용할 수 있습니다" },
        { status: 400 },
      );
    }

    // 중복 확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingUser, error } = await (supabaseAdmin as any)
      .from("users")
      .select("id")
      .eq("username", username)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116은 "no rows returned" 에러 (중복 없음)
      throw new Error("아이디 확인 중 오류가 발생했습니다");
    }

    const isAvailable = !existingUser;

    return NextResponse.json({
      available: isAvailable,
      message: isAvailable
        ? "사용 가능한 아이디입니다"
        : "이미 사용 중인 아이디입니다",
    });
  } catch (error) {
    // 보안: 상세한 에러 메시지 노출 방지
    console.error("아이디 확인 실패:", error);
    return NextResponse.json(
      { error: "아이디 확인에 실패했습니다" },
      { status: 500 },
    );
  }
}
