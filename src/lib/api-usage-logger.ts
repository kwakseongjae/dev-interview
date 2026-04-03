/**
 * API Usage Logger
 * Tracks token consumption and costs for external API services.
 * Fire-and-forget: logging failures never block the main request.
 */

import { supabaseAdmin } from "./supabase";

interface LogUsageParams {
  service: "claude" | "voyage" | "openai_stt";
  endpoint: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCost?: number;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log API usage to DB (fire-and-forget)
 */
export async function logApiUsage(params: LogUsageParams): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any).from("api_usage_logs").insert({
      service: params.service,
      endpoint: params.endpoint,
      model: params.model ?? null,
      input_tokens: params.inputTokens ?? 0,
      output_tokens: params.outputTokens ?? 0,
      total_tokens: params.totalTokens ?? 0,
      estimated_cost: params.estimatedCost ?? 0,
      user_id: params.userId ?? null,
      session_id: params.sessionId ?? null,
      metadata: params.metadata ?? {},
    });
  } catch (err) {
    console.error("API usage logging failed:", err);
  }
}

// ---- Cost estimation helpers ----

// Claude Sonnet 4.6 pricing: $3/MTok input, $15/MTok output
const CLAUDE_INPUT_COST_PER_TOKEN = 3 / 1_000_000;
const CLAUDE_OUTPUT_COST_PER_TOKEN = 15 / 1_000_000;

export function estimateClaudeCost(
  inputTokens: number,
  outputTokens: number,
): number {
  return (
    inputTokens * CLAUDE_INPUT_COST_PER_TOKEN +
    outputTokens * CLAUDE_OUTPUT_COST_PER_TOKEN
  );
}

// Voyage 3.5 pricing: $0.06/MTok
const VOYAGE_COST_PER_TOKEN = 0.06 / 1_000_000;

export function estimateVoyageCost(totalTokens: number): number {
  return totalTokens * VOYAGE_COST_PER_TOKEN;
}

// ---- Daily usage limit ----

/** Max Claude API calls per user per day (non-admin) */
const DAILY_CLAUDE_CALL_LIMIT = 50;

/**
 * Check if a user has exceeded their daily Claude API call limit.
 * Returns { allowed, remaining, limit }.
 * Fail-open: if DB check fails, allow the request.
 */
export async function checkDailyClaudeLimit(
  userId: string,
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabaseAdmin as any)
      .from("api_usage_logs")
      .select("*", { count: "exact", head: true })
      .eq("service", "claude")
      .eq("user_id", userId)
      .gte("created_at", todayStart.toISOString());

    const used = count ?? 0;
    const remaining = Math.max(0, DAILY_CLAUDE_CALL_LIMIT - used);

    return {
      allowed: used < DAILY_CLAUDE_CALL_LIMIT,
      remaining,
      limit: DAILY_CLAUDE_CALL_LIMIT,
    };
  } catch {
    // Fail-open
    return {
      allowed: true,
      remaining: DAILY_CLAUDE_CALL_LIMIT,
      limit: DAILY_CLAUDE_CALL_LIMIT,
    };
  }
}
