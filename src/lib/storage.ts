/**
 * LocalStorage utility functions
 * Handles all data persistence with type safety
 * Will be replaced with Supabase in Phase 2
 */

import type { InterviewSession, FavoriteQuestion } from '@/types/interview';

const STORAGE_KEYS = {
  SESSIONS: 'devinterview_sessions',
  FAVORITES: 'devinterview_favorites',
  CURRENT_SESSION: 'devinterview_current',
} as const;

// Safe localStorage access (SSR compatible)
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch {
      console.error('localStorage.getItem failed');
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch {
      console.error('localStorage.setItem failed');
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch {
      console.error('localStorage.removeItem failed');
    }
  },
};

// Sessions (면접 기록)
export function getSessions(): InterviewSession[] {
  const data = safeLocalStorage.getItem(STORAGE_KEYS.SESSIONS);
  if (!data) return [];
  try {
    return JSON.parse(data) as InterviewSession[];
  } catch {
    return [];
  }
}

export function saveSession(session: InterviewSession): void {
  const sessions = getSessions();
  const existingIndex = sessions.findIndex((s) => s.id === session.id);

  if (existingIndex >= 0) {
    sessions[existingIndex] = session;
  } else {
    sessions.unshift(session); // 최신 순으로 추가
  }

  safeLocalStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
}

export function getSessionById(id: string): InterviewSession | null {
  const sessions = getSessions();
  return sessions.find((s) => s.id === id) || null;
}

export function deleteSession(id: string): void {
  const sessions = getSessions().filter((s) => s.id !== id);
  safeLocalStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
}

// Current Session (진행 중인 면접)
export function getCurrentSession(): InterviewSession | null {
  const data = safeLocalStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
  if (!data) return null;
  try {
    return JSON.parse(data) as InterviewSession;
  } catch {
    return null;
  }
}

export function setCurrentSession(session: InterviewSession | null): void {
  if (session) {
    safeLocalStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(session));
  } else {
    safeLocalStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
  }
}

// Favorites (찜한 질문)
export function getFavorites(): FavoriteQuestion[] {
  const data = safeLocalStorage.getItem(STORAGE_KEYS.FAVORITES);
  if (!data) return [];
  try {
    return JSON.parse(data) as FavoriteQuestion[];
  } catch {
    return [];
  }
}

export function addFavorite(question: Omit<FavoriteQuestion, 'id' | 'savedAt'>): void {
  const favorites = getFavorites();
  const exists = favorites.some((f) => f.questionId === question.questionId);

  if (!exists) {
    favorites.unshift({
      ...question,
      id: `fav-${Date.now()}`,
      savedAt: new Date().toISOString(),
    });
    safeLocalStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
  }
}

export function removeFavorite(questionId: string): void {
  const favorites = getFavorites().filter((f) => f.questionId !== questionId);
  safeLocalStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
}

export function isFavorite(questionId: string): boolean {
  return getFavorites().some((f) => f.questionId === questionId);
}

export function toggleFavorite(
  questionId: string,
  question: { content: string; hint: string; category: string }
): boolean {
  if (isFavorite(questionId)) {
    removeFavorite(questionId);
    return false;
  } else {
    addFavorite({ questionId, ...question });
    return true;
  }
}

// Clear all data (개발용)
export function clearAllData(): void {
  safeLocalStorage.removeItem(STORAGE_KEYS.SESSIONS);
  safeLocalStorage.removeItem(STORAGE_KEYS.FAVORITES);
  safeLocalStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
}
