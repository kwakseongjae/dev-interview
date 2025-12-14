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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    // 세션 목록 조회
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sessions, error, count } = await (supabaseAdmin as any)
      .from("interview_sessions")
      .select(
        `
        id,
        query,
        total_time,
        is_completed,
        created_at,
        session_questions(count)
      `,
        { count: "exact" }
      )
      .eq("user_id", auth.sub)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error("세션 목록 조회 실패");
    }

    // 각 세션별 답변 수 조회
    const sessionsWithCounts = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sessions || []).map(async (session: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count: answeredCount } = await (supabaseAdmin as any)
          .from("answers")
          .select("id", { count: "exact", head: true })
          .eq("session_id", session.id);

        return {
          id: session.id,
          query: session.query,
          total_time: session.total_time,
          is_completed: session.is_completed,
          question_count: (session.session_questions as { count: number }[])?.[0]?.count || 0,
          answered_count: answeredCount || 0,
          created_at: session.created_at,
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
    const message =
      error instanceof Error ? error.message : "세션 목록 조회에 실패했습니다";

    if (message.includes("인증이 필요")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/sessions - 새 면접 세션 생성
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const auth = requireAuth(authHeader);

    const body = await request.json();
    const { query, question_ids } = body;

    // 입력 검증
    if (!query) {
      return NextResponse.json(
        { error: "검색 쿼리는 필수입니다" },
        { status: 400 }
      );
    }

    const questionIdsToUse: string[] = question_ids || [];

    // question_ids가 없으면 Claude로 질문 생성
    if (questionIdsToUse.length === 0) {
      const generatedQuestions = await generateQuestions(query);

      // 생성된 질문들을 DB에 저장
      for (const q of generatedQuestions) {
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
          const { data: newCategory, error: catError } = await (supabaseAdmin as any)
            .from("categories")
            .insert({
              name: q.category.toUpperCase(),
              display_name: q.category,
              sort_order: 99,
            })
            .select("id")
            .single();

          if (catError || !newCategory) {
            throw new Error("카테고리 생성 실패");
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
        const { data: newQuestion, error: qError } = await (supabaseAdmin as any)
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
          throw new Error("질문 저장 실패");
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
      throw new Error("세션 생성 실패");
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
      throw new Error("세션-질문 연결 실패");
    }

    // 생성된 세션과 질문 정보 반환
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: questionsData } = await (supabaseAdmin as any)
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
        id: session.id,
        query: session.query,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        questions: questionsData?.map((sq: any) => ({
          ...sq.questions,
          order: sq.question_order,
        })),
        created_at: session.created_at,
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "세션 생성에 실패했습니다";

    if (message.includes("인증이 필요")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
