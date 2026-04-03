/**
 * Question-Level Semantic Cache
 *
 * 카테고리 기반 검색 + 임베딩 중복 방지 하이브리드
 *
 * 검색 플로우:
 * 1. 사용자 쿼리에서 키워드 → 카테고리 매핑 (API 호출 0회)
 * 2. DB에서 해당 카테고리 질문 조회
 * 3. 충분하면 → 반환 (Claude 호출 없음)
 * 4. 부족하면 → 부족분만 Claude 생성
 *
 * 저장 플로우:
 * 1. 새 질문 임베딩 생성
 * 2. DB 기존 질문과 유사도 0.92 이상이면 중복 → 저장 안 함
 * 3. 유니크한 것만 저장
 */

import { generateEmbeddings } from "./embedding";
import type { GeneratedQuestion } from "./claude";
import { normalizeQuestionContent } from "./question-utils";
import { isNonDevContent } from "./validation";

// 중복 차단 임계값: "같은 질문을 다르게 표현한 것" 저장 방지
const DEDUP_THRESHOLD = 0.92;

// 쿼리 키워드 → 카테고리 매핑
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  FRONTEND: [
    "프론트엔드",
    "프론트",
    "frontend",
    "react",
    "vue",
    "angular",
    "next.js",
    "nextjs",
    "css",
    "html",
    "javascript",
    "typescript",
    "웹",
    "브라우저",
    "dom",
    "렌더링",
    "tailwind",
    "ui",
    "ux",
  ],
  BACKEND: [
    "백엔드",
    "backend",
    "서버",
    "server",
    "api",
    "rest",
    "graphql",
    "node",
    "spring",
    "django",
    "express",
    "nest",
    "fastapi",
    "마이크로서비스",
  ],
  DATABASE: [
    "데이터베이스",
    "database",
    "db",
    "sql",
    "nosql",
    "mysql",
    "postgresql",
    "postgres",
    "mongodb",
    "redis",
    "인덱스",
    "쿼리",
    "트랜잭션",
    "orm",
  ],
  CS: [
    "cs",
    "자료구조",
    "알고리즘",
    "운영체제",
    "네트워크",
    "컴퓨터",
    "os",
    "tcp",
    "http",
    "프로세스",
    "스레드",
    "메모리",
    "정렬",
    "탐색",
    "동적",
    "그래프",
    "스택",
    "큐",
    "해시",
  ],
  DEVOPS: [
    "devops",
    "데브옵스",
    "ci/cd",
    "docker",
    "kubernetes",
    "k8s",
    "aws",
    "gcp",
    "azure",
    "클라우드",
    "배포",
    "인프라",
    "terraform",
  ],
  "AI/ML": [
    "ai",
    "ml",
    "llm",
    "머신러닝",
    "딥러닝",
    "인공지능",
    "rag",
    "gpt",
    "claude",
    "transformer",
    "임베딩",
    "벡터",
    "프롬프트",
    "에이전트",
    "파인튜닝",
  ],
  ARCHITECTURE: [
    "아키텍처",
    "architecture",
    "설계",
    "디자인패턴",
    "design pattern",
    "클린",
    "solid",
    "ddd",
    "헥사고날",
    "이벤트 드리븐",
  ],
  SYSTEM_DESIGN: [
    "시스템 설계",
    "system design",
    "대용량",
    "트래픽",
    "확장",
    "분산",
    "캐싱",
    "로드밸런싱",
    "샤딩",
    "파티셔닝",
  ],
  NETWORK: [
    "네트워크",
    "network",
    "tcp/ip",
    "http",
    "https",
    "dns",
    "로드밸런서",
    "cdn",
    "websocket",
    "프로토콜",
  ],
  SECURITY: [
    "보안",
    "security",
    "인증",
    "oauth",
    "jwt",
    "xss",
    "csrf",
    "암호화",
    "ssl",
    "tls",
  ],
  MOBILE: [
    "모바일",
    "mobile",
    "ios",
    "android",
    "react native",
    "flutter",
    "swift",
    "kotlin",
    "앱",
  ],
};

