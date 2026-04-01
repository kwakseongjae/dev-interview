import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    // 관리자 인증
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: dbUser } = await supabaseAdmin
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!dbUser?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30d";

    let periodDate: string | null = null;
    if (period !== "all") {
      const days = period === "7d" ? 7 : 30;
      const date = new Date();
      date.setDate(date.getDate() - days);
      periodDate = date.toISOString();
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;

    // 병렬 쿼리: 토큰 사용량 데이터
    const [
      allFeedbackResult,
      todayFeedbackResult,
      weekFeedbackResult,
      monthFeedbackResult,
      recentErrorsResult,
    ] = await Promise.all([
      // 전체 기간 피드백 (토큰 데이터 포함)
      (() => {
        let q = admin
          .from("answer_feedback")
          .select(
            "pre_gen_tokens, detail_tokens, model_answer_tokens, pre_gen_model, detail_model, model_answer_model, created_at, detail_generated_at, model_answer_generated_at",
          )
          .order("created_at", { ascending: true });
        if (periodDate) q = q.gte("created_at", periodDate);
        return q;
      })(),

      // 오늘 토큰 합계
      admin
        .from("answer_feedback")
        .select("pre_gen_tokens, detail_tokens, model_answer_tokens")
        .gte("created_at", today.toISOString()),

      // 이번 주 토큰 합계
      admin
        .from("answer_feedback")
        .select("pre_gen_tokens, detail_tokens, model_answer_tokens")
        .gte("created_at", weekAgo.toISOString()),

      // 이번 달 토큰 합계
      admin
        .from("answer_feedback")
        .select("pre_gen_tokens, detail_tokens, model_answer_tokens")
        .gte("created_at", monthAgo.toISOString()),

      // 최근 토큰 관련 에러
      admin
        .from("api_error_logs")
        .select("*")
        .in("error_type", ["token_limit", "rate_limit"])
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    type FeedbackTokenRow = {
      pre_gen_tokens: number | null;
      detail_tokens: number | null;
      model_answer_tokens: number | null;
    };

    // 토큰 합산 함수
    function sumTokens(rows: FeedbackTokenRow[]): number {
      return rows.reduce(
        (sum, r) =>
          sum +
          (r.pre_gen_tokens ?? 0) +
          (r.detail_tokens ?? 0) +
          (r.model_answer_tokens ?? 0),
        0,
      );
    }

    // 기능별 토큰 분석
    type FeedbackRow = FeedbackTokenRow & {
      pre_gen_model: string | null;
      detail_model: string | null;
      model_answer_model: string | null;
      created_at: string;
      detail_generated_at: string | null;
      model_answer_generated_at: string | null;
    };

    const allData = (allFeedbackResult.data ?? []) as FeedbackRow[];

    const featureBreakdown = {
      quick_feedback: allData.reduce(
        (sum, r) => sum + (r.pre_gen_tokens ?? 0),
        0,
      ),
      detailed_feedback: allData.reduce(
        (sum, r) => sum + (r.detail_tokens ?? 0),
        0,
      ),
      model_answer: allData.reduce(
        (sum, r) => sum + (r.model_answer_tokens ?? 0),
        0,
      ),
    };

    // 모델별 토큰 분석
    const modelMap = new Map<string, number>();
    for (const row of allData) {
      if (row.pre_gen_model && row.pre_gen_tokens) {
        modelMap.set(
          row.pre_gen_model,
          (modelMap.get(row.pre_gen_model) ?? 0) + row.pre_gen_tokens,
        );
      }
      if (row.detail_model && row.detail_tokens) {
        modelMap.set(
          row.detail_model,
          (modelMap.get(row.detail_model) ?? 0) + row.detail_tokens,
        );
      }
      if (row.model_answer_model && row.model_answer_tokens) {
        modelMap.set(
          row.model_answer_model,
          (modelMap.get(row.model_answer_model) ?? 0) + row.model_answer_tokens,
        );
      }
    }
    const modelBreakdown = Array.from(modelMap.entries())
      .map(([model, tokens]) => ({ model, tokens }))
      .sort((a, b) => b.tokens - a.tokens);

    // 일별 토큰 사용 추이
    const dailyMap = new Map<string, number>();
    for (const row of allData) {
      const date = new Date(row.created_at).toISOString().split("T")[0];
      const tokens =
        (row.pre_gen_tokens ?? 0) +
        (row.detail_tokens ?? 0) +
        (row.model_answer_tokens ?? 0);
      dailyMap.set(date, (dailyMap.get(date) ?? 0) + tokens);
    }
    const dailyTrend = Array.from(dailyMap.entries())
      .map(([date, tokens]) => ({ date, tokens }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 일 평균 토큰 계산 (경고 임계치용)
    const totalDays = dailyTrend.length || 1;
    const totalTokens = sumTokens(allData);
    const dailyAverage = Math.round(totalTokens / totalDays);

    // 오늘 사용량이 일 평균의 200% 이상이면 경고
    const todayTokens = sumTokens(
      (todayFeedbackResult.data ?? []) as FeedbackTokenRow[],
    );
    const isHighUsage = dailyAverage > 0 && todayTokens > dailyAverage * 2;

    // 최근 토큰 관련 에러 여부
    const hasRecentTokenErrors = (recentErrorsResult.data ?? []).length > 0;

    return NextResponse.json({
      summary: {
        today: todayTokens,
        this_week: sumTokens(
          (weekFeedbackResult.data ?? []) as FeedbackTokenRow[],
        ),
        this_month: sumTokens(
          (monthFeedbackResult.data ?? []) as FeedbackTokenRow[],
        ),
        total: totalTokens,
        daily_average: dailyAverage,
      },
      daily_trend: dailyTrend,
      feature_breakdown: featureBreakdown,
      model_breakdown: modelBreakdown,
      alert: {
        is_high_usage: isHighUsage,
        has_token_errors: hasRecentTokenErrors,
        recent_token_errors: recentErrorsResult.data ?? [],
        message: hasRecentTokenErrors
          ? "최근 API 토큰/크레딧 관련 에러가 발생했습니다. 크레딧 잔액을 확인해주세요."
          : isHighUsage
            ? "오늘 토큰 사용량이 일 평균의 2배를 초과했습니다."
            : null,
      },
    });
  } catch (error) {
    console.error("토큰 사용량 조회 실패:", error);
    return NextResponse.json(
      { error: "토큰 사용량을 불러올 수 없습니다" },
      { status: 500 },
    );
  }
}
