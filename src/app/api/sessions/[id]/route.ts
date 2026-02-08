import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/sessions/:id - 세션 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireUser();

    const { id: sessionId } = await params;

    // UUID 형식 검증
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return NextResponse.json(
        { error: "유효하지 않은 세션 ID입니다" },
        { status: 400 },
      );
    }

    // 세션 조회 (본인 세션이거나 팀스페이스에 공유된 세션)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session, error: sessionError } = await (supabaseAdmin as any)
      .from("interview_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "세션을 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    // 본인 세션이 아니면 팀스페이스에 공유된 세션인지 확인
    if (session.user_id !== auth.sub) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: teamSpaceSession } = await (supabaseAdmin as any)
        .from("team_space_sessions")
        .select(
          `
          team_space_id,
          team_spaces!inner(
            id,
            team_space_members!inner(
              user_id,
              role
            )
          )
        `,
        )
        .eq("session_id", sessionId)
        .eq("team_spaces.team_space_members.user_id", auth.sub)
        .maybeSingle();

      if (!teamSpaceSession) {
        return NextResponse.json(
          { error: "세션에 접근할 수 없습니다" },
          { status: 403 },
        );
      }
    }

    // 세션의 질문들 조회
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sessionQuestions, error: sqError } = await (
      supabaseAdmin as any
    )
      .from("session_questions")
      .select(
        `
        question_order,
        questions!inner(
          id,
          content,
          hint,
          difficulty,
          is_trending,
          trend_topic,
          categories!inner(name, display_name),
          subcategories(name, display_name)
        )
      `,
      )
      .eq("session_id", sessionId)
      .order("question_order");

    if (sqError) {
      throw new Error("질문 조회 실패");
    }

    // 각 질문별 답변 조회
    const questionsWithAnswers = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sessionQuestions || []).map(async (sq: any) => {
        const question = sq.questions as {
          id: string;
          content: string;
          hint: string | null;
          difficulty: string;
          categories: { name: string; display_name: string };
          subcategories: { name: string; display_name: string } | null;
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: answer } = await (supabaseAdmin as any)
          .from("answers")
          .select("id, content, time_spent, ai_score, ai_feedback, created_at")
          .eq("session_id", sessionId)
          .eq("question_id", question.id)
          .single();

        // 찜 여부 확인 (이미 찜한 질문인지 확인)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: favorite } = await (supabaseAdmin as any)
          .from("favorites")
          .select("id")
          .eq("user_id", auth.sub)
          .eq("question_id", question.id)
          .maybeSingle();

        return {
          id: question.id,
          content: question.content,
          hint: question.hint,
          difficulty: question.difficulty,
          category: question.categories,
          subcategory: question.subcategories,
          order: sq.question_order,
          answer: answer || null,
          is_favorited: !!favorite,
        };
      }),
    );

    return NextResponse.json({
      id: session.id,
      query: session.query,
      total_time: session.total_time,
      is_completed: session.is_completed,
      questions: questionsWithAnswers,
      created_at: session.created_at,
    });
  } catch (error) {
    // 보안: 상세한 에러 메시지 노출 방지
    console.error("세션 조회 실패:", error);

    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("인증이 필요")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "세션을 불러올 수 없습니다" },
      { status: 500 },
    );
  }
}

// DELETE /api/sessions/:id - 세션 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireUser();

    const { id: sessionId } = await params;

    // UUID 형식 검증
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return NextResponse.json(
        { error: "유효하지 않은 세션 ID입니다" },
        { status: 400 },
      );
    }

    // 세션 조회
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session } = await (supabaseAdmin as any)
      .from("interview_sessions")
      .select("user_id")
      .eq("id", sessionId)
      .single();

    if (!session) {
      return NextResponse.json(
        { error: "세션을 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    // 본인 세션인지 확인
    const isOwner = session.user_id === auth.sub;

    // 본인 세션이 아니면 팀스페이스 소유자인지 확인
    let canDelete = isOwner;
    if (!isOwner) {
      // 세션이 공유된 팀스페이스 ID 목록 조회
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: teamSpaceSessions } = await (supabaseAdmin as any)
        .from("team_space_sessions")
        .select("team_space_id")
        .eq("session_id", sessionId);

      if (teamSpaceSessions && teamSpaceSessions.length > 0) {
        const teamSpaceIds = teamSpaceSessions.map(
          (tss: any) => tss.team_space_id,
        );
        // 해당 팀스페이스의 소유자인지 확인
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: ownership } = await (supabaseAdmin as any)
          .from("team_space_members")
          .select("id")
          .in("team_space_id", teamSpaceIds)
          .eq("user_id", auth.sub)
          .eq("role", "owner")
          .limit(1);

        canDelete = ownership && ownership.length > 0;
      }
    }

    if (!canDelete) {
      return NextResponse.json(
        { error: "세션을 삭제할 권한이 없습니다" },
        { status: 403 },
      );
    }

    // 세션 삭제
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from("interview_sessions")
      .delete()
      .eq("id", sessionId);

    if (error) {
      throw new Error("세션 삭제 실패");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // 보안: 상세한 에러 메시지 노출 방지
    console.error("세션 삭제 실패:", error);

    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("인증이 필요")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "세션 삭제에 실패했습니다" },
      { status: 500 },
    );
  }
}
