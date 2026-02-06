import crypto from "crypto";

/**
 * 텍스트 핑거프린트 생성
 * - 특수문자 제거, 소문자 변환, 정규화
 * - 의미 있는 단어만 추출하여 정렬
 * @param text 원본 텍스트
 * @returns 정규화된 핑거프린트 문자열
 */
export function generateTextFingerprint(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, "") // 특수문자 제거 (한글, 영문, 숫자, 공백만 유지)
    .replace(/\s+/g, " ") // 연속 공백 정규화
    .trim()
    .split(" ")
    .filter((word) => word.length > 2) // 2글자 이하 제거
    .sort()
    .slice(0, 100) // 상위 100개 단어만
    .join("|");
}

/**
 * 레퍼런스 문서의 핑거프린트 생성
 * - 추출된 텍스트를 기반으로 SHA-256 해시 생성
 * - 32자로 잘라서 저장 공간 절약
 * @param extractedText 레퍼런스에서 추출된 텍스트
 * @returns SHA-256 해시의 앞 32자
 */
export function generateReferenceFingerprint(extractedText: string): string {
  const fingerprint = generateTextFingerprint(extractedText);
  return crypto
    .createHash("sha256")
    .update(fingerprint)
    .digest("hex")
    .slice(0, 32);
}

/**
 * 질문 내용의 핑거프린트 생성
 * - 질문 텍스트를 정규화하여 핑거프린트 생성
 * @param questionContent 질문 내용
 * @returns 정규화된 핑거프린트 문자열
 */
export function generateQuestionFingerprint(questionContent: string): string {
  return generateTextFingerprint(questionContent);
}

/**
 * Jaccard 유사도 계산
 * - 두 핑거프린트 간의 유사도 계산 (0~1)
 * @param fp1 첫 번째 핑거프린트
 * @param fp2 두 번째 핑거프린트
 * @returns 유사도 (0~1, 1이 완전 일치)
 */
export function calculateJaccardSimilarity(fp1: string, fp2: string): number {
  const set1 = new Set(fp1.split("|"));
  const set2 = new Set(fp2.split("|"));

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * 질문이 유사한지 확인
 * - Jaccard 유사도가 임계값 이상이면 유사한 것으로 판단
 * @param fp1 첫 번째 질문 핑거프린트
 * @param fp2 두 번째 질문 핑거프린트
 * @param threshold 유사도 임계값 (기본값: 0.7)
 * @returns 유사 여부
 */
export function isSimilarQuestion(
  fp1: string,
  fp2: string,
  threshold: number = 0.7,
): boolean {
  return calculateJaccardSimilarity(fp1, fp2) >= threshold;
}
