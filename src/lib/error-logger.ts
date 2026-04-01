/**
 * API Error Logger
 * 에러를 api_error_logs 테이블에 기록하여 관리자 대시보드에서 모니터링
 */

import { supabaseAdmin } from "./supabase";

type ErrorType =
  | "api_error"
  | "token_limit"
  | "rate_limit"
  | "timeout"
  | "embedding_error"
  | "unknown";

interface LogErrorParams {
  errorType: ErrorType;
  errorMessage: string;
  errorCode?: string;
  endpoint?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * API 에러를 DB에 기록 (fire-and-forget)
 * 로깅 실패가 원래 요청을 방해하지 않도록 에러를 삼킴
 */
export async function logApiError(params: LogErrorParams): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any).from("api_error_logs").insert({
      error_type: params.errorType,
      error_message: params.errorMessage.slice(0, 2000),
      error_code: params.errorCode ?? null,
      endpoint: params.endpoint ?? null,
      user_id: params.userId ?? null,
      session_id: params.sessionId ?? null,
      metadata: params.metadata ?? {},
    });
  } catch (err) {
    console.error("에러 로깅 실패:", err);
  }
}

/**
 * Anthropic API 에러를 분류하고 로깅
 */
export function classifyAndLogApiError(
  error: unknown,
  context: {
    endpoint: string;
    userId?: string;
    sessionId?: string;
    model?: string;
  },
): void {
  const message = error instanceof Error ? error.message : String(error);
  const errorStr = String(error);

  let errorType: ErrorType = "unknown";
  let errorCode: string | undefined;

  if (
    errorStr.includes("credit") ||
    errorStr.includes("billing") ||
    errorStr.includes("insufficient") ||
    errorStr.includes("payment")
  ) {
    errorType = "token_limit";
    errorCode = "insufficient_credits";
  } else if (
    errorStr.includes("rate_limit") ||
    errorStr.includes("429") ||
    errorStr.includes("too many")
  ) {
    errorType = "rate_limit";
    errorCode = "429";
  } else if (
    errorStr.includes("timeout") ||
    errorStr.includes("ETIMEDOUT") ||
    errorStr.includes("ECONNABORTED")
  ) {
    errorType = "timeout";
    errorCode = "timeout";
  } else if (
    errorStr.includes("embedding") ||
    errorStr.includes("voyage") ||
    errorStr.includes("vector")
  ) {
    errorType = "embedding_error";
  } else {
    errorType = "api_error";
    // HTTP status code 추출 시도
    const statusMatch = errorStr.match(/\b(4\d{2}|5\d{2})\b/);
    if (statusMatch) errorCode = statusMatch[1];
  }

  logApiError({
    errorType,
    errorMessage: message,
    errorCode,
    endpoint: context.endpoint,
    userId: context.userId,
    sessionId: context.sessionId,
    metadata: {
      model: context.model,
      timestamp: new Date().toISOString(),
    },
  });
}
