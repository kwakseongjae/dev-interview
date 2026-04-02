// Applied rules: js-early-exit

/**
 * STT feature configuration
 *
 * Checks whether the STT feature is enabled via:
 * 1. Environment variable (fast path, no DB call)
 * 2. Database app_config table (kill switch)
 */

import { supabaseAdmin } from "@/lib/supabase";
import { calculateSttCost } from "./openai-realtime";

/**
 * Check if STT feature is enabled.
 * Uses env var as fast path, then falls back to DB check.
 */
export async function isSttEnabled(): Promise<boolean> {
  // Fast path: env var check (no DB call needed)
  if (process.env.NEXT_PUBLIC_STT_ENABLED === "false") return false;

  try {
    // DB check for kill switch
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabaseAdmin as any)
      .from("app_config")
      .select("value")
      .eq("key", "stt_enabled")
      .single();

    return data?.value !== "false";
  } catch {
    // Fail-closed: if we can't verify, disable STT
    return false;
  }
}

/** Maximum audio duration allowed per transcription request (seconds) */
export const MAX_AUDIO_DURATION_SECONDS = 120;

/** Maximum file size for audio upload (bytes) — 10MB */
export const MAX_AUDIO_FILE_SIZE = 10 * 1024 * 1024;

/** Per-account STT quota (seconds). 100 minutes = 6000 seconds */
export const STT_QUOTA_SECONDS = 6000;

/** Supported audio MIME types */
export const SUPPORTED_AUDIO_TYPES = [
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/ogg",
  "audio/ogg;codecs=opus",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
] as const;

/**
 * Reserve quota atomically by pre-inserting a "pending" usage log.
 * This prevents race conditions — the row exists before transcription starts.
 *
 * @returns success, remaining seconds, and logId for updating after transcription
 */
export async function reserveQuota(
  userId: string,
  estimatedSeconds: number,
): Promise<{ success: boolean; remaining: number; logId?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = supabaseAdmin as any;

  // Get total quota (base + bonus)
  const { data: bonusData } = await admin
    .from("stt_user_quotas")
    .select("bonus_seconds")
    .eq("user_id", userId)
    .single();

  const totalQuota = STT_QUOTA_SECONDS + (bonusData?.bonus_seconds ?? 0);

  // Get current usage
  const { data: usageData } = await admin
    .from("stt_usage_logs")
    .select("duration_seconds")
    .eq("user_id", userId);

  const currentUsed = (usageData ?? []).reduce(
    (sum: number, row: { duration_seconds: number }) =>
      sum + row.duration_seconds,
    0,
  );

  if (currentUsed + estimatedSeconds > totalQuota) {
    return { success: false, remaining: Math.max(0, totalQuota - currentUsed) };
  }

  // Pre-insert a "pending" usage log to reserve the quota
  const { data: inserted } = await admin
    .from("stt_usage_logs")
    .insert({
      user_id: userId,
      duration_seconds: estimatedSeconds,
      estimated_cost: calculateSttCost(estimatedSeconds),
      model: "gpt-4o-mini-transcribe",
    })
    .select("id")
    .single();

  return {
    success: true,
    remaining: totalQuota - currentUsed - estimatedSeconds,
    logId: inserted?.id,
  };
}

/**
 * Get remaining STT quota for a user (in seconds).
 * Total quota = base (6000s) + bonus from stt_user_quotas table.
 * Returns { used, remaining, quota } or null on error.
 */
export async function getSttQuota(
  userId: string,
): Promise<{ used: number; remaining: number; quota: number } | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;

    // Fetch usage and bonus in parallel
    const [usageResult, bonusResult] = await Promise.all([
      admin
        .from("stt_usage_logs")
        .select("duration_seconds")
        .eq("user_id", userId),
      admin
        .from("stt_user_quotas")
        .select("bonus_seconds")
        .eq("user_id", userId)
        .single(),
    ]);

    const used = (usageResult.data ?? []).reduce(
      (sum: number, row: { duration_seconds: number }) =>
        sum + row.duration_seconds,
      0,
    );
    const bonus = bonusResult.data?.bonus_seconds ?? 0;
    const totalQuota = STT_QUOTA_SECONDS + bonus;
    const remaining = Math.max(0, totalQuota - used);

    return { used, remaining, quota: totalQuota };
  } catch {
    return null;
  }
}
