/**
 * Voyage AI Embedding Utility
 * 질문 텍스트를 벡터로 변환하여 시맨틱 검색에 활용
 */

import { VoyageAIClient } from "voyageai";

const voyageClient = new VoyageAIClient({
  apiKey: process.env.VOYAGE_API_KEY,
});

const EMBEDDING_MODEL = "voyage-3.5";
const EMBEDDING_DIMENSION = 1024;

/**
 * 단일 텍스트의 임베딩 생성
 * @param text - 임베딩할 텍스트
 * @param inputType - "query" (검색 쿼리) 또는 "document" (저장용 문서)
 */
export async function generateEmbedding(
  text: string,
  inputType: "query" | "document" = "document",
): Promise<number[]> {
  const result = await voyageClient.embed({
    input: [text],
    model: EMBEDDING_MODEL,
    inputType,
    outputDimension: EMBEDDING_DIMENSION,
  });

  if (!result.data || result.data.length === 0 || !result.data[0].embedding) {
    throw new Error("임베딩 생성 실패: 빈 응답");
  }

  return result.data[0].embedding;
}

/**
 * 여러 텍스트의 임베딩을 배치로 생성
 * @param texts - 임베딩할 텍스트 배열
 * @param inputType - "query" 또는 "document"
 */
export async function generateEmbeddings(
  texts: string[],
  inputType: "query" | "document" = "document",
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const result = await voyageClient.embed({
    input: texts,
    model: EMBEDDING_MODEL,
    inputType,
    outputDimension: EMBEDDING_DIMENSION,
  });

  if (!result.data || result.data.length !== texts.length) {
    throw new Error("임베딩 생성 실패: 결과 수 불일치");
  }

  return result.data.map((d) => {
    if (!d.embedding) throw new Error("임베딩 생성 실패: 빈 임베딩");
    return d.embedding;
  });
}

export { EMBEDDING_MODEL, EMBEDDING_DIMENSION };
