"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * 미디어 쿼리 상태를 추적하는 훅
 * useSyncExternalStore를 사용하여 SSR과 클라이언트 간 불일치 방지
 * @param query - CSS 미디어 쿼리 문자열 (예: '(max-width: 767px)')
 * @returns 미디어 쿼리 매칭 여부
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", callback);
      return () => media.removeEventListener("change", callback);
    },
    [query],
  );

  const getSnapshot = useCallback(() => {
    return window.matchMedia(query).matches;
  }, [query]);

  const getServerSnapshot = useCallback(() => {
    // SSR에서는 기본값 false 반환 (모바일 우선 아님)
    return false;
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * 모바일 화면 여부 (768px 미만)
 */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}

/**
 * 태블릿 화면 여부 (768px ~ 1023px)
 */
export function useIsTablet(): boolean {
  return useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
}

/**
 * 데스크톱 화면 여부 (1024px 이상)
 */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}