// 인접 카테고리 매핑 (Tier 2 확장 검색용)
const ADJACENT_CATEGORIES: Record<string, string[]> = {
  FRONTEND: ["CS", "ARCHITECTURE", "NETWORK"],
  BACKEND: ["DATABASE", "SYSTEM_DESIGN", "DEVOPS", "CS"],
  DATABASE: ["BACKEND", "SYSTEM_DESIGN"],
  CS: ["NETWORK", "ARCHITECTURE", "SECURITY"],
  DEVOPS: ["BACKEND", "SECURITY", "NETWORK"],
  "AI/ML": ["CS", "ARCHITECTURE", "BACKEND"],
  ARCHITECTURE: ["CS", "SYSTEM_DESIGN", "BACKEND"],
  SYSTEM_DESIGN: ["ARCHITECTURE", "BACKEND", "DATABASE", "DEVOPS"],
  NETWORK: ["CS", "SECURITY", "DEVOPS"],
  SECURITY: ["NETWORK", "CS", "BACKEND"],
  MOBILE: ["FRONTEND", "CS", "NETWORK"],
};

export interface CachedQuestion {
  id: string;
  content: string;
  hint: string | null;
  category: string;
  favorite_count: number;
  similarity: number;
}

// ─── 가중 랜덤 샘플링 유틸리티 ───────────────────────────

/** Fisher-Yates shuffle — O(n), uniform distribution */
function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** favorite_count → 가중치 (log-dampened, 최소 1.0) */
function favoriteCountToWeight(favoriteCount: number): number {
  return 1.0 + Math.log1p(favoriteCount);
}

/**
 * 가중 랜덤 샘플링 (비복원추출)
 * - 누적 가중치 + swap-remove 방식
 * - 모든 항목에 최소 0.1 가중치 보장
 */
function weightedSampleWithoutReplacement<T>(
  items: T[],
  getWeight: (item: T) => number,
  count: number,
): T[] {
  if (items.length === 0 || count <= 0) return [];
  if (count >= items.length) return shuffle(items);

  const pool = items.map((item) => ({
    item,
    weight: Math.max(getWeight(item), 0.1),
  }));

  const selected: T[] = [];

  for (let i = 0; i < count; i++) {
    let totalWeight = 0;
    for (const entry of pool) {
      totalWeight += entry.weight;
    }

    let random = Math.random() * totalWeight;
    let selectedIndex = 0;
    for (let j = 0; j < pool.length; j++) {
      random -= pool[j].weight;
      if (random <= 0) {
        selectedIndex = j;
        break;
      }
    }

    selected.push(pool[selectedIndex].item);
    pool[selectedIndex] = pool[pool.length - 1];
    pool.pop();
  }

  return selected;
}

/**
 * 쿼리에서 카테고리를 추출 (키워드 매칭, API 호출 없음)
 */
export function extractCategoriesFromQuery(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const matched: Array<{ category: string; matchCount: number }> = [];

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matchCount = keywords.filter((kw) => lowerQuery.includes(kw)).length;
    if (matchCount > 0) {
      matched.push({ category, matchCount });
    }
  }

  // 매칭 수 기준 정렬, 상위 카테고리 반환
  matched.sort((a, b) => b.matchCount - a.matchCount);
  return matched.map((m) => m.category);
}

/**
 * DB에서 카테고리 기반으로 기존 질문을 검색 (Tiered Fallback)
 *
 * Tier 1: 1차 카테고리 (동적 풀 크기) + 비기술 필터 + 히스토리 필터
 * Tier 2: 인접 카테고리 확장 (부족 시)
 * Tier 3: 오래된 질문 재활용 (14일+ 전에 본 질문)
 */
