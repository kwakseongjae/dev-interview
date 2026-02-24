import type { Metadata } from "next";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "기술면접 트렌드 2026 | 모카번",
  description:
    "LLM, RAG, AI Agent 등 2026년 기술면접 출제율 급상승 토픽을 AI 맞춤 질문으로 연습하세요. 최신 개발 트렌드 면접 준비.",
  keywords: [
    "기술면접 트렌드",
    "LLM 면접",
    "RAG 면접",
    "AI Agent 면접",
    "2026 기술면접",
    "최신 기술 면접",
  ],
  openGraph: {
    title: "기술면접 트렌드 2026 | 모카번",
    description:
      "LLM, RAG, AI Agent 등 2026년 기술면접 출제율 급상승 토픽을 AI 맞춤 질문으로 연습하세요.",
    url: `${SITE_URL}/trends`,
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: "기술면접 트렌드 2026 | 모카번",
    description:
      "LLM, RAG, AI Agent 등 2026년 기술면접 출제율 급상승 토픽을 AI 맞춤 질문으로 연습하세요.",
  },
  alternates: {
    canonical: `${SITE_URL}/trends`,
  },
};

export default function TrendsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
