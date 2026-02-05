/**
 * 파일 업로드 관련 유틸리티 함수
 */

export const FILE_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
export const ALLOWED_PDF_TYPE = "application/pdf";

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * 파일 크기 및 타입 검증
 */
export function validateFile(file: File): FileValidationResult {
  // 크기 검증
  if (file.size > FILE_SIZE_LIMIT) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `파일 크기가 10MB를 초과합니다 (${sizeMB}MB): ${file.name}`,
    };
  }

  // 타입 검증
  const isPdf = file.type === ALLOWED_PDF_TYPE;
  const isImage =
    ALLOWED_IMAGE_TYPES.includes(file.type) || file.type.startsWith("image/");

  if (!isPdf && !isImage) {
    return {
      valid: false,
      error: `지원하지 않는 파일 형식입니다: ${file.name}`,
    };
  }

  return { valid: true };
}

/**
 * 비ASCII 문자를 제거하고 파일명 정리
 * iOS/Android 및 일부 서버에서 비ASCII 파일명 처리 문제 방지
 */
export function sanitizeFilename(name: string): string {
  // 확장자 분리
  const lastDot = name.lastIndexOf(".");
  const ext = lastDot !== -1 ? name.slice(lastDot + 1) : "";
  const base = lastDot !== -1 ? name.slice(0, lastDot) : name;

  // 비ASCII 문자 및 특수문자를 언더스코어로 변환
  const sanitized = base
    .replace(/[^\w\-_.]/g, "_")
    .replace(/_+/g, "_") // 연속된 언더스코어 제거
    .replace(/^_|_$/g, ""); // 앞뒤 언더스코어 제거

  // 빈 이름 방지
  const finalBase = sanitized || "file";

  return ext ? `${finalBase}.${ext}` : finalBase;
}

/**
 * 파일명을 sanitize하여 새 File 객체 생성
 */
export function createSanitizedFile(file: File): File {
  const sanitizedName = sanitizeFilename(file.name);

  // 파일명이 같으면 원본 반환
  if (sanitizedName === file.name) {
    return file;
  }

  return new File([file], sanitizedName, { type: file.type });
}

/**
 * 타임아웃이 적용된 파일 업로드
 */
export async function uploadFileWithTimeout(
  file: File,
  url: string,
  token: string,
  timeoutMs: number = 60000,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const formData = new FormData();
  const sanitizedFile = createSanitizedFile(file);
  formData.append("file", sanitizedFile);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "업로드 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.",
      );
    }
    throw error;
  }
}

/**
 * 파일 크기를 읽기 쉬운 형식으로 변환
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
