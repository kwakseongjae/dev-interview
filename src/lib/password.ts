import bcrypt from "bcryptjs";

/**
 * 비밀번호 해시 생성 (팀스페이스 등에서 사용)
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
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
