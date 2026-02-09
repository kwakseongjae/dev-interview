import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase";
import { generateQuestions, summarizeQueryToTitle } from "@/lib/claude";

// GET /api/sessions - 내 면접 세션 목록
export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "10")),
    ); // 최대 100개로 제한
    const offset = (page - 1) * limit;
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const teamSpaceId = searchParams.get("team_space_id");
    const interviewTypeId = searchParams.get("interview_type_id");

    // 세션 목록 조회 (interview_type 포함)
    let query = supabaseAdmin.from("interview_sessions").select(
      `
        id,
        user_id,
        query,
        total_time,
        is_completed,
        interview_type_id,
        created_at,
        session_questions(count),
        interview_types(
          id,
          code,
          name,
          display_name,
          description,
          icon,
          color,
          sort_order
        )
      `,
      { count: "exact" },
    );

    // 팀 스페이스 ID가 있으면 팀 스페이스 세션 조회, 없으면 개인 세션 조회
    if (teamSpaceId) {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(teamSpaceId)) {
        // 멤버인지 확인
        const { data: membership } = await supabaseAdmin
          .from("team_space_members")
          .select("id")
          .eq("team_space_id", teamSpaceId)
          .eq("user_id", auth.sub)
          .single();

        if (membership) {
          // 팀 스페이스 세션 ID 목록 먼저 조회
          const { data: teamSpaceSessions, error: tssError } =
            await supabaseAdmin
              .from("team_space_sessions")
              .select("session_id")
              .eq("team_space_id", teamSpaceId);

          if (tssError) {
            console.error("팀 스페이스 세션 조회 실패:", tssError);
            return NextResponse.json(
              { error: "팀 스페이스 세션을 불러올 수 없습니다" },
              { status: 500 },
            );
          }

          // 세션 ID 목록이 있으면 필터링, 없으면 빈 배열 반환
          if (teamSpaceSessions && teamSpaceSessions.length > 0) {
            const sessionIds = teamSpaceSessions.map(
              (tss: { session_id: string }) => tss.session_id,
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
            { status: 403 },
          );
        }
      }
    } else {
      // 개인 세션 조회
      query = query.eq("user_id", auth.sub);
    }

    // 완료된 세션만 조회
    query = query.eq("is_completed", true);

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

    // 면접 범주 필터
    if (interviewTypeId) {
      query = query.eq("interview_type_id", interviewTypeId);
    }

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
      (sessions || []).map(async (session) => {
        const { count: answeredCount } = await supabaseAdmin
          .from("answers")
          .select("id", { count: "exact", head: true })
          .eq("session_id", session.id);

        let sharedBy = null;
        if (teamSpaceId) {
          // 팀 스페이스 세션인 경우 작성자 정보 조회
          const { data: teamSpaceSession } = await supabaseAdmin
            .from("team_space_sessions")
            .select("shared_by")
            .eq("team_space_id", teamSpaceId)
            .eq("session_id", session.id)
            .single();

          if (teamSpaceSession?.shared_by) {
            const { data: user } = await supabaseAdmin
              .from("users")
              .select("id, email, nickname")
              .eq("id", teamSpaceSession.shared_by)
              .single();

            if (user) {
              sharedBy = {
                id: user.id,
                username: user.email?.split("@")[0] || "",
                nickname: user.nickname || null,
              };
            }
          }
        }

        // interview_type 정보 포맷팅
        const interviewType = session.interview_types
          ? {
              id: session.interview_types.id,
              code: session.interview_types.code,
              name: session.interview_types.name,
              displayName: session.interview_types.display_name,
              description: session.interview_types.description,
              icon: session.interview_types.icon,
              color: session.interview_types.color,
              sortOrder: session.interview_types.sort_order,
            }
          : null;

        return {
          id: session.id,
          query: session.query,
          total_time: session.total_time,
          is_completed: session.is_completed,
          interview_type_id: session.interview_type_id,
          interview_type: interviewType,
          question_count:
            (session.session_questions as { count: number }[])?.[0]?.count || 0,
          answered_count: answeredCount || 0,
          created_at: session.created_at,
          user_id: session.user_id, // 소유자 ID 추가
          shared_by: sharedBy,
        };
      }),
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
      { status: 500 },
    );
  }
}

