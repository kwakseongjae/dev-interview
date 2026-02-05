import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { Database } from "@/types/database";

type Category = Database["public"]["Tables"]["categories"]["Row"];
type Subcategory = Database["public"]["Tables"]["subcategories"]["Row"];

// GET /api/categories - 카테고리 목록 조회 (소분류 포함)
export async function GET() {
  try {
    // 대분류 조회
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: categories, error: catError } = (await (supabaseAdmin as any)
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true })) as {
      data: Category[] | null;
      error: Error | null;
    };

    if (catError) {
      throw new Error("카테고리 조회 실패");
    }

    // 소분류 조회
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: subcategories, error: subError } = (await (
      supabaseAdmin as any
    )
      .from("subcategories")
      .select("*")
      .order("sort_order", { ascending: true })) as {
      data: Subcategory[] | null;
      error: Error | null;
    };

    if (subError) {
      throw new Error("소분류 조회 실패");
    }

    // 대분류별로 소분류 그룹화
    const categoriesWithSubs = categories?.map((category: Category) => ({
      ...category,
      subcategories:
        subcategories?.filter(
          (sub: Subcategory) => sub.category_id === category.id,
        ) || [],
    }));

    return NextResponse.json({ categories: categoriesWithSubs || [] });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "카테고리 조회에 실패했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
