import type { Metadata } from "next";
import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import {
  getFaqJsonLd,
  getBreadcrumbJsonLd,
  SITE_URL,
  SITE_NAME,
} from "@/lib/seo";
import { FAQ_DATA } from "@/data/faq";
import { FaqAccordion } from "./FaqAccordion";

export const metadata: Metadata = {
  title: `자주 묻는 질문 | ${SITE_NAME}`,
  description:
    "모카번 AI 기술면접 준비 서비스에 대한 자주 묻는 질문과 답변입니다. 사용 방법, 지원 기술 스택, 팀 스페이스 등을 확인하세요.",
  alternates: {
    canonical: `${SITE_URL}/faq`,
  },
  openGraph: {
    title: `자주 묻는 질문 | ${SITE_NAME}`,
    description:
      "모카번 AI 기술면접 준비 서비스에 대한 자주 묻는 질문과 답변입니다.",
    url: `${SITE_URL}/faq`,
    siteName: SITE_NAME,
    locale: "ko_KR",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function FaqPage() {
  const breadcrumbs = [
    { name: "홈", url: SITE_URL },
    { name: "자주 묻는 질문", url: `${SITE_URL}/faq` },
  ];

  return (
    <>
      <JsonLd data={getFaqJsonLd(FAQ_DATA)} />
      <JsonLd data={getBreadcrumbJsonLd(breadcrumbs)} />

      <main className="min-h-screen grain">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-navy/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-6 py-16 md:py-24">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← 홈으로
          </Link>

          <div className="flex items-center gap-2 mt-8 mb-2">
            <HelpCircle className="w-6 h-6 text-gold" />
            <h1 className="font-display text-2xl md:text-3xl font-bold">
              자주 묻는 질문
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mb-10">
            모카번 AI 기술면접 서비스에 대해 궁금한 점을 확인하세요.
          </p>

          <FaqAccordion />

          <div className="mt-16 text-center">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← 홈으로 돌아가기
            </Link>
          </div>
        </div>

        <footer className="relative z-10 py-4 flex items-center justify-center gap-3 text-xs text-muted-foreground/50">
          <span>&copy; 2026 mochabun</span>
          <span>·</span>
          <Link
            href="/privacy"
            className="hover:text-muted-foreground transition-colors"
          >
            개인정보 처리방침
          </Link>
        </footer>
      </main>
    </>
  );
}
