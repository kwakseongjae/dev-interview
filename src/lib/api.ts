/**
 * API Client for DevInterview
 * Handles all API calls with authentication
 */

// 인증 토큰 저장/조회
const TOKEN_KEY = "devinterview_access_token";
const REFRESH_TOKEN_KEY = "devinterview_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

// API 호출 헬퍼
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  return response.json();
}

// ============ Auth API ============

interface AuthResponse {
  user: {
    id: string;
    email: string;
    nickname: string | null;
  };
  accessToken: string;
  refreshToken: string;
}

export async function signUp(
  email: string,
  password: string,
  nickname?: string
): Promise<AuthResponse> {
  const data = await fetchApi<AuthResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, nickname }),
  });
  setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function signIn(
  email: string,
  password: string
): Promise<AuthResponse> {
  const data = await fetchApi<AuthResponse>("/api/auth/signin", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function signOut(): Promise<void> {
  try {
    await fetchApi("/api/auth/signout", { method: "POST" });
  } finally {
    clearTokens();
  }
}

export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const data = await fetchApi<{ accessToken: string; refreshToken: string }>(
      "/api/auth/refresh",
      {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      }
    );
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

// ============ Favorites API ============

export interface ApiFavorite {
  id: string;
  question_id: string;
  content: string;
  hint: string | null;
  category: string;
  subcategory: string | null;
  difficulty: string;
  created_at: string;
}

interface FavoritesResponse {
  favorites: ApiFavorite[];
  total: number;
}

export async function getFavoritesApi(): Promise<FavoritesResponse> {
  return fetchApi<FavoritesResponse>("/api/favorites");
}

export async function addFavoriteApi(questionId: string): Promise<ApiFavorite> {
  const data = await fetchApi<{ favorite: ApiFavorite }>("/api/favorites", {
    method: "POST",
    body: JSON.stringify({ question_id: questionId }),
  });
  return data.favorite;
}

export async function removeFavoriteApi(questionId: string): Promise<void> {
  await fetchApi(`/api/favorites/${questionId}`, {
    method: "DELETE",
  });
}

export async function checkFavoriteApi(questionId: string): Promise<boolean> {
  try {
    const data = await fetchApi<{ is_favorited: boolean }>(
      `/api/favorites/${questionId}`
    );
    return data.is_favorited;
  } catch {
    return false;
  }
}

export async function toggleFavoriteApi(
  questionId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _question: { content: string; hint: string; category: string }
): Promise<boolean> {
  const isFav = await checkFavoriteApi(questionId);
  if (isFav) {
    await removeFavoriteApi(questionId);
    return false;
  } else {
    await addFavoriteApi(questionId);
    return true;
  }
}

// ============ Sessions API ============

export interface ApiSession {
  id: string;
  query: string;
  total_time: number;
  is_completed: boolean;
  question_count: number;
  created_at: string;
}

export interface ApiSessionDetail {
  id: string;
  query: string;
  total_time: number;
  is_completed: boolean;
  questions: Array<{
    id: string;
    content: string;
    hint: string | null;
    difficulty: string;
    category: { name: string; display_name: string };
    subcategory: { name: string; display_name: string } | null;
    order: number;
    answer: {
      id: string;
      content: string;
      time_spent: number;
      ai_score: number | null;
      ai_feedback: string | null;
      created_at: string;
    } | null;
    is_favorited: boolean;
  }>;
  created_at: string;
}

interface SessionsResponse {
  sessions: ApiSession[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getSessionsApi(
  page: number = 1,
  limit: number = 20
): Promise<SessionsResponse> {
  return fetchApi<SessionsResponse>(`/api/sessions?page=${page}&limit=${limit}`);
}

export async function getSessionByIdApi(id: string): Promise<ApiSessionDetail> {
  return fetchApi<ApiSessionDetail>(`/api/sessions/${id}`);
}

export async function createSessionApi(
  query: string,
  questions: Array<{ content: string; hint: string; category: string }>
): Promise<{ session: { id: string } }> {
  return fetchApi("/api/sessions", {
    method: "POST",
    body: JSON.stringify({ query, questions }),
  });
}

export async function completeSessionApi(
  sessionId: string,
  totalTime: number
): Promise<void> {
  await fetchApi(`/api/sessions/${sessionId}/complete`, {
    method: "PATCH",
    body: JSON.stringify({ total_time: totalTime }),
  });
}

export async function deleteSessionApi(id: string): Promise<void> {
  await fetchApi(`/api/sessions/${id}`, {
    method: "DELETE",
  });
}

// ============ Answers API ============

export interface ApiAnswer {
  id: string;
  content: string;
  time_spent: number;
  ai_score: number | null;
  ai_feedback: string | null;
  created_at: string;
}

export async function submitAnswerApi(
  sessionId: string,
  questionId: string,
  content: string,
  timeSpent: number
): Promise<ApiAnswer> {
  const data = await fetchApi<{ answer: ApiAnswer }>("/api/answers", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      question_id: questionId,
      content,
      time_spent: timeSpent,
    }),
  });
  return data.answer;
}

export async function scoreAnswerApi(answerId: string): Promise<{
  score: number;
  feedback: string;
}> {
  return fetchApi(`/api/answers/${answerId}/score`, {
    method: "POST",
  });
}

// ============ Questions API ============

export interface GeneratedQuestion {
  content: string;
  hint: string;
  category: string;
  subcategory?: string;
}

export async function generateQuestionsApi(
  query: string,
  excludeQuestions: string[] = [],
  count: number = 5
): Promise<GeneratedQuestion[]> {
  const data = await fetchApi<{ questions: GeneratedQuestion[] }>(
    "/api/questions/generate",
    {
      method: "POST",
      body: JSON.stringify({
        query,
        exclude_questions: excludeQuestions,
        count,
      }),
    }
  );
  return data.questions;
}

export async function replaceQuestionsApi(
  query: string,
  questionsToReplace: string[],
  keepQuestions: Array<{ content: string }>
): Promise<GeneratedQuestion[]> {
  const data = await fetchApi<{ new_questions: GeneratedQuestion[] }>(
    "/api/questions/replace",
    {
      method: "POST",
      body: JSON.stringify({
        query,
        questions_to_replace: questionsToReplace,
        keep_questions: keepQuestions,
      }),
    }
  );
  return data.new_questions;
}

// ============ User Info ============

interface UserInfo {
  id: string;
  email: string;
  nickname: string | null;
}

let cachedUser: UserInfo | null = null;

export function getCachedUser(): UserInfo | null {
  return cachedUser;
}

export function setCachedUser(user: UserInfo | null): void {
  cachedUser = user;
}

export async function getCurrentUser(): Promise<UserInfo | null> {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const data = await fetchApi<{ user: UserInfo }>("/api/auth/me");
    cachedUser = data.user;
    return data.user;
  } catch {
    // 토큰 갱신 시도
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      try {
        const data = await fetchApi<{ user: UserInfo }>("/api/auth/me");
        cachedUser = data.user;
        return data.user;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function isLoggedIn(): boolean {
  return !!getAccessToken();
}
