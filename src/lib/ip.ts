import { headers } from "next/headers";

/**
 * 클라이언트 IP 추출
 * Vercel: x-real-ip (플랫폼 제공, 신뢰 가능)
 * 일반: x-forwarded-for (첫 번째 값)
 * 폴백: 127.0.0.1
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0].trim() ??
    "127.0.0.1"
  );
}
