import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";

const DEMO_EMAIL = process.env.DEMO_USER_EMAIL || "demo@mochabun.test";
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD || "demo-password-2026!";

/**
 * GET /api/demo-auth
 * 데모 녹화용 자동 로그인 엔드포인트
 * - 데모 유저가 없으면 생성
 * - signInWithPassword로 로그인
 * - 세션 쿠키를 응답에 세팅
 * - 홈으로 리다이렉트
 *
 * 프로덕션에서는 DEMO_USER_EMAIL 환경변수를 설정하지 않으면 동작하지 않음
 */
export async function GET(request: Request) {
  // 프로덕션 안전장치: 환경변수가 없으면 차단
  if (process.env.NODE_ENV === "production" && !process.env.DEMO_USER_EMAIL) {
    return NextResponse.json(
      { error: "Demo auth is not available in production" },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("next") || "/";

  try {
    // 1. 데모 유저가 없으면 admin API로 생성
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const demoUser = existingUsers?.users?.find((u) => u.email === DEMO_EMAIL);

    if (!demoUser) {
      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
      });

      if (createError) {
        return NextResponse.json(
          { error: `Failed to create demo user: ${createError.message}` },
          { status: 500 },
        );
      }
    }

    // 2. 리다이렉트 응답 생성 (쿠키를 바인딩하기 위해 먼저 생성)
    const response = NextResponse.redirect(new URL(redirectTo, request.url));

    // 3. 응답에 쿠키를 바인딩하는 supabase 클라이언트 생성
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            // 요청의 쿠키를 읽음
            const cookieHeader = request.headers.get("cookie") || "";
            return cookieHeader
              .split(";")
              .filter(Boolean)
              .map((c) => {
                const [name, ...rest] = c.trim().split("=");
                return { name, value: rest.join("=") };
              });
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    // 4. signInWithPassword로 로그인 (쿠키가 response에 세팅됨)
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });

    if (signInError) {
      return NextResponse.json(
        { error: `Failed to sign in: ${signInError.message}` },
        { status: 500 },
      );
    }

    // 5. TeamSpace 인트로 모달 억제 (데모 녹화 시 모달이 뜨지 않도록)
    if (signInData.user) {
      await supabaseAdmin
        .from("users")
        .update({ has_seen_teamspace_intro: true })
        .eq("id", signInData.user.id);
    }

    return response;
  } catch (error) {
    console.error("Demo auth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
