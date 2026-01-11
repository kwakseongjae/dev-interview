import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "모카번 - AI 기술면접 준비",
  description:
    "개발자 기술면접, AI와 함께 준비하세요. 맞춤형 질문 생성과 실전 모의면접을 경험해보세요.",
  keywords: [
    "기술면접",
    "개발자",
    "면접 준비",
    "React",
    "프론트엔드",
    "백엔드",
    "AI",
  ],
  authors: [{ name: "모카번" }],
  openGraph: {
    title: "모카번 - AI 기술면접 준비",
    description: "개발자 기술면접, AI와 함께 준비하세요",
    type: "website",
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
          content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co;"
        />
        {/* Security: Prevent clickjacking */}
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        {/* Security: Prevent MIME type sniffing */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        {/* Security: Referrer policy */}
        <meta name="referrer" content="strict-origin-when-cross-origin" />
      </head>
      <body className="min-h-screen font-body antialiased">{children}</body>
    </html>
  );
}