// POST /api/sessions - 새 면접 세션 생성
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser();

    const body = await request.json();
    let { query, question_ids, questions: questionsData } = body;
    const { interview_type_id } = body;

    // 입력 검증 및 길이 제한
    query = query?.slice(0, 500)?.trim() || null; // 최대 500자
    if (!query || query.length === 0) {
      return NextResponse.json(
        { error: "검색 쿼리는 필수입니다" },
        { status: 400 },
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
      questionsData = questionsData
        .slice(0, 50)
        .map(
          (q: {
            content?: string;
            hint?: string;
            category?: string;
            subcategory?: string;
          }) => ({
            content: String(q.content || "").slice(0, 2000), // 최대 2000자
            hint: String(q.hint || "").slice(0, 1000), // 최대 1000자
            category: String(q.category || "")
              .slice(0, 50)
              .toUpperCase(), // 최대 50자
            subcategory: q.subcategory
              ? String(q.subcategory).slice(0, 50).toUpperCase()
              : undefined,
          }),
        );
    }

    const questionIdsToUse: string[] = question_ids || [];

    // 제목 요약을 미리 시작 (질문 처리와 병렬로 실행)
    const titlePromise = summarizeQueryToTitle(query);

    // questions 데이터가 있으면 해당 질문들을 사용
    let questionsToProcess: Array<{
      content: string;
      hint: string;
      category: string;
      subcategory?: string;
      isTrending?: boolean;
      trendTopic?: string;
    }> = [];

    // question_ids가 있으면 기존 질문을 재사용하므로 새 질문 생성하지 않음
    if (questionIdsToUse.length > 0) {
      // 기존 질문 ID들을 그대로 사용
      questionsToProcess = [];
    } else if (
      questionsData &&
      Array.isArray(questionsData) &&
      questionsData.length > 0
    ) {
      // question_ids가 없고 questionsData가 있으면 새 질문 생성
      questionsToProcess = questionsData;
    } else {
      // question_ids도 없고 questions도 없으면 Claude로 질문 생성
      const result = await generateQuestions(query);
      questionsToProcess = result.questions;
    }

    // 질문이 있으면 DB에 저장
    if (questionsToProcess.length > 0) {
      // 질문들을 DB에 저장
      for (const q of questionsToProcess) {
        // 카테고리 ID 조회 또는 생성
        let categoryId: string;
        const { data: existingCategory } = await supabaseAdmin
          .from("categories")
          .select("id")
          .eq("name", q.category.toUpperCase())
          .single();

        if (existingCategory) {
          categoryId = existingCategory.id;
        } else {
          const { data: newCategory, error: catError } = await supabaseAdmin
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
          const { data: existingSubcategory } = await supabaseAdmin
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
        const { data: newQuestion, error: qError } = await supabaseAdmin
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
            is_trending: q.isTrending || false,
            trend_topic: q.trendTopic || null,
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

    // 병렬로 시작한 제목 요약 결과 대기
    const sessionTitle = await titlePromise;

    // 세션 생성 (interview_type_id 포함)
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("interview_sessions")
      .insert({
        user_id: auth.sub,
        query: sessionTitle,
        total_time: 0,
        is_completed: false,
        interview_type_id: interview_type_id || null,
      })
      .select()
      .single();

    if (sessionError || !session) {
      console.error("세션 생성 실패:", sessionError);
      return NextResponse.json(
        { error: "세션 생성에 실패했습니다" },
        { status: 500 },
      );
    }

    // 세션-질문 연결
    const sessionQuestions = questionIdsToUse.map((questionId, index) => ({
      session_id: session.id,
      question_id: questionId,
      question_order: index + 1,
    }));

    const { error: sqError } = await supabaseAdmin
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
        const { data: membership } = await supabaseAdmin
          .from("team_space_members")
          .select("id")
          .eq("team_space_id", currentTeamSpaceId)
          .eq("user_id", auth.sub)
          .single();

        if (membership) {
          // 이미 공유된 세션인지 확인
          const { data: existing } = await supabaseAdmin
            .from("team_space_sessions")
            .select("id")
            .eq("team_space_id", currentTeamSpaceId)
            .eq("session_id", session.id)
            .single();

          if (!existing) {
            // 자동 공유
            await supabaseAdmin.from("team_space_sessions").insert({
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
    const { data: sessionQuestionsData } = await supabaseAdmin
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
      .eq("session_id", session.id)
      .order("question_order");

    return NextResponse.json(
      {
        session: {
          id: session.id,
          created_at: session.created_at,
        },
        query: session.query,
        questions: sessionQuestionsData?.map(
          (sq: {
            questions: Record<string, unknown>;
            question_order: number;
          }) => ({
            ...sq.questions,
            order: sq.question_order,
          }),
        ),
      },
      { status: 201 },
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
      { status: 500 },
    );
  }
}
