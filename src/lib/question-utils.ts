/**
 * 질문 콘텐츠 정규화 함수
 *
 * 모든 INSERT 경로에서 동일한 정규화를 적용하여
 * content_normalized 값의 일관성을 보장합니다.
 *
 * 파이프라인: lowercase → 연속 공백 축소 → trim
 *
 * PostgreSQL 대응: lower(trim(regexp_replace(content, '\s+', ' ', 'g')))
 */
export function normalizeQuestionContent(content: string): string {
  return content.toLowerCase().replace(/\s+/g, " ").trim();
}
