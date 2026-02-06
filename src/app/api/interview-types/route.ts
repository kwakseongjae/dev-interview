import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/interview-types - 면접 범주 목록 조회
export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: interviewTypes, error } = await (supabaseAdmin as any)
      .from("interview_types")
      .select("*")
      .eq("is_selectable", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("면접 범주 조회 실패:", error);
      return NextResponse.json(
        { error: "면접 범주를 불러올 수 없습니다" },
        { status: 500 },
      );
    }

    // snake_case → camelCase 변환
    const formattedTypes = interviewTypes.map(
      (type: {
        id: string;
        code: string;
        name: string;
        display_name: string;
        description: string | null;
        icon: string | null;
        color: string | null;
        sort_order: number;
        created_at: string;
      }) => ({
        id: type.id,
        code: type.code,
        name: type.name,
        displayName: type.display_name,
        description: type.description,
        icon: type.icon,
        color: type.color,
        sortOrder: type.sort_order,
      }),
    );

    return NextResponse.json({ interviewTypes: formattedTypes });
  } catch (error) {
    console.error("면접 범주 조회 실패:", error);
    return NextResponse.json(
      { error: "면접 범주를 불러올 수 없습니다" },
      { status: 500 },
    );
  }
}
