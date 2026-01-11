import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { generateQuestions } from "@/lib/claude";

// GET /api/sessions - 내 면접 세션 목록
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const auth = requireAuth(authHeader);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "10"))
    ); // 최대 100개로 제한
    const offset = (page - 1) * limit;
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const teamSpaceId = searchParams.get("team_space_id");

    // 세션 목록 조회
    let query = (supabaseAdmin as any).from("interview_sessions").select(
      `
        id,
        query,
        total_time,
        is_completed,
        created_at,
        session_questions(count)
      `,
      { count: "exact" }
    );

    // 팀 스페이스 ID가 있으면 팀 스페이스 세션 조회, 없으면 개인 세션 조회
    if (teamSpaceId) {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(teamSpaceId)) {
        // 멤버인지 확인
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: membership } = await (supabaseAdmin as any)
          .from("team_space_members")
          .select("id")
          .eq("team_space_id", teamSpaceId)
          .eq("user_id", auth.sub)
          .single();

        if (membership) {
          // 팀 스페이스 세션 ID 목록 먼저 조회
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: teamSpaceSessions, error: tssError } = await (
            supabaseAdmin as any
          )
            .from("team_space_sessions")
            .select("session_id")
            .eq("team_space_id", teamSpaceId);

          if (tssError) {
            console.error("팀 스페이스 세션 조회 실패:", tssError);
            return NextResponse.json(
              { error: "팀 스페이스 세션을 불러올 수 없습니다" },
              { status: 500 }
            );
          }

          // 세션 ID 목록이 있으면 필터링, 없으면 빈 배열 반환
          if (teamSpaceSessions && teamSpaceSessions.length > 0) {
            const sessionIds = teamSpaceSessions.map(
              (tss: any) => tss.session_id
            );
            query = query.in("id", sessionIds);
          } else {
            // 팀 스페이스에 세션이 없으면 빈 배열 반환
            return NextResponse.json({
              sessions: [],
              total: 0,
              page,
              limit,
            });
          }
        } else {
          return NextResponse.json(
            { error: "팀스페이스에 접근할 수 없습니다" },
            { status: 403 }
          );
        }
      }
    } else {
      // 개인 세션 조회
      query = query.eq("user_id", auth.sub);
    }

    // 날짜 범위 필터
    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      // endDate의 다음 날 00:00:00까지 포함
      const endDateObj = new Date(endDate);
      endDateObj.setDate(endDateObj.getDate() + 1);
      query = query.lt("created_at", endDateObj.toISOString());
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const {
      data: sessions,
      error,
      count,
    } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error("세션 목록 조회 실패");
    }

    // 각 세션별 답변 수 및 작성자 정보 조회
    const sessionsWithCounts = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sessions || []).map(async (session: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count: answeredCount } = await (supabaseAdmin as any)
          .from("answers")
          .select("id", { count: "exact", head: true })
          .eq("session_id", session.id);

        let sharedBy = null;
        if (teamSpaceId) {
          // 팀 스페이스 세션인 경우 작성자 정보 조회
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: teamSpaceSession } = await (supabaseAdmin as any)
            .from("team_space_sessions")
            .select("shared_by")
            .eq("team_space_id", teamSpaceId)
            .eq("session_id", session.id)
            .single();

          if (teamSpaceSession?.shared_by) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: user } = await (supabaseAdmin as any)
              .from("users")
              .select("id, username, nickname")
              .eq("id", teamSpaceSession.shared_by)
              .single();

            if (user) {
              sharedBy = {
                id: user.id,
                username: user.username || "",
                nickname: user.nickname || null,
              };
            }
          }
        }

        return {
          id: session.id,
          query: session.query,
          total_time: session.total_time,
          is_completed: session.is_completed,
          question_count:
            (session.session_questions as { count: number }[])?.[0]?.count || 0,
          answered_count: answeredCount || 0,
          created_at: session.created_at,
          user_id: session.user_id, // 소유자 ID 추가
          shared_by: sharedBy,
        };
      })
    );

    return NextResponse.json({
      sessions: sessionsWithCounts,
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    // 보안: 상세한 에러 메시지 노출 방지
    console.error("세션 목록 조회 실패:", error);

    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("인증이 필요")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "세션 목록을 불러올 수 없습니다" },
      { status: 500 }
    );
  }
}

