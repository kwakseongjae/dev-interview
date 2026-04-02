// Applied rules: async-parallel, js-early-exit

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";
import { transcribeAudio } from "@/lib/stt/openai-realtime";
import { correctTechTerms } from "@/lib/stt/tech-dictionary";
import {
  isSttEnabled,
  reserveQuota,
  MAX_AUDIO_FILE_SIZE,
  MAX_AUDIO_DURATION_SECONDS,
  SUPPORTED_AUDIO_TYPES,
} from "@/lib/stt/config";

// Simple in-memory rate limiter (per user, max 5 requests per minute)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60_000; // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * POST /api/transcribe
 *
 * Accepts audio blob via FormData, transcribes using OpenAI,
 * applies tech dictionary corrections, and returns the result.
 *
 * Flow:
 * 1. Rate limit check
 * 2. Auth check
 * 3. STT enabled check (fail-closed)
 * 4. Content-Length check
 * 5. Quota reservation (atomic, fail-closed)
 * 6. MIME type validation
 * 7. Transcribe with timeout
 * 8. Log usage server-side
 * 9. Return result
 *
 * FormData fields:
 * - audio: Blob (required) — audio file to transcribe
 * - sessionId: string (optional) — interview session ID
 * - questionId: string (optional) — question ID
 *
 * Response: { text: string, correctedText: string }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Auth check and STT enabled check in parallel
    const [supabase, sttEnabled] = await Promise.all([
      createClient(),
      isSttEnabled(),
    ]);

    // 3. STT enabled check (fail-closed)
    if (!sttEnabled) {
      return NextResponse.json(
        { error: "STT 기능이 비활성화되어 있습니다" },
        { status: 503 },
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 2. Auth check
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // 1. Rate limit check
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 },
      );
    }

    // 4. Content-Length check before parsing FormData
    const contentLength = parseInt(
      request.headers.get("content-length") || "0",
    );
    if (contentLength > MAX_AUDIO_FILE_SIZE + 10240) {
      return NextResponse.json(
        { error: "요청이 너무 큽니다" },
        { status: 413 },
      );
    }

    // Parse FormData
    const formData = await request.formData();
    const audioFile = formData.get("audio");

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json(
        { error: "오디오 파일이 필요합니다" },
        { status: 400 },
      );
    }

    // Validate file size
    if (audioFile.size > MAX_AUDIO_FILE_SIZE) {
      return NextResponse.json(
        { error: "오디오 파일이 너무 큽니다 (최대 10MB)" },
        { status: 400 },
      );
    }

    if (audioFile.size === 0) {
      return NextResponse.json(
        { error: "빈 오디오 파일입니다" },
        { status: 400 },
      );
    }

    // 6. MIME type validation
    const audioType = audioFile.type.split(";")[0];
    const isValidType = SUPPORTED_AUDIO_TYPES.some((t) =>
      t.startsWith(audioType),
    );
    if (!isValidType && audioType !== "") {
      return NextResponse.json(
        { error: "지원하지 않는 오디오 형식입니다" },
        { status: 400 },
      );
    }

    // 5. Atomic quota reservation (fail-closed)
    // Prefer client-reported duration (capped), fallback to file size estimate
    const clientDuration = parseInt(
      (formData.get("duration") as string) || "0",
    );
    const estimatedDuration =
      clientDuration > 0
        ? Math.min(clientDuration, MAX_AUDIO_DURATION_SECONDS)
        : Math.max(1, Math.round(audioFile.size / 16000));

    let reservation: {
      success: boolean;
      remaining: number;
      logId?: string;
    };
    try {
      reservation = await reserveQuota(user.id, estimatedDuration);
    } catch {
      return NextResponse.json(
        { error: "쿼터 확인에 실패했습니다. 잠시 후 다시 시도해주세요." },
        { status: 503 },
      );
    }

    if (!reservation.success) {
      return NextResponse.json(
        {
          error:
            "음성 입력 사용량을 모두 소진했습니다. 문의하기를 통해 충전을 요청해주세요.",
          code: "QUOTA_EXCEEDED",
          quota: {
            remaining: reservation.remaining,
          },
        },
        { status: 429 },
      );
    }

    // 7. Transcribe audio via OpenAI (with 30s timeout)
    let transcriptionResult: { text: string };
    try {
      transcriptionResult = await transcribeAudio(audioFile);
    } catch (error) {
      // Transcription failed — remove the pre-inserted reservation log
      if (reservation.logId) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabaseAdmin as any)
            .from("stt_usage_logs")
            .delete()
            .eq("id", reservation.logId);
        } catch (deleteError) {
          console.error(
            "Failed to rollback quota reservation:",
            reservation.logId,
            deleteError,
          );
        }
      }
      throw error;
    }

    // 8. Update the pre-inserted log with actual duration if needed
    // (The reservation already logged estimated duration; for REST API
    // we keep the estimate since actual duration isn't returned by OpenAI)

    // Apply tech dictionary corrections
    const correctedText = correctTechTerms(transcriptionResult.text);

    return NextResponse.json({
      text: transcriptionResult.text,
      correctedText,
    });
  } catch (error) {
    console.error("Transcription failed:", error);

    const message =
      error instanceof Error ? error.message : "음성 인식에 실패했습니다";

    // Check for OpenAI-specific errors
    if (message.includes("OpenAI transcription failed")) {
      return NextResponse.json(
        { error: "음성 인식 서비스 오류가 발생했습니다" },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: "음성 인식에 실패했습니다" },
      { status: 500 },
    );
  }
}
