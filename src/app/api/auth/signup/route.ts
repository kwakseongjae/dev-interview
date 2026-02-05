import { NextRequest, NextResponse } from "next/server";
import { signUp } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, passwordConfirm } = body;

    // 입력 검증
    if (!username || !password || !passwordConfirm) {
      return NextResponse.json(
        { error: "모든 필드를 입력해주세요" },
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

    // 비밀번호 최대 길이 제한 (DoS 방지)
    if (password.length > 128) {
      return NextResponse.json(
        { error: "비밀번호는 128자 이하여야 합니다" },
        { status: 400 },
      );
    }

    // 비밀번호 확인 일치 검증
    if (password !== passwordConfirm) {
      return NextResponse.json(
        { error: "비밀번호가 일치하지 않습니다" },
        { status: 400 },
      );
    }

    // 비밀번호 길이 및 복잡도 검증
    if (password.length < 8) {
      return NextResponse.json(
        { error: "비밀번호는 8자 이상이어야 합니다" },
        { status: 400 },
      );
    }

    // 영문과 숫자 포함 검증
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasLetter || !hasNumber) {
      return NextResponse.json(
        { error: "비밀번호는 영문과 숫자를 포함해야 합니다" },
        { status: 400 },
      );
    }

    const result = await signUp(username, password);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "회원가입에 실패했습니다";

    // 중복 아이디 에러
    if (message.includes("이미 존재하는")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
