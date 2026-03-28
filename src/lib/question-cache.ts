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
 * DB에서 카테고리 기반으로 기존 질문을 검색
 * - userId가 있으면 유저 히스토리 필터링 적용
 * - 가중 랜덤 샘플링으로 매번 다른 조합 반환
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

    // 카테고리명 → ID 매핑
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: catRows } = await (supabaseAdmin as any)
      .from("categories")
      .select("id, name")
      .in("name", categories);

    if (!catRows || catRows.length === 0) {
      return [];
    }

    const categoryIds = catRows.map((c: { id: string }) => c.id);

    // 카테고리 필터 + 풀 확보 (count * 4로 필터링 여유분 확보)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: questions, error } = await (supabaseAdmin as any)
      .from("questions")
      .select("id, content, hint, category_id, favorite_count")
      .in("category_id", categoryIds)
      .order("favorite_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(count * 4);

    if (error) {
      console.error("카테고리 기반 질문 검색 실패:", error);
      return [];
    }

    if (!questions || questions.length === 0) {
      return [];
    }

    // 카테고리명 매핑
    const catMap = new Map<string, string>();
    for (const c of catRows) {
      catMap.set(c.id, c.name);
    }

    // CachedQuestion 형태로 변환
    let pool: CachedQuestion[] = questions.map(
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
        category: catMap.get(q.category_id) || "GENERAL",
        favorite_count: q.favorite_count,
        similarity: 1.0,
      }),
    );

    // 유저 히스토리 필터링 (로그인 유저만)
    if (userId) {
      const { getQuestionHistory } = await import("@/lib/question-history");
      const history = await getQuestionHistory(userId, null, 100);

      if (history.length > 0) {
        const seenContents = new Set(history);
        const filtered = pool.filter((q) => !seenContents.has(q.content));

        console.log("캐시 히스토리 필터:", {
          before: pool.length,
          after: filtered.length,
          filtered: pool.length - filtered.length,
        });

        pool = filtered;
      }
    }

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
