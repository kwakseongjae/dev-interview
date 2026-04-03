/**
 * KST 날짜 유틸리티
 * DB timezone이 Asia/Seoul로 설정되어 있으므로 KST 기준 날짜 문자열 반환
 */

/**
 * 오늘 날짜를 KST 기준 'YYYY-MM-DD' 형식으로 반환
 */
export function getKstDateString(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}
