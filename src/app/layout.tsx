import type { Metadata } from "next";
import "./globals.css";
import { Agentation } from "agentation";
import FloatingContactButton from "@/components/FloatingContactButton";
import {
  getOrganizationJsonLd,
  getWebApplicationJsonLd,
  getFaqJsonLd,
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
} from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { FAQ_DATA } from "@/data/faq";

export const metadata: Metadata = {
  title: "모카번 - AI 기술면접 준비",
  description: SITE_DESCRIPTION,
  keywords: [
    "기술면접",
    "개발자",
    "면접 준비",
    "AI 면접",
    "모의면접",
    "프론트엔드",
    "백엔드",
    "React",
    "기술면접 준비",
    "개발자 면접",
    "AI 면접 질문",
    "코딩 면접",
  ],
  authors: [{ name: SITE_NAME }],
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: {
      "naver-site-verification":
        process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION ?? "",
    },
  },
  openGraph: {
    title: "모카번 - AI 기술면접 준비",
    description: SITE_DESCRIPTION,
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: "모카번 - AI 기술면접 준비",
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* Security: Content Security Policy */}
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co https://cdn.jsdelivr.net;"
        />
        {/* Note: X-Frame-Options, X-Content-Type-Options, Referrer-Policy are set via HTTP headers in next.config.ts */}
        {/* JSON-LD: Organization + WebApplication + FAQPage */}
        <JsonLd data={getOrganizationJsonLd()} />
        <JsonLd data={getWebApplicationJsonLd()} />
        <JsonLd data={getFaqJsonLd(FAQ_DATA)} />
      </head>
      <body className="min-h-screen font-body antialiased">
        {children}
        <FloatingContactButton />
        {process.env.NODE_ENV === "development" && <Agentation />}
      </body>
    </html>
  );
}
