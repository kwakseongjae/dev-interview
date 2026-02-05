/**
 * 간단한 메모리 캐시 유틸리티
 * 페이지 간 이동 시 API 요청을 캐싱하여 불필요한 요청을 방지
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private defaultTTL = 30 * 1000; // 30초

  /**
   * 캐시에 데이터 저장
   */
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  /**
   * 캐시에서 데이터 조회
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      return null;
    }

    // TTL 확인
    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * 특정 키의 캐시 삭제
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 특정 패턴의 캐시 삭제
   */
  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 모든 캐시 삭제
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 만료된 캐시 정리
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// 싱글톤 인스턴스
export const cache = new SimpleCache();

// 주기적으로 만료된 캐시 정리 (5분마다)
if (typeof window !== "undefined") {
  setInterval(
    () => {
      cache.cleanup();
    },
    5 * 60 * 1000,
  );
}

/**
 * 캐시 키 생성 헬퍼
 */
export function createCacheKey(
  prefix: string,
  params: Record<string, string | number | null | undefined>,
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key] ?? "null"}`)
    .join("&");
  return `${prefix}:${sortedParams}`;
}
