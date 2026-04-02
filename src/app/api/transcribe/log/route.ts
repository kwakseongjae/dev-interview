// Applied rules: async-parallel, js-early-exit

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";
import { calculateSttCost } from "@/lib/stt/openai-realtime";

interface LogRequestBody {
  sessionId?: string;
  questionId?: string;
  durationSeconds: number;
}

/**
 * POST /api/transcribe/log
 *
 * Logs STT usage after transcription completes.
 * Calculates cost and inserts into stt_usage_logs table.
 *
 * Body: { sessionId?: string, questionId?: string, durationSeconds: number }
 * Response: { success: true, cost: number }
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const body = (await request.json()) as LogRequestBody;
    const { sessionId, questionId, durationSeconds } = body;

    // Validate duration
    if (
      typeof durationSeconds !== "number" ||
      durationSeconds <= 0 ||
      durationSeconds > 600
    ) {
      return NextResponse.json(
        { error: "유효하지 않은 녹음 시간입니다" },
        { status: 400 },
      );
    }

    const cost = calculateSttCost(durationSeconds);

    // Insert usage log
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabaseAdmin as any)
      .from("stt_usage_logs")
      .insert({
        user_id: user.id,
        session_id: sessionId || null,
        question_id: questionId || null,
        duration_seconds: Math.round(durationSeconds),
        cost_usd: cost,
      });

    if (insertError) {
      console.error("STT usage log insert failed:", insertError);
      // Don't fail the request — logging is non-critical
      return NextResponse.json({ success: true, cost, logged: false });
    }

    return NextResponse.json({ success: true, cost, logged: true });
  } catch (error) {
    console.error("STT usage logging failed:", error);
    // Logging failure should not block the user
    return NextResponse.json({ success: true, cost: 0, logged: false });
  }
}
