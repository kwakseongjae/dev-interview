import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/answers - 답변 저장
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser();

    const body = await request.json();
    let { session_id, question_id, content, time_spent, is_public } = body;

    // UUID 형식 검증
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!session_id || !uuidRegex.test(session_id)) {
      return NextResponse.json(
        { error: "유효하지 않은 세션 ID입니다" },
        { status: 400 },
      );
    }
    if (!question_id || !uuidRegex.test(question_id)) {
      return NextResponse.json(
        { error: "유효하지 않은 질문 ID입니다" },
        { status: 400 },
      );
    }

    // 입력 검증 및 길이 제한
    content = content?.slice(0, 10000) || null; // 최대 10000자
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "답변 내용은 필수입니다" },
        { status: 400 },
      );
    }
    time_spent = Math.max(
      0,
      Math.min(86400, parseInt(String(time_spent)) || 0),
    ); // 0-86400초 범위
    is_public = Boolean(is_public); // boolean으로 강제 변환

    // 세션 소유권 확인
    const { data: session } = await supabaseAdmin
      .from("interview_sessions")
      .select("id")
      .eq("id", session_id)
      .eq("user_id", auth.sub)
      .single();

    if (!session) {
      return NextResponse.json(
        { error: "세션을 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    // 기존 답변 확인 (이미 있으면 업데이트)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingAnswer } = await (supabaseAdmin as any)
      .from("answers")
      .select("id")
      .eq("session_id", session_id)
      .eq("question_id", question_id)
      .eq("user_id", auth.sub)
      .single();

    let answer;

    if (existingAnswer) {
      // 기존 답변 업데이트
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabaseAdmin as any)
        .from("answers")
        .update({
          content,
          time_spent: time_spent || 0,
          is_public: is_public ?? false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingAnswer.id)
        .select()
        .single();

      if (error) {
        console.error("답변 업데이트 실패:", error);
        return NextResponse.json(
          { error: "답변 업데이트에 실패했습니다" },
          { status: 500 },
        );
      }
      answer = data;
    } else {
      // 새 답변 생성
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabaseAdmin as any)
        .from("answers")
        .insert({
          session_id,
          question_id,
          user_id: auth.sub,
          content,
          time_spent: time_spent || 0,
          is_public: is_public ?? false,
        })
        .select()
        .single();

      if (error) {
        console.error("답변 저장 실패:", error);
        return NextResponse.json(
          { error: "답변 저장에 실패했습니다" },
          { status: 500 },
        );
      }
      answer = data;
    }

    return NextResponse.json(
      {
        id: answer.id,
        content: answer.content,
        time_spent: answer.time_spent,
        is_public: answer.is_public,
        created_at: answer.created_at,
      },
      { status: existingAnswer ? 200 : 201 },
    );
  } catch (error) {
    // 보안: 상세한 에러 메시지 노출 방지
    console.error("답변 저장 실패:", error);

    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("인증이 필요")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "답변 저장에 실패했습니다" },
      { status: 500 },
    );
  }
}