export async function searchCachedQuestions(
  query: string,
  count: number,
  userId?: string,
): Promise<CachedQuestion[]> {
  try {
    const categories = extractCategoriesFromQuery(query);

    if (categories.length === 0) {
      return [];
    }

    const { supabaseAdmin } = await import("@/lib/supabase");

    // 카테고리명 → ID 매핑 (모든 카테고리 조회 — 인접 확장에도 사용)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allCatRows } = await (supabaseAdmin as any)
      .from("categories")
      .select("id, name");

    if (!allCatRows || allCatRows.length === 0) {
      return [];
    }

    const catNameToId = new Map<string, string>();
    const catIdToName = new Map<string, string>();
    for (const c of allCatRows) {
      catNameToId.set(c.name, c.id);
      catIdToName.set(c.id, c.name);
    }

    const primaryCategoryIds = categories
      .map((name) => catNameToId.get(name))
      .filter((id): id is string => !!id);

    if (primaryCategoryIds.length === 0) {
      return [];
    }

    // 히스토리 사전 조회 (동적 풀 크기 계산 + 필터링 겸용)
    let seenContents = new Set<string>();
    let staleContents = new Set<string>();
    let historySize = 0;

    if (userId) {
      const {
        getQuestionHistory,
        getQuestionHistoryCount,
        getStaleQuestionHistory,
      } = await import("@/lib/question-history");

      // 병렬 조회: 히스토리 카운트 + 히스토리 내용 + 오래된 히스토리
      const [countResult, historyResult, staleResult] = await Promise.all([
        getQuestionHistoryCount(userId),
        getQuestionHistory(userId, null, 200),
        getStaleQuestionHistory(userId, 14),
      ]);

      historySize = countResult;
      seenContents = new Set(historyResult);
      staleContents = staleResult;
    }

    // 동적 풀 크기: 히스토리가 많을수록 더 많은 후보 확보
    const baseMultiplier = 4;
    const historyBuffer = userId ? Math.ceil(historySize / count) : 0;
    const dynamicMultiplier = Math.max(
      baseMultiplier,
      historyBuffer + baseMultiplier,
    );
    const poolLimit = Math.min(count * dynamicMultiplier, 200);

    // DB 질문 조회 헬퍼
    const fetchQuestions = async (
      categoryIds: string[],
      limit: number,
    ): Promise<CachedQuestion[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabaseAdmin as any)
        .from("questions")
        .select("id, content, hint, category_id, favorite_count")
        .in("category_id", categoryIds)
        .order("favorite_count", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error || !data) return [];

      return data.map(
        (q: {
          id: string;
          content: string;
          hint: string | null;
          category_id: string;
          favorite_count: number;
        }) => ({
          id: q.id,
          content: q.content,
          hint: q.hint,
          category: catIdToName.get(q.category_id) || "GENERAL",
          favorite_count: q.favorite_count,
          similarity: 1.0,
        }),
      );
    };

    // 비기술 콘텐츠 + 히스토리 필터링 헬퍼
    const filterPool = (
      questions: CachedQuestion[],
    ): { filtered: CachedQuestion[]; nonDevCount: number } => {
      let nonDevCount = 0;
      const filtered = questions.filter((q) => {
        // 비기술 질문 제거
        if (isNonDevContent(q.content)) {
          nonDevCount++;
          return false;
        }
        // 최근 본 질문 제거 (오래된 질문은 제거하지 않음 — Tier 3에서 재활용)
        if (seenContents.has(q.content) && !staleContents.has(q.content)) {
          return false;
        }
        return true;
      });
      return { filtered, nonDevCount };
    };

    // ─── Tier 1: 1차 카테고리 검색 ───────────────────────────
    const tier1Raw = await fetchQuestions(primaryCategoryIds, poolLimit);
    const { filtered: tier1Pool, nonDevCount: tier1NonDev } =
      filterPool(tier1Raw);

    let pool = tier1Pool;
    let tier2Count = 0;
    let tier3Recycled = 0;

    // ─── Tier 2: 인접 카테고리 확장 (부족 시) ─────────────────
    if (pool.length < count) {
      const adjacentCatNames = categories
        .flatMap((c) => ADJACENT_CATEGORIES[c] || [])
        .filter((c) => !categories.includes(c));

      const uniqueAdjacentNames = [...new Set(adjacentCatNames)];
      const adjacentCategoryIds = uniqueAdjacentNames
        .map((name) => catNameToId.get(name))
        .filter((id): id is string => !!id)
        .filter((id) => !primaryCategoryIds.includes(id));

      if (adjacentCategoryIds.length > 0) {
        const needed = (count - pool.length) * 4;
        const tier2Raw = await fetchQuestions(adjacentCategoryIds, needed);
        const { filtered: tier2Pool } = filterPool(tier2Raw);

        // 중복 제거 (Tier 1과 겹치는 질문)
        const existingIds = new Set(pool.map((q) => q.id));
        const newFromTier2 = tier2Pool.filter((q) => !existingIds.has(q.id));

        tier2Count = newFromTier2.length;
        pool = [...pool, ...newFromTier2];
      }
    }

    // ─── Tier 3: 오래된 질문 재활용 (여전히 부족 시) ──────────
    if (pool.length < count && userId && staleContents.size > 0) {
      // Tier 1에서 히스토리로 필터된 질문 중 stale인 것만 재투입
      const existingIds = new Set(pool.map((q) => q.id));
      const recyclable = tier1Raw.filter(
        (q) =>
          !existingIds.has(q.id) &&
          staleContents.has(q.content) &&
          !isNonDevContent(q.content),
      );

      tier3Recycled = Math.min(recyclable.length, count - pool.length);
      pool = [...pool, ...recyclable.slice(0, count - pool.length)];
    }

    console.log("캐시 검색 결과:", {
      query: query.slice(0, 50),
      primaryCategories: categories,
      historySize,
      poolLimit,
      tier1: {
        fetched: tier1Raw.length,
        afterFilter: tier1Pool.length,
        nonDevFiltered: tier1NonDev,
      },
      tier2Expanded: tier2Count,
      tier3Recycled,
      finalPool: pool.length,
      requested: count,
    });

    // 가중 랜덤 샘플링 (favorite_count 기반)
    return weightedSampleWithoutReplacement(
      pool,
      (q) => favoriteCountToWeight(q.favorite_count),
      count,
    );
  } catch (error) {
    console.error("시맨틱 캐시 검색 실패 (fallback to generation):", error);
    return [];
  }
}

