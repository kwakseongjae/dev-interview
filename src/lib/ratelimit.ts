import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Rate Limit 티어 정의
// 알고리즘: Fixed Window (2 cmd/check — 월 250K 체크 가능)
// Analytics: OFF (cmd 절약, 사용량 추적은 Supabase api_usage_daily로 별도)
// ---------------------------------------------------------------------------

export type RateLimitTier =
  | "ai-auth" // Claude API — 인증 사용자 (userId)
  | "ai-anon" // Claude API — 비회원 (IP)
  | "session-anon" // 세션 생성 — 비회원 (IP)
  | "upload" // 파일 업로드 (userId)
  | "invite" // 초대 코드 검증 (IP)
  | "general"; // 일반 API (IP)

interface TierConfig {
  maxRequests: number;
  window: string;
}

const TIER_CONFIGS: Record<RateLimitTier, TierConfig> = {
  "ai-auth": { maxRequests: 10, window: "60 s" },
  "ai-anon": { maxRequests: 3, window: "86400 s" },
  "session-anon": { maxRequests: 5, window: "86400 s" },
  upload: { maxRequests: 10, window: "86400 s" },
  invite: { maxRequests: 5, window: "60 s" },
  general: { maxRequests: 60, window: "60 s" },
};

// ---------------------------------------------------------------------------
// 인메모리 폴백 (개발환경 — UPSTASH 미설정 시)
// Vercel 서버리스에서는 인스턴스별 독립이라 프로덕션에서 무의미
// ---------------------------------------------------------------------------

interface MemoryEntry {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, MemoryEntry>();

// 5분마다 만료된 엔트리 정리
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore) {
      if (now > entry.resetTime) memoryStore.delete(key);
    }
  }, 300_000);
}

function parseWindowMs(window: string): number {
  const match = window.match(/^(\d+)\s*s$/);
  return match ? parseInt(match[1]) * 1000 : 60_000;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  pending: Promise<unknown>;
}

function memoryRateLimit(
  identifier: string,
  tier: RateLimitTier,
): RateLimitResult {
  const config = TIER_CONFIGS[tier];
  const key = `${tier}:${identifier}`;
  const now = Date.now();
  const windowMs = parseWindowMs(config.window);

  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetTime) {
    memoryStore.set(key, { count: 1, resetTime: now + windowMs });
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      reset: now + windowMs,
      pending: Promise.resolve(),
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      reset: entry.resetTime,
      pending: Promise.resolve(),
    };
  }

  entry.count++;
  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - entry.count,
    reset: entry.resetTime,
    pending: Promise.resolve(),
  };
}

// ---------------------------------------------------------------------------
// Upstash Rate Limiter (프로덕션)
// ---------------------------------------------------------------------------

let upstashLimiters: Map<
  RateLimitTier,
  InstanceType<typeof import("@upstash/ratelimit").Ratelimit>
> | null = null;

async function getUpstashLimiter(tier: RateLimitTier) {
  if (!upstashLimiters) {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");

    const redis = Redis.fromEnv();
    upstashLimiters = new Map();

    for (const [name, config] of Object.entries(TIER_CONFIGS)) {
      upstashLimiters.set(
        name as RateLimitTier,
        new Ratelimit({
          redis,
          limiter: Ratelimit.fixedWindow(
            config.maxRequests,
            config.window as Parameters<typeof Ratelimit.fixedWindow>[1],
          ),
          prefix: `ratelimit:${name}`,
          timeout: 3000, // fail-open: 3초 내 응답 없으면 통과
          ephemeralCache: new Map(), // 이미 차단된 요청은 Redis 호출 없이 로컬 거부
        }),
      );
    }
  }

  return upstashLimiters.get(tier)!;
}

const isUpstashConfigured = () =>
  !!(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Rate Limit 체크
 * @param identifier - userId (인증) 또는 IP (비인증)
 * @param tier - Rate Limit 티어
 * @returns 초과 시 429 Response, 통과 시 null
 */
export async function checkRateLimit(
  identifier: string,
  tier: RateLimitTier,
): Promise<NextResponse | null> {
  try {
    let result: RateLimitResult;

    if (isUpstashConfigured()) {
      const limiter = await getUpstashLimiter(tier);
      result = await limiter.limit(identifier);
    } else {
      // 개발환경 인메모리 폴백
      result = memoryRateLimit(identifier, tier);
    }

    if (!result.success) {
      return NextResponse.json(
        { error: "요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": result.limit.toString(),
            "X-RateLimit-Remaining": result.remaining.toString(),
            "X-RateLimit-Reset": result.reset.toString(),
            "Retry-After": Math.ceil(
              (result.reset - Date.now()) / 1000,
            ).toString(),
          },
        },
      );
    }

    return null; // 통과
  } catch {
    // fail-open: Upstash 에러 시 요청 허용
    console.error("[RateLimit] 체크 실패, fail-open 적용");
    return null;
  }
}

/**
 * Rate Limit 티어 설정 조회 (관리자 대시보드용)
 */
export function getRateLimitConfigs(): Record<RateLimitTier, TierConfig> {
  return { ...TIER_CONFIGS };
}
