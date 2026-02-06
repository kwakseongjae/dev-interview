/**
 * API Client for DevInterview
 * Handles all API calls with authentication
 */

// 인증 토큰 저장/조회
const TOKEN_KEY = "devinterview_access_token";
const REFRESH_TOKEN_KEY = "devinterview_refresh_token";

// 토큰 갱신 중복 방지를 위한 Promise 저장
let refreshPromise: Promise<boolean> | null = null;

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  // 로그인 이벤트 발생 (다른 컴포넌트에서 감지 가능)
  window.dispatchEvent(
    new CustomEvent("authStateChanged", { detail: { isLoggedIn: true } }),
  );
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  // 로그아웃 이벤트 발생 (다른 컴포넌트에서 감지 가능)
  window.dispatchEvent(
    new CustomEvent("authStateChanged", { detail: { isLoggedIn: false } }),
  );
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

// API 호출 헬퍼 (자동 토큰 갱신 포함)
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  retryCount = 0,
): Promise<T> {
  const token = getAccessToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  // 현재 선택된 팀 스페이스 ID를 헤더에 추가
  if (typeof window !== "undefined") {
    const currentTeamSpaceId = localStorage.getItem("currentTeamSpaceId");
    if (currentTeamSpaceId) {
      (headers as Record<string, string>)["X-Current-Team-Space-Id"] =
        currentTeamSpaceId;
    }
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  // 401 에러 발생 시 토큰 갱신 시도 (한 번만)
  if (response.status === 401 && retryCount === 0) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        // 이미 토큰 갱신이 진행 중이면 기다림
        if (!refreshPromise) {
          refreshPromise = (async () => {
            try {
              // 토큰 갱신 API 직접 호출 (순환 참조 방지)
              const refreshResponse = await fetch("/api/auth/refresh", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ refreshToken }),
              });

              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                setTokens(refreshData.accessToken, refreshData.refreshToken);
                return true;
              } else {
                // 토큰 갱신 실패 시 토큰 제거
                clearTokens();
                return false;
              }
            } catch (refreshError) {
              // 토큰 갱신 실패 시 토큰 제거
              clearTokens();
              return false;
            } finally {
              // Promise 완료 후 초기화
              refreshPromise = null;
            }
          })();
        }

        const refreshed = await refreshPromise;
        if (refreshed) {
          // 갱신된 토큰으로 원래 요청 재시도
          return fetchApi<T>(endpoint, options, retryCount + 1);
        }
      } catch (refreshError) {
        // 토큰 갱신 실패는 이미 처리됨
      }
    } else {
      // Refresh token이 없으면 토큰 제거
      clearTokens();
    }
  }

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
  username: string,
  password: string,
  passwordConfirm: string,
): Promise<AuthResponse> {
  const data = await fetchApi<AuthResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ username, password, passwordConfirm }),
  });
  setTokens(data.accessToken, data.refreshToken);

  // 회원가입 후 마지막 선택한 팀스페이스 불러오기 (보통 null이지만 일관성을 위해)
  try {
    const { lastSelectedTeamSpaceId } = await getLastSelectedTeamSpaceApi();
    if (lastSelectedTeamSpaceId && typeof window !== "undefined") {
      localStorage.setItem("currentTeamSpaceId", lastSelectedTeamSpaceId);
    }
  } catch {
    // 실패해도 회원가입은 계속 진행
  }

  return data;
}

export async function signIn(
  username: string,
  password: string,
): Promise<AuthResponse> {
  const data = await fetchApi<AuthResponse>("/api/auth/signin", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setTokens(data.accessToken, data.refreshToken);

  // 로그인 후 마지막 선택한 팀스페이스 불러오기
  try {
    const { lastSelectedTeamSpaceId } = await getLastSelectedTeamSpaceApi();
    if (lastSelectedTeamSpaceId && typeof window !== "undefined") {
      localStorage.setItem("currentTeamSpaceId", lastSelectedTeamSpaceId);
    }
  } catch {
    // 실패해도 로그인은 계속 진행
  }

  return data;
}

export async function checkUsername(username: string): Promise<{
  available: boolean;
  message: string;
}> {
  return fetchApi(
    `/api/auth/check-username?username=${encodeURIComponent(username)}`,
  );
}

export async function signOut(): Promise<void> {
  try {
    await fetchApi("/api/auth/signout", { method: "POST" });
  } finally {
    clearTokens();
    // 로그아웃 이벤트 발생 (다른 컴포넌트에서 감지 가능)
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("authStateChanged", { detail: { isLoggedIn: false } }),
      );
    }
  }
}