export interface StoreQuestionsResult {
  stored: number;
  duplicates: number;
}

/**
 * 새로 생성된 질문을 중복 체크 후 DB에 저장
 * - 각 질문의 임베딩을 생성
 * - DB 기존 질문과 유사도 0.92 이상이면 중복으로 판단 → 저장 안 함
 * - 유니크한 질문만 저장
 */
export async function storeQuestionsWithEmbeddings(
  questions: GeneratedQuestion[],
): Promise<StoreQuestionsResult> {
  try {
    if (questions.length === 0) return { stored: 0, duplicates: 0 };

    const { supabaseAdmin } = await import("@/lib/supabase");

    // 1. 질문 텍스트를 배치 임베딩
    const texts = questions.map((q) => q.content);
    const embeddings = await generateEmbeddings(texts, "document");

    // 2. 카테고리 매핑
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: categories } = await (supabaseAdmin as any)
      .from("categories")
      .select("id, name");

    const categoryMap = new Map<string, string>();
    if (categories) {
      for (const cat of categories) {
        categoryMap.set(cat.name.toUpperCase(), cat.id);
        categoryMap.set(cat.name, cat.id);
      }
    }

    const defaultCategoryId = categories?.[0]?.id;
    if (!defaultCategoryId) {
      console.error("카테고리를 찾을 수 없어 질문 저장을 건너뜁니다.");
      return { stored: 0, duplicates: 0 };
    }

    // 3. 각 질문별 중복 체크 후 유니크한 것만 저장
    const uniqueRows: Array<{
      content: string;
      content_normalized: string;
      hint: string | null;
      category_id: string;
      embedding: number[];
      is_trending: boolean;
      trend_topic: string | null;
      is_verified: boolean;
    }> = [];
    let duplicateCount = 0;

    for (let i = 0; i < questions.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: dupes } = await (supabaseAdmin as any).rpc(
        "check_question_duplicate",
        {
          question_embedding: embeddings[i],
          similarity_threshold: DEDUP_THRESHOLD,
        },
      );

      if (dupes && dupes.length > 0) {
        duplicateCount++;
        continue;
      }

      uniqueRows.push({
        content: questions[i].content,
        content_normalized: normalizeQuestionContent(questions[i].content),
        hint: questions[i].hint || null,
        category_id:
          categoryMap.get(questions[i].category.toUpperCase()) ||
          defaultCategoryId,
        embedding: embeddings[i],
        is_trending: questions[i].isTrending || false,
        trend_topic: questions[i].trendTopic || null,
        is_verified: false,
      });
    }

    if (uniqueRows.length === 0) {
      console.log(`모든 질문이 중복 (${duplicateCount}개 스킵)`);
      return { stored: 0, duplicates: duplicateCount };
    }

    // upsert: content_hash UNIQUE 제약으로 RPC 중복 체크 누락분도 DB 레벨에서 차단
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inserted, error } = await (supabaseAdmin as any)
      .from("questions")
      .upsert(uniqueRows, {
        onConflict: "content_hash",
        ignoreDuplicates: true,
      })
      .select("id");

    if (error) {
      console.error("질문 DB 저장 실패:", error);
      return { stored: 0, duplicates: duplicateCount };
    }

    const storedCount = inserted?.length ?? 0;
    const dbDuplicates = uniqueRows.length - storedCount;
    console.log(
      `질문 저장: ${storedCount}개 저장, ${duplicateCount + dbDuplicates}개 중복 스킵 (RPC: ${duplicateCount}, DB: ${dbDuplicates})`,
    );
    return {
      stored: storedCount,
      duplicates: duplicateCount + dbDuplicates,
    };
  } catch (error) {
    console.error("질문 저장 실패 (무시됨):", error);
    return { stored: 0, duplicates: 0 };
  }
}

/**
 * 캐시된 질문을 GeneratedQuestion 형태로 변환
 */
export function mapCachedToGenerated(
  cached: CachedQuestion[],
): GeneratedQuestion[] {
  return cached.map((q) => ({
    content: q.content,
    hint: q.hint || "",
    category: q.category,
    isReferenceBased: false,
    isTrending: false,
  }));
}

export { DEDUP_THRESHOLD };
