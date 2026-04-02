import { supabaseAdmin } from "./supabase";
import { getKstDateString } from "./timezone";

// ---------------------------------------------------------------------------
// 일일 비용 상한선 (센트 단위)
// ---------------------------------------------------------------------------

const DAILY_BUDGET_CENTS = 500; // $5.00/day

// ---------------------------------------------------------------------------
// 사용량 기록 (fire-and-forget)
// ---------------------------------------------------------------------------

/**
 * API 사용량 기록
 * increment_daily_usage RPC로 upsert
 * 실패해도 원래 요청을 방해하지 않음
 */
export function recordUsage(params: {
  userId: string | null;
  ip: string;
  endpoint: string;
  tokens?: number;
  costCents?: number;
}): void {
  const today = getKstDateString();

  // fire-and-forget
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (supabaseAdmin as any)
    .rpc("increment_daily_usage", {
      p_day: today,
      p_user_id: params.userId,
      p_ip_address: params.ip,
      p_endpoint: params.endpoint,
      p_tokens: params.tokens ?? 0,
      p_cost_cents: params.costCents ?? 0,
    })
    .then(() => {})
    .catch((err: unknown) => {
      console.error("[Usage] 사용량 기록 실패:", err);
    });
}

// ---------------------------------------------------------------------------
// 일일 예산 체크
// ---------------------------------------------------------------------------

interface BudgetCheck {
  allowed: boolean;
  usedCents: number;
  limitCents: number;
  remainingCents: number;
}

/**
 * 일일 전체 비용 상한선 체크
 * Claude API 호출 전 호출하여 비용 폭주 방지
 */
export async function checkDailyBudget(): Promise<BudgetCheck> {
  try {
    const today = getKstDateString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabaseAdmin as any)
      .from("api_usage_daily")
      .select("estimated_cost_cents")
      .eq("day", today);

    const usedCents =
      data?.reduce(
        (sum: number, row: { estimated_cost_cents: number }) =>
          sum + (row.estimated_cost_cents ?? 0),
        0,
      ) ?? 0;

    const remainingCents = Math.max(0, DAILY_BUDGET_CENTS - usedCents);

    return {
      allowed: remainingCents > 0,
      usedCents,
      limitCents: DAILY_BUDGET_CENTS,
      remainingCents,
    };
  } catch (err) {
    console.error("[Usage] 예산 체크 실패, 요청 허용:", err);
    // fail-open: DB 에러 시 요청 허용
    return {
      allowed: true,
      usedCents: 0,
      limitCents: DAILY_BUDGET_CENTS,
      remainingCents: DAILY_BUDGET_CENTS,
    };
  }
}
