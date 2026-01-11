import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "./supabase";
import type {
  AccessTokenPayload,
  RefreshTokenPayload,
  PublicUser,
  AuthResponse,
  TokenRefreshResponse,
} from "@/types/database";

const JWT_SECRET = process.env.JWT_SECRET!;
const ACCESS_TOKEN_EXPIRES = "15m";
const REFRESH_TOKEN_EXPIRES = "7d";
const REFRESH_TOKEN_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

/**
 * 비밀번호 해시 생성
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * 비밀번호 검증
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Access Token 생성
 */
export function generateAccessToken(userId: string, email: string): string {
  const payload: Omit<AccessTokenPayload, "iat" | "exp"> = {
    sub: userId,
    email,
    type: "access",
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
}

/**
 * Refresh Token 생성 및 DB 저장
 */
export async function generateRefreshToken(userId: string): Promise<string> {
  const tokenId = uuidv4();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS);

  const payload: Omit<RefreshTokenPayload, "iat" | "exp"> = {
    sub: userId,
    jti: tokenId,
    type: "refresh",
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES,
  });

  // DB에 refresh token 저장
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabaseAdmin as any).from("refresh_tokens").insert({
    id: tokenId,
    user_id: userId,
    token,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    throw new Error("Refresh token 저장 실패");
  }

  return token;
}

/**
 * Access Token 검증
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AccessTokenPayload;

    if (decoded.type !== "access") {
      throw new Error("잘못된 토큰 타입");
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("토큰이 만료되었습니다");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("유효하지 않은 토큰입니다");
    }
    throw error;
  }
}

/**
 * Refresh Token 검증
 */
export async function verifyRefreshToken(
  token: string
): Promise<RefreshTokenPayload> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as RefreshTokenPayload;

    if (decoded.type !== "refresh") {
      throw new Error("잘못된 토큰 타입");
    }

    // DB에서 토큰 유효성 확인 (무효화되지 않았는지)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: storedToken, error } = await (supabaseAdmin as any)
      .from("refresh_tokens")
      .select("*")
      .eq("id", decoded.jti)
      .eq("user_id", decoded.sub)
      .is("revoked_at", null)
      .single();

    if (error || !storedToken) {
      throw new Error("유효하지 않은 refresh token");
    }

    // 만료 시간 확인
    if (new Date(storedToken.expires_at) < new Date()) {
      throw new Error("Refresh token이 만료되었습니다");
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Refresh token이 만료되었습니다");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("유효하지 않은 refresh token");
    }
    throw error;
  }
}

/**
 * Refresh Token 무효화 (단일)
 */
export async function revokeRefreshToken(tokenId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabaseAdmin as any)
    .from("refresh_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", tokenId);

  if (error) {
    throw new Error("토큰 무효화 실패");
  }
}

/**
 * 사용자의 모든 Refresh Token 무효화 (로그아웃 시)
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabaseAdmin as any)
    .from("refresh_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("revoked_at", null);

  if (error) {
    throw new Error("토큰 무효화 실패");
  }
}

/**
 * 회원가입
 */
export async function signUp(
  username: string,
  password: string,
  email?: string
): Promise<AuthResponse> {
  // 아이디 중복 확인
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingUser } = await (supabaseAdmin as any)
    .from("users")
    .select("id")
    .eq("username", username)
    .single();

  if (existingUser) {
    throw new Error("이미 존재하는 아이디입니다");
  }

  // 비밀번호 해시
  const passwordHash = await hashPassword(password);

  // 사용자 생성 (email은 선택사항, username을 기본으로 사용)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newUser, error } = await (supabaseAdmin as any)
    .from("users")
    .insert({
      username,
      email: email || `${username}@devinterview.local`,
      password_hash: passwordHash,
      nickname: null,
    })
    .select()
    .single();

  if (error || !newUser) {
    throw new Error("회원가입 실패");
  }

  // 토큰 생성
  const accessToken = generateAccessToken(
    newUser.id,
    newUser.email || newUser.username
  );
  const refreshToken = await generateRefreshToken(newUser.id);

  // 공개 사용자 정보 (password_hash 제외)
  const publicUser: PublicUser = {
    id: newUser.id,
    email: newUser.email || newUser.username,
    nickname: newUser.nickname,
    avatar_url: newUser.avatar_url,
    created_at: newUser.created_at,
    updated_at: newUser.updated_at,
  };

  return {
    user: publicUser,
    accessToken,
    refreshToken,
  };
}

/**
 * 로그인
 */
export async function signIn(
  username: string,
  password: string
): Promise<AuthResponse> {
  // 사용자 조회 (username으로 조회)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: user, error } = await (supabaseAdmin as any)
    .from("users")
    .select("*")
    .eq("username", username)
    .single();

  if (error || !user) {
    throw new Error("아이디 또는 비밀번호가 올바르지 않습니다");
  }

  // 비밀번호 검증
  const isValidPassword = await verifyPassword(password, user.password_hash);
  if (!isValidPassword) {
    throw new Error("아이디 또는 비밀번호가 올바르지 않습니다");
  }

  // 토큰 생성
  const accessToken = generateAccessToken(user.id, user.email || user.username);
  const refreshToken = await generateRefreshToken(user.id);

  // 공개 사용자 정보
  const publicUser: PublicUser = {
    id: user.id,
    email: user.email || user.username,
    nickname: user.nickname,
    avatar_url: user.avatar_url,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };

  return {
    user: publicUser,
    accessToken,
    refreshToken,
  };
}

/**
 * 토큰 갱신
 */
export async function refreshTokens(
  refreshToken: string
): Promise<TokenRefreshResponse> {
  // Refresh token 검증
  const decoded = await verifyRefreshToken(refreshToken);

  // 사용자 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: user, error } = await (supabaseAdmin as any)
    .from("users")
    .select("id, email")
    .eq("id", decoded.sub)
    .single();

  if (error || !user) {
    throw new Error("사용자를 찾을 수 없습니다");
  }

  // 기존 refresh token 무효화
  await revokeRefreshToken(decoded.jti);

  // 새 토큰 생성
  const newAccessToken = generateAccessToken(user.id, user.email);
  const newRefreshToken = await generateRefreshToken(user.id);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

/**
 * 로그아웃 (모든 세션 종료)
 */
export async function signOut(userId: string): Promise<void> {
  await revokeAllUserTokens(userId);
}

/**
 * Request에서 인증 정보 추출 및 검증
 */
export function getAuthFromRequest(
  authHeader: string | null
): AccessTokenPayload | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

/**
 * 인증 필수 미들웨어 (API Route에서 사용)
 */
export function requireAuth(authHeader: string | null): AccessTokenPayload {
  const auth = getAuthFromRequest(authHeader);

  if (!auth) {
    throw new Error("인증이 필요합니다");
  }

  return auth;
}
