import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase";
import {
  getCaseStudyBySlug,
  incrementInterviewCount,
} from "@/lib/case-studies";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

// POST /api/case-studies/[slug]/start - 케이스 스터디 면접 세션 생성
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const auth = await requireUser();

    const { slug } = await params;

    // 1. 케이스 스터디 조회
    const caseStudy = await getCaseStudyBySlug(slug);
    if (!caseStudy) {
      return NextResponse.json(
        { error: "케이스 스터디를 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    if (caseStudy.seedQuestions.length === 0) {
      return NextResponse.json(
        { error: "면접 질문이 준비되지 않았습니다" },
        { status: 400 },
      );
    }

    // 2. interview_types에서 CASE_STUDY 타입 조회
    const { data: interviewType } = await db
      .from("interview_types")
      .select("id")
      .eq("code", "CASE_STUDY")
      .single();

    const interviewTypeId = interviewType?.id || null;

    // 3. seed questions를 DB에 저장
    const questionIdsToUse: string[] = [];

    for (const q of caseStudy.seedQuestions) {
      // 카테고리 조회 또는 생성
      let categoryId: string;
      const { data: existingCategory } = await db
        .from("categories")
        .select("id")
        .eq("name", q.category.toUpperCase())
        .single();

      if (existingCategory) {
        categoryId = existingCategory.id;
      } else {
        const { data: newCategory, error: catError } = await db
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
          continue;
        }
        categoryId = newCategory.id;
      }

      // 질문 저장
      const { data: newQuestion, error: qError } = await db
        .from("questions")
        .insert({
          content: q.content,
          content_normalized: q.content.toLowerCase(),
          hint: q.hint,
          category_id: categoryId,
          subcategory_id: null,
          difficulty: "MEDIUM",
          is_verified: false,
          created_by: auth.sub,
        })
        .select("id")
        .single();

      if (qError || !newQuestion) {
        console.error("질문 저장 실패:", qError);
        continue;
      }

      questionIdsToUse.push(newQuestion.id);
    }

    if (questionIdsToUse.length === 0) {
      return NextResponse.json(
        { error: "질문 생성에 실패했습니다" },
        { status: 500 },
      );
    }

    // 4. 세션 생성
    const { data: session, error: sessionError } = await db
      .from("interview_sessions")
      .insert({
        user_id: auth.sub,
        query: caseStudy.title,
        total_time: 0,
        is_completed: false,
        interview_type_id: interviewTypeId,
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

    // 5. 세션-질문 연결
    const sessionQuestions = questionIdsToUse.map((questionId, index) => ({
      session_id: session.id,
      question_id: questionId,
      question_order: index + 1,
    }));

    const { error: sqError } = await db
      .from("session_questions")
      .insert(sessionQuestions);

    if (sqError) {
      console.error("세션-질문 연결 실패:", sqError);
    }

    // 6. 팀 스페이스 자동 공유
    const currentTeamSpaceId = request.headers.get("X-Current-Team-Space-Id");
    if (currentTeamSpaceId) {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(currentTeamSpaceId)) {
        const { data: membership } = await db
          .from("team_space_members")
          .select("id")
          .eq("team_space_id", currentTeamSpaceId)
          .eq("user_id", auth.sub)
          .single();

        if (membership) {
          await db.from("team_space_sessions").insert({
            team_space_id: currentTeamSpaceId,
            session_id: session.id,
            shared_by: auth.sub,
            week_number: null,
          });
        }
      }
    }

    // 7. 면접 횟수 증가 (비동기)
    incrementInterviewCount(caseStudy.id).catch(() => {});

    // 8. 세션과 질문 정보 반환
    const { data: sessionQuestionsData } = await db
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
        caseStudyId: caseStudy.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        questions: sessionQuestionsData?.map((sq: any) => ({
          ...sq.questions,
          order: sq.question_order,
        })),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("케이스 스터디 세션 생성 실패:", error);

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
