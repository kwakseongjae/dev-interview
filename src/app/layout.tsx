import type { Metadata } from "next";
import "./globals.css";
import { Agentation } from "agentation";

export const metadata: Metadata = {
  title: "모카번 - AI 기술면접 준비",
  description:
    "개발자 기술면접, AI와 함께 준비하세요. 맞춤형 질문 생성과 실전 모의면접을 경험해보세요.",
  keywords: [
    "기술면접",
    "개발자",
    "면접 준비",
    "AI 면접",
    "모의면접",
    "프론트엔드",
    "백엔드",
    "React",
  ],
  authors: [{ name: "모카번" }],
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: {
      "naver-site-verification":
        process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION ?? "",
    },
  },
  openGraph: {
    title: "모카번 - AI 기술면접 준비",
    description:
      "개발자 기술면접, AI와 함께 준비하세요. 맞춤형 질문 생성과 실전 모의면접을 경험해보세요.",
    type: "website",
    locale: "ko_KR",
    url: "https://mochabun.co.kr",
    siteName: "모카번",
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
    canonical: "https://mochabun.co.kr",
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
      </head>
      <body className="min-h-screen font-body antialiased">
        {children}
        {process.env.NODE_ENV === "development" && <Agentation />}
      </body>
    </html>
  );
}
