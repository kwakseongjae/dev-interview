import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/team-spaces/:id/sessions - 팀스페이스의 면접 기록 목록
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const auth = requireAuth(authHeader);

    const { id: teamSpaceId } = await params;

    // UUID 형식 검증
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(teamSpaceId)) {
      return NextResponse.json(
        { error: "유효하지 않은 팀스페이스 ID입니다" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const weekNumberParam = searchParams.get("week");
    const weekNumber = weekNumberParam
      ? Math.max(1, Math.min(52, parseInt(weekNumberParam) || 1))
      : null; // 1-52 범위로 제한
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    // 멤버인지 확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: membership } = await (supabaseAdmin as any)
      .from("team_space_members")
      .select("role")
      .eq("team_space_id", teamSpaceId)
      .eq("user_id", auth.sub)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "팀스페이스에 접근할 수 없습니다" },
        { status: 403 },
      );
    }

    // 팀스페이스의 면접 기록 조회
    let query = (supabaseAdmin as any)
      .from("team_space_sessions")
      .select(
        `
        id,
        week_number,
        shared_at,
        shared_by,
        sessions!inner(
          id,
          query,
          total_time,
          is_completed,
          created_at
        )
      `,
      )
      .eq("team_space_id", teamSpaceId);

    if (weekNumber) {
      query = query.eq("week_number", weekNumber);
    }

    // 날짜 범위 필터 (세션의 created_at 기준)
    if (startDate || endDate) {
      // 서브쿼리로 날짜 필터링된 세션 ID만 가져오기
      let sessionQuery = (supabaseAdmin as any)
        .from("interview_sessions")
        .select("id");
      if (startDate) {
        sessionQuery = sessionQuery.gte("created_at", startDate);
      }
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setDate(endDateObj.getDate() + 1);
        sessionQuery = sessionQuery.lt("created_at", endDateObj.toISOString());
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: filteredSessions } = await sessionQuery;
      if (filteredSessions && filteredSessions.length > 0) {
        const sessionIds = filteredSessions.map((s: any) => s.id);
        query = query.in("session_id", sessionIds);
      } else {
        // 필터링 결과가 없으면 빈 배열 반환
        return NextResponse.json({
          sessions: [],
        });
      }
    }

    query = query.order("shared_at", { ascending: false });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sharedSessions, error } = await query;

    if (error) {
      // 에러가 발생해도 빈 배열 반환 (면접 기록이 없는 경우도 정상)
      return NextResponse.json({
        sessions: [],
      });
    }

    // 공유된 세션이 없으면 빈 배열 반환
    if (!sharedSessions || sharedSessions.length === 0) {
      return NextResponse.json({
        sessions: [],
      });
    }

    // 각 세션의 작성자 정보 조회
    const sessionsWithUsers = await Promise.all(
      sharedSessions.map(async (ss: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: user } = await (supabaseAdmin as any)
          .from("users")
          .select("id, username, nickname")
          .eq("id", ss.shared_by)
          .single();

        return {
          id: ss.sessions.id,
          query: ss.sessions.query,
          total_time: ss.sessions.total_time,
          is_completed: ss.sessions.is_completed,
          created_at: ss.sessions.created_at,
          week_number: ss.week_number,
          shared_at: ss.shared_at,
          shared_by: {
            id: user?.id || ss.shared_by,
            username: user?.username || "",
            nickname: user?.nickname || null,
          },
        };
      }),
    );

    return NextResponse.json({
      sessions: sessionsWithUsers,
    });
  } catch (error) {
    // 보안: 상세한 에러 메시지 노출 방지
    console.error("면접 기록 조회 실패:", error);

    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("인증이 필요")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "면접 기록을 불러올 수 없습니다" },
      { status: 500 },
    );
  }
}

// POST /api/team-spaces/:id/sessions - 면접 기록을 팀스페이스에 공유
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const auth = requireAuth(authHeader);

    const { id: teamSpaceId } = await params;
    const body = await request.json();
    let { session_id, week_number } = body;

    // 입력 검증
    // UUID 형식 검증
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!session_id || !uuidRegex.test(session_id)) {
      return NextResponse.json(
        { error: "유효하지 않은 세션 ID입니다" },
        { status: 400 },
      );
    }
    if (week_number !== undefined) {
      week_number = Math.max(
        1,
        Math.min(52, parseInt(String(week_number)) || 1),
      ); // 1-52 범위로 제한
    }

    // 멤버인지 확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: membership } = await (supabaseAdmin as any)
      .from("team_space_members")
      .select("role")
      .eq("team_space_id", teamSpaceId)
      .eq("user_id", auth.sub)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "팀스페이스에 접근할 수 없습니다" },
        { status: 403 },
      );
    }

    // 세션 소유권 확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session } = await (supabaseAdmin as any)
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

    // 이미 공유된 세션인지 확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabaseAdmin as any)
      .from("team_space_sessions")
      .select("id")
      .eq("team_space_id", teamSpaceId)
      .eq("session_id", session_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "이미 공유된 면접 기록입니다" },
        { status: 409 },
      );
    }

    // 공유
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sharedSession, error } = await (supabaseAdmin as any)
      .from("team_space_sessions")
      .insert({
        team_space_id: teamSpaceId,
        session_id,
        shared_by: auth.sub,
        week_number: week_number || null,
      })
      .select()
      .single();

    if (error || !sharedSession) {
      console.error("면접 기록 공유 실패:", error);
      return NextResponse.json(
        { error: "면접 기록 공유에 실패했습니다" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        id: sharedSession.id,
        session_id: sharedSession.session_id,
        week_number: sharedSession.week_number,
        shared_at: sharedSession.shared_at,
      },
      { status: 201 },
    );
  } catch (error) {
    // 보안: 상세한 에러 메시지 노출 방지
    console.error("면접 기록 공유 실패:", error);

    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("인증이 필요")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "면접 기록 공유에 실패했습니다" },
      { status: 500 },
    );
  }
}
