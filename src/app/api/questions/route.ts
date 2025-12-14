import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/questions - 질문 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const category = searchParams.get("category");
    const subcategory = searchParams.get("subcategory");
    const difficulty = searchParams.get("difficulty");
    const search = searchParams.get("search");

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
        { count: "exact" }
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
      throw new Error("질문 목록 조회 실패");
    }

    return NextResponse.json({
      questions: questions || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "질문 목록 조회에 실패했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/questions - 새 질문 생성 (관리자 또는 인증된 사용자)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const auth = getAuthFromRequest(authHeader);

    const body = await request.json();
    const { content, hint, category_id, subcategory_id, difficulty } = body;

    // 입력 검증
    if (!content || !category_id) {
      return NextResponse.json(
        { error: "질문 내용과 카테고리는 필수입니다" },
        { status: 400 }
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
      `
      )
      .single();

    if (error) {
      throw new Error("질문 생성 실패");
    }

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "질문 생성에 실패했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
