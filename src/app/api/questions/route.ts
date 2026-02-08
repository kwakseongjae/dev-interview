import { NextRequest, NextResponse } from "next/server";
import { getUserOptional } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/questions - 질문 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 입력 검증 및 제한
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20")),
    ); // 최대 100개로 제한
    const category = searchParams.get("category")?.slice(0, 50) || null; // 최대 50자
    const subcategory = searchParams.get("subcategory")?.slice(0, 50) || null; // 최대 50자
    const difficulty = searchParams.get("difficulty")?.slice(0, 20) || null; // 최대 20자
    const search = searchParams.get("search")?.slice(0, 200) || null; // 최대 200자로 제한

    const offset = (page - 1) * limit;

    // 기본 쿼리 빌드
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabaseAdmin as any)
      .from("questions")
      .select(
        `
        id,
        content,
        hint,
        difficulty,
        favorite_count,
        is_verified,
        created_at,
        categories!inner(id, name, display_name),
        subcategories(id, name, display_name)
      `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    // 필터 적용
    if (category) {
      query = query.eq("categories.name", category.toUpperCase());
    }

    if (subcategory) {
      query = query.eq("subcategories.name", subcategory.toUpperCase());
    }

    if (difficulty) {
      query = query.eq("difficulty", difficulty.toUpperCase());
    }

    if (search) {
      query = query.ilike("content", `%${search}%`);
    }

    // 페이지네이션
    query = query.range(offset, offset + limit - 1);

    const { data: questions, error, count } = await query;

    if (error) {
      console.error("질문 목록 조회 실패:", error);
      return NextResponse.json(
        { error: "질문 목록을 불러올 수 없습니다" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      questions: questions || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    // 보안: 상세한 에러 메시지 노출 방지
    console.error("질문 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "질문 목록을 불러올 수 없습니다" },
      { status: 500 },
    );
  }
}

// POST /api/questions - 새 질문 생성 (관리자 또는 인증된 사용자)
export async function POST(request: NextRequest) {
  try {
    const auth = await getUserOptional();

    const body = await request.json();
    let { content, hint, category_id, subcategory_id, difficulty } = body;

    // 입력 검증 및 길이 제한
    content = content?.slice(0, 2000)?.trim() || null; // 최대 2000자
    hint = hint?.slice(0, 1000) || null; // 최대 1000자
    difficulty = difficulty?.slice(0, 20)?.toUpperCase() || "MEDIUM"; // 최대 20자

    // UUID 형식 검증
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!content || content.length === 0) {
      return NextResponse.json(
        { error: "질문 내용은 필수입니다" },
        { status: 400 },
      );
    }
    if (!category_id || !uuidRegex.test(category_id)) {
      return NextResponse.json(
        { error: "유효하지 않은 카테고리 ID입니다" },
        { status: 400 },
      );
    }
    if (subcategory_id && !uuidRegex.test(subcategory_id)) {
      return NextResponse.json(
        { error: "유효하지 않은 서브카테고리 ID입니다" },
        { status: 400 },
      );
    }

    // 질문 생성
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: question, error } = await (supabaseAdmin as any)
      .from("questions")
      .insert({
        content,
        content_normalized: content.toLowerCase(),
        hint: hint || null,
        category_id,
        subcategory_id: subcategory_id || null,
        difficulty: difficulty || "MEDIUM",
        is_verified: false,
        created_by: auth?.sub || null,
      })
      .select(
        `
        id,
        content,
        hint,
        difficulty,
        favorite_count,
        is_verified,
        created_at,
        categories!inner(id, name, display_name),
        subcategories(id, name, display_name)
      `,
      )
      .single();

    if (error) {
      console.error("질문 생성 실패:", error);
      return NextResponse.json(
        { error: "질문 생성에 실패했습니다" },
        { status: 500 },
      );
    }

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    // 보안: 상세한 에러 메시지 노출 방지
    console.error("질문 생성 실패:", error);
    return NextResponse.json(
      { error: "질문 생성에 실패했습니다" },
      { status: 500 },
    );
  }
}