export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  // 이미 토큰 갱신이 진행 중이면 기다림
  if (refreshPromise) {
    return refreshPromise;
  }

  // 새로운 토큰 갱신 시작
  refreshPromise = (async () => {
    try {
      // 직접 fetch 사용 (순환 참조 방지)
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        clearTokens();
        return false;
      }

      const data = await response.json();
      setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      clearTokens();
      return false;
    } finally {
      // Promise 완료 후 초기화
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ============ User Preferences API ============

export async function getLastSelectedTeamSpaceApi(): Promise<{
  lastSelectedTeamSpaceId: string | null;
}> {
  return fetchApi<{ lastSelectedTeamSpaceId: string | null }>(
    "/api/user/last-team-space",
  );
}

export async function setLastSelectedTeamSpaceApi(
  teamSpaceId: string | null,
): Promise<{ success: boolean; lastSelectedTeamSpaceId: string | null }> {
  return fetchApi<{ success: boolean; lastSelectedTeamSpaceId: string | null }>(
    "/api/user/last-team-space",
    {
      method: "PUT",
      body: JSON.stringify({ teamSpaceId }),
    },
  );
}

// ============ Interview Types API ============

export interface ApiInterviewType {
  id: string;
  code: string;
  name: string;
  displayName: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
}

interface InterviewTypesResponse {
  interviewTypes: ApiInterviewType[];
}

export async function getInterviewTypesApi(): Promise<InterviewTypesResponse> {
  return fetchApi<InterviewTypesResponse>("/api/interview-types");
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

export async function addFavoriteApi(questionId: string): Promise<void> {
  await fetchApi("/api/favorites", {
    method: "POST",
    body: JSON.stringify({ question_id: questionId }),
  });
}

export async function removeFavoriteApi(questionId: string): Promise<void> {
  await fetchApi(`/api/favorites/${questionId}`, {
    method: "DELETE",
  });
}

export async function checkFavoriteApi(questionId: string): Promise<boolean> {
  try {
    const data = await fetchApi<{ is_favorited: boolean }>(
      `/api/favorites/${questionId}`,
    );
    return data.is_favorited;
  } catch {
    return false;
  }
}

export async function toggleFavoriteApi(
  questionId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _question: { content: string; hint: string; category: string },
): Promise<boolean> {
  const isFav = await checkFavoriteApi(questionId);
  if (isFav) {
    await removeFavoriteApi(questionId);
    return false;
  } else {
    try {
      await addFavoriteApi(questionId);
      return true;
    } catch (error) {
      // 이미 찜한 질문인 경우 (409 에러), 이미 찜한 상태로 처리
      const errorMessage = error instanceof Error ? error.message : "";
      if (
        errorMessage.includes("이미 찜한 질문") ||
        errorMessage.includes("409")
      ) {
        // 이미 찜한 상태이므로 true 반환 (중복 찜 방지)
        return true;
      }
      throw error;
    }
  }
}

// ============ Sessions API ============

export interface ApiSession {
  id: string;
  query: string;
  total_time: number;
  is_completed: boolean;
  question_count: number;
  interview_type_id?: string | null;
  interview_type?: ApiInterviewType | null;
  created_at: string;
  user_id: string; // 소유자 ID 추가
  shared_by?: {
    id: string;
    username: string;
    nickname: string | null;
  } | null;
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
  limit: number = 20,
  options?: {
    teamSpaceId?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    interviewTypeId?: string | null;
  },
): Promise<SessionsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (options?.teamSpaceId) {
    params.append("team_space_id", options.teamSpaceId);
  }
  if (options?.startDate) {
    params.append("start_date", options.startDate);
  }
  if (options?.endDate) {
    params.append("end_date", options.endDate);
  }
  if (options?.interviewTypeId) {
    params.append("interview_type_id", options.interviewTypeId);
  }
  return fetchApi<SessionsResponse>(`/api/sessions?${params.toString()}`);
}

export async function getSessionByIdApi(id: string): Promise<ApiSessionDetail> {
  return fetchApi<ApiSessionDetail>(`/api/sessions/${id}`);
}

export async function createSessionApi(
  query: string,
  questions: Array<{
    content: string;
    hint: string;
    category: string;
    questionId?: string; // 기존 질문 ID (있으면 사용)
  }>,
  interviewTypeId?: string | null,
): Promise<{ session: { id: string; created_at: string } }> {
  // questionId가 있는 경우 question_ids로 전달
  const questionIds = questions
    .map((q) => q.questionId)
    .filter((id): id is string => !!id);

  return fetchApi("/api/sessions", {
    method: "POST",
    body: JSON.stringify({
      query,
      question_ids: questionIds.length > 0 ? questionIds : undefined,
      questions: questions.map((q) => ({
        content: q.content,
        hint: q.hint,
        category: q.category,
      })),
      interview_type_id: interviewTypeId || undefined,
    }),
  });
}

export async function completeSessionApi(
  sessionId: string,
  totalTime: number,
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
  timeSpent: number,
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
  isReferenceBased?: boolean;
}

export async function generateQuestionsApi(
  query: string,
  excludeQuestions: string[] = [],
  count: number = 5,
  interviewType?: string | null,
): Promise<GeneratedQuestion[]> {
  const data = await fetchApi<{ questions: GeneratedQuestion[] }>(
    "/api/questions/generate",
    {
      method: "POST",
      body: JSON.stringify({
        query,
        exclude_questions: excludeQuestions,
        count,
        interview_type: interviewType || undefined,
      }),
    },
  );
  return data.questions;
}

export async function replaceQuestionsApi(
  query: string,
  questionsToReplace: string[],
  keepQuestions: Array<{ content: string }>,
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
    },
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

// ============ Team Spaces API ============

export interface ApiTeamSpace {
  id: string;
  name: string;
  avatar_url: string | null;
  invite_code: string;
  role: "owner" | "member";
  created_by: string;
  created_at: string;
  joined_at: string;
}

interface TeamSpacesResponse {
  teamSpaces: ApiTeamSpace[];
}

export async function getTeamSpacesApi(): Promise<TeamSpacesResponse> {
  return fetchApi<TeamSpacesResponse>("/api/team-spaces");
}

export interface CreateTeamSpaceRequest {
  name: string;
  avatar_url?: string;
  password?: string;
}

export interface CreateTeamSpaceResponse {
  teamSpace: {
    id: string;
    name: string;
    avatar_url: string | null;
    invite_code: string;
    created_at: string;
  };
}

export async function createTeamSpaceApi(
  data: CreateTeamSpaceRequest,
): Promise<CreateTeamSpaceResponse> {
  return fetchApi<CreateTeamSpaceResponse>("/api/team-spaces", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface TeamSpaceDetail {
  id: string;
  name: string;
  avatar_url: string | null;
  invite_code: string;
  created_by: string;
  created_at: string;
  role: "owner" | "member";
}

export async function getTeamSpaceByIdApi(
  id: string,
): Promise<{ teamSpace: TeamSpaceDetail }> {
  return fetchApi<{ teamSpace: TeamSpaceDetail }>(`/api/team-spaces/${id}`);
}

export interface UpdateTeamSpaceRequest {
  name?: string;
  avatar_url?: string;
  password?: string;
}

export async function updateTeamSpaceApi(
  id: string,
  data: UpdateTeamSpaceRequest,
): Promise<{ teamSpace: TeamSpaceDetail }> {
  return fetchApi<{ teamSpace: TeamSpaceDetail }>(`/api/team-spaces/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export interface TeamSpaceInviteInfo {
  id: string;
  name: string;
  avatar_url: string | null;
  has_password: boolean;
}

export async function getTeamSpaceByInviteCodeApi(
  code: string,
): Promise<{ teamSpace: TeamSpaceInviteInfo }> {
  return fetchApi<{ teamSpace: TeamSpaceInviteInfo }>(
    `/api/team-spaces/invite/${code}`,
  );
}

export interface JoinTeamSpaceRequest {
  password?: string;
}

export async function joinTeamSpaceApi(
  code: string,
  data?: JoinTeamSpaceRequest,
): Promise<{ teamSpace: { id: string; name: string } }> {
  return fetchApi<{ teamSpace: { id: string; name: string } }>(
    `/api/team-spaces/invite/${code}/join`,
    {
      method: "POST",
      body: JSON.stringify(data || {}),
    },
  );
}

export async function regenerateInviteCodeApi(
  id: string,
): Promise<{ invite_code: string }> {
  return fetchApi<{ invite_code: string }>(
    `/api/team-spaces/${id}/regenerate-invite`,
    {
      method: "POST",
    },
  );
}

export interface TeamSpaceSession {
  id: string;
  query: string;
  total_time: number;
  is_completed: boolean;
  created_at: string;
  week_number: number | null;
  shared_at: string;
  shared_by: {
    id: string;
    username: string;
    nickname: string | null;
  };
}

export async function getTeamSpaceSessionsApi(
  id: string,
  weekNumber?: number,
  startDate?: string,
  endDate?: string,
): Promise<{ sessions: TeamSpaceSession[] }> {
  const params = new URLSearchParams();
  if (weekNumber) {
    params.append("week", String(weekNumber));
  }
  if (startDate) {
    params.append("start_date", startDate);
  }
  if (endDate) {
    params.append("end_date", endDate);
  }
  const queryString = params.toString();
  return fetchApi<{ sessions: TeamSpaceSession[] }>(
    `/api/team-spaces/${id}/sessions${queryString ? `?${queryString}` : ""}`,
  );
}

export async function shareSessionToTeamSpaceApi(
  teamSpaceId: string,
  sessionId: string,
  weekNumber?: number,
): Promise<{
  id: string;
  session_id: string;
  week_number: number | null;
  shared_at: string;
}> {
  return fetchApi(`/api/team-spaces/${teamSpaceId}/sessions`, {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      week_number: weekNumber,
    }),
  });
}

export interface TeamSpaceFavorite {
  id: string;
  question_id: string;
  content: string;
  hint: string | null;
  category: string;
  subcategory: string | null;
  created_at: string;
  shared_at: string;
  favorited_by: Array<{
    id: string;
    username: string;
    nickname: string | null;
    shared_at: string;
    is_mine: boolean;
  }>;
  is_mine: boolean;
}

export async function getTeamSpaceFavoritesApi(
  id: string,
): Promise<{ favorites: TeamSpaceFavorite[] }> {
  return fetchApi<{ favorites: TeamSpaceFavorite[] }>(
    `/api/team-spaces/${id}/favorites`,
  );
}

export async function shareFavoriteToTeamSpaceApi(
  teamSpaceId: string,
  favoriteId: string,
): Promise<{
  id: string;
  favorite_id: string;
  shared_at: string;
}> {
  return fetchApi(`/api/team-spaces/${teamSpaceId}/favorites`, {
    method: "POST",
    body: JSON.stringify({
      favorite_id: favoriteId,
    }),
  });
}

// ============ User Preferences API ============

export async function getTeamSpaceIntroStatusApi(): Promise<{
  hasSeenIntro: boolean;
}> {
  return fetchApi<{ hasSeenIntro: boolean }>("/api/user/teamspace-intro");
}

export async function markTeamSpaceIntroSeenApi(): Promise<{
  success: boolean;
}> {
  return fetchApi<{ success: boolean }>("/api/user/teamspace-intro", {
    method: "POST",
  });
}

// ============ Answer Feedback API ============

export interface ApiModelAnswerData {
  modelAnswer: string;
  keyPoints: string[];
  codeExample?: string | null;
}

export interface ApiFeedbackData {
  id: string;
  answerId: string;
  keywords: string[];
  score: number | null;
  summary: string | null;
  strengths: string[];
  improvements: string[];
  followUpQuestions: string[];
  detailedFeedback: string | null;
  hasDetailedFeedback: boolean;
  keywordAnalysis?: {
    expected: string[];
    mentioned: string[];
    missing: string[];
  };
  // Model answer fields
  modelAnswer?: ApiModelAnswerData | null;
  hasModelAnswer?: boolean;
  createdAt: string;
  detailGeneratedAt: string | null;
}

/**
 * Get feedback for an answer
 */
export async function getFeedbackApi(
  answerId: string,
): Promise<{ feedback: ApiFeedbackData | null }> {
  return fetchApi<{ feedback: ApiFeedbackData | null }>(
    `/api/answers/${answerId}/feedback`,
  );
}

/**
 * Generate quick feedback (keywords, score, summary) using Haiku
 */
export async function generateQuickFeedbackApi(
  answerId: string,
): Promise<{ feedback: ApiFeedbackData }> {
  return fetchApi<{ feedback: ApiFeedbackData }>(
    `/api/answers/${answerId}/feedback/quick`,
    {
      method: "POST",
    },
  );
}

/**
 * Generate detailed feedback (strengths, improvements, followUpQuestions) using Sonnet
 */
export async function generateDetailedFeedbackApi(
  answerId: string,
): Promise<{ feedback: ApiFeedbackData }> {
  return fetchApi<{ feedback: ApiFeedbackData }>(
    `/api/answers/${answerId}/feedback/detail`,
    {
      method: "POST",
    },
  );
}

/**
 * Generate full feedback (one-click complete analysis) using Sonnet
 * Returns: keyword analysis, score, summary, strengths, improvements, followUpQuestions, detailedFeedback
 */
export async function generateFullFeedbackApi(
  answerId: string,
): Promise<{ feedback: ApiFeedbackData }> {
  return fetchApi<{ feedback: ApiFeedbackData }>(
    `/api/answers/${answerId}/feedback/full`,
    {
      method: "POST",
    },
  );
}

// ============ Model Answer API ============

/**
 * Get cached model answer for a question
 */
export async function getModelAnswerApi(
  answerId: string,
): Promise<{ modelAnswer: ApiModelAnswerData | null }> {
  return fetchApi<{ modelAnswer: ApiModelAnswerData | null }>(
    `/api/answers/${answerId}/model-answer`,
  );
}

/**
 * Generate model answer for a question using Sonnet
 * Returns: exemplary answer, key points, optional code example
 */
export async function generateModelAnswerApi(
  answerId: string,
): Promise<{ modelAnswer: ApiModelAnswerData; cached: boolean }> {
  return fetchApi<{ modelAnswer: ApiModelAnswerData; cached: boolean }>(
    `/api/answers/${answerId}/model-answer`,
    {
      method: "POST",
    },
  );
}

// ============ Case Studies API ============

import type {
  CaseStudy,
  CaseStudyListItem,
  CaseStudyFilters,
} from "@/types/case-study";

export interface CaseStudiesResponse {
  caseStudies: CaseStudyListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getCaseStudiesApi(
  filters: Partial<CaseStudyFilters> = {},
  page: number = 1,
  limit: number = 12,
): Promise<CaseStudiesResponse> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));

  if (filters.search) params.set("search", filters.search);
  if (filters.companies?.length)
    params.set("companies", filters.companies.join(","));
  if (filters.domains?.length) params.set("domains", filters.domains.join(","));
  if (filters.difficulty?.length)
    params.set("difficulty", filters.difficulty.join(","));
  if (filters.sourceType?.length)
    params.set("sourceType", filters.sourceType.join(","));
  if (filters.sort) params.set("sort", filters.sort);

  return fetchApi<CaseStudiesResponse>(
    `/api/case-studies?${params.toString()}`,
  );
}

export async function getCaseStudyBySlugApi(
  slug: string,
): Promise<{ caseStudy: CaseStudy }> {
  return fetchApi<{ caseStudy: CaseStudy }>(`/api/case-studies/${slug}`);
}

export async function getCaseStudyFiltersApi(): Promise<{
  companies: { slug: string; name: string }[];
  domains: string[];
}> {
  return fetchApi(`/api/case-studies/filters`);
}

export async function generateCaseStudyQuestionsApi(
  slug: string,
  options?: { count?: number; use_seed_questions?: boolean },
): Promise<{
  questions: GeneratedQuestion[];
  caseStudyId: string;
  caseStudyTitle: string;
  source: "seed" | "ai";
}> {
  return fetchApi(`/api/case-studies/${slug}/questions`, {
    method: "POST",
    body: JSON.stringify({
      count: options?.count || 5,
      use_seed_questions: options?.use_seed_questions || false,
    }),
  });
}

export async function startCaseStudyInterviewApi(slug: string): Promise<{
  session: { id: string; created_at: string };
  query: string;
  caseStudyId: string;
  questions: Array<{
    id: string;
    content: string;
    hint: string;
    difficulty: string;
    categories: { name: string; display_name: string };
    order: number;
  }>;
}> {
  return fetchApi(`/api/case-studies/${slug}/start`, { method: "POST" });
}

export async function toggleCaseStudyFavoriteApi(
  caseStudyId: string,
): Promise<{ isFavorite: boolean }> {
  return fetchApi<{ isFavorite: boolean }>(
    `/api/case-studies/${caseStudyId}/favorite`,
    {
      method: "POST",
    },
  );
}
