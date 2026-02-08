import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "기술면접 트렌드 2026 | 모카번",
  description:
    "LLM, RAG, AI Agent 등 2026년 기술면접 출제율 급상승 토픽을 AI 맞춤 질문으로 연습하세요. 최신 개발 트렌드 면접 준비.",
  openGraph: {
    title: "기술면접 트렌드 2026 | 모카번",
    description:
      "LLM, RAG, AI Agent 등 2026년 기술면접 출제율 급상승 토픽을 AI 맞춤 질문으로 연습하세요.",
  },
};

export default function TrendsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