// POST /api/sessions - 새 면접 세션 생성
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const auth = requireAuth(authHeader);

    const body = await request.json();
    let { query, question_ids, questions: questionsData } = body;

    // 입력 검증 및 길이 제한
    query = query?.slice(0, 500)?.trim() || null; // 최대 500자
    if (!query || query.length === 0) {
      return NextResponse.json(
        { error: "검색 쿼리는 필수입니다" },
        { status: 400 }
      );
    }

    // question_ids 배열 검증
    if (question_ids && Array.isArray(question_ids)) {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      question_ids = question_ids
        .filter((id: string) => uuidRegex.test(id))
        .slice(0, 50); // 최대 50개, 유효한 UUID만
    } else {
      question_ids = [];
    }

    // questions 배열 검증
    if (questionsData && Array.isArray(questionsData)) {
      questionsData = questionsData.slice(0, 50).map((q: any) => ({
        content: String(q.content || "").slice(0, 2000), // 최대 2000자
        hint: String(q.hint || "").slice(0, 1000), // 최대 1000자
        category: String(q.category || "")
          .slice(0, 50)
          .toUpperCase(), // 최대 50자
        subcategory: q.subcategory
          ? String(q.subcategory).slice(0, 50).toUpperCase()
          : undefined,
      }));
    }

    const questionIdsToUse: string[] = question_ids || [];

    // questions 데이터가 있으면 해당 질문들을 사용
    let questionsToProcess: Array<{
      content: string;
      hint: string;
      category: string;
      subcategory?: string;
    }> = [];

    if (
      questionsData &&
      Array.isArray(questionsData) &&
      questionsData.length > 0
    ) {
      questionsToProcess = questionsData;
    } else if (questionIdsToUse.length === 0) {
      // question_ids도 없고 questions도 없으면 Claude로 질문 생성
      const generatedQuestions = await generateQuestions(query);
      questionsToProcess = generatedQuestions;
    }

    // 질문이 있으면 DB에 저장
    if (questionsToProcess.length > 0) {
      // 질문들을 DB에 저장
      for (const q of questionsToProcess) {
        // 카테고리 ID 조회 또는 생성
        let categoryId: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existingCategory } = await (supabaseAdmin as any)
          .from("categories")
          .select("id")
          .eq("name", q.category.toUpperCase())
          .single();

        if (existingCategory) {
          categoryId = existingCategory.id;
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: newCategory, error: catError } = await (
            supabaseAdmin as any
          )
            .from("categories")
            .insert({
              name: q.category.toUpperCase(),
              display_name: q.category,
              sort_order: 99,
            })
            .select("id")
            .single();

          if (catError || !newCategory) {
            console.error("카테고리 생성 실패:", catError);
            continue; // 카테고리 생성 실패 시 해당 질문 건너뛰기
          }
          categoryId = newCategory.id;
        }

        // 소분류 ID 조회 (있는 경우)
        let subcategoryId: string | null = null;
        if (q.subcategory) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: existingSubcategory } = await (supabaseAdmin as any)
            .from("subcategories")
            .select("id")
            .eq("category_id", categoryId)
            .eq("name", q.subcategory.toUpperCase())
            .single();

          if (existingSubcategory) {
            subcategoryId = existingSubcategory.id;
          }
        }

        // 질문 저장
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newQuestion, error: qError } = await (
          supabaseAdmin as any
        )
          .from("questions")
          .insert({
            content: q.content,
            content_normalized: q.content.toLowerCase(),
            hint: q.hint,
            category_id: categoryId,
            subcategory_id: subcategoryId,
            difficulty: "MEDIUM",
            is_verified: false,
            created_by: auth.sub,
          })
          .select("id")
          .single();

        if (qError || !newQuestion) {
          console.error("질문 저장 실패:", qError);
          continue; // 질문 저장 실패 시 해당 질문 건너뛰기
        }

        questionIdsToUse.push(newQuestion.id);
      }
    }

    // 세션 생성
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session, error: sessionError } = await (supabaseAdmin as any)
      .from("interview_sessions")
      .insert({
        user_id: auth.sub,
        query,
        total_time: 0,
        is_completed: false,
      })
      .select()
      .single();

    if (sessionError || !session) {
      console.error("세션 생성 실패:", sessionError);
      return NextResponse.json(
        { error: "세션 생성에 실패했습니다" },
        { status: 500 }
      );
    }

    // 세션-질문 연결
    const sessionQuestions = questionIdsToUse.map((questionId, index) => ({
      session_id: session.id,
      question_id: questionId,
      question_order: index + 1,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: sqError } = await (supabaseAdmin as any)
      .from("session_questions")
      .insert(sessionQuestions);

    if (sqError) {
      console.error("세션-질문 연결 실패:", sqError);
      // 세션은 생성되었으므로 부분 실패로 처리
    }

    // 현재 선택된 팀 스페이스가 있으면 자동으로 공유
    const currentTeamSpaceId = request.headers.get("X-Current-Team-Space-Id");
    if (currentTeamSpaceId) {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(currentTeamSpaceId)) {
        // 멤버인지 확인
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: membership } = await (supabaseAdmin as any)
          .from("team_space_members")
          .select("id")
          .eq("team_space_id", currentTeamSpaceId)
          .eq("user_id", auth.sub)
          .single();

        if (membership) {
          // 이미 공유된 세션인지 확인
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: existing } = await (supabaseAdmin as any)
            .from("team_space_sessions")
            .select("id")
            .eq("team_space_id", currentTeamSpaceId)
            .eq("session_id", session.id)
            .single();

          if (!existing) {
            // 자동 공유
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabaseAdmin as any).from("team_space_sessions").insert({
              team_space_id: currentTeamSpaceId,
              session_id: session.id,
              shared_by: auth.sub,
              week_number: null, // 주차는 나중에 설정 가능
            });
          }
        }
      }
    }

    // 생성된 세션과 질문 정보 반환
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sessionQuestionsData } = await (supabaseAdmin as any)
      .from("session_questions")
      .select(
        `
        question_order,
        questions!inner(
          id,
          content,
          hint,
          difficulty,
          categories!inner(name, display_name),
          subcategories(name, display_name)
        )
      `
      )
      .eq("session_id", session.id)
      .order("question_order");

    return NextResponse.json(
      {
        session: {
          id: session.id,
          created_at: session.created_at,
        },
        query: session.query,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        questions: sessionQuestionsData?.map((sq: any) => ({
          ...sq.questions,
          order: sq.question_order,
        })),
      },
      { status: 201 }
    );
  } catch (error) {
    // 보안: 상세한 에러 메시지 노출 방지
    console.error("세션 생성 실패:", error);

    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("인증이 필요")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "세션 생성에 실패했습니다" },
      { status: 500 }
    );
  }
}
