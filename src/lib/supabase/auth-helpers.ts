import { createClient } from "./server";

interface AuthUser {
  sub: string;
  email: string;
}

/**
 * 인증 필수 - 미인증 시 throw
 * 기존 requireAuth() 대체
 */
export async function requireUser(): Promise<AuthUser> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("인증이 필요합니다");
  }

  return { sub: user.id, email: user.email ?? "" };
}

/**
 * 인증 선택 - 미인증 시 null 반환
 * 기존 getAuthFromRequest() 대체
 */
export async function getUserOptional(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  return { sub: user.id, email: user.email ?? "" };
}
