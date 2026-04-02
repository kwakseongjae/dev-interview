"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 회사 로고 컴포넌트
 * public/companies/{slug}.png 정적 파일을 사용하여 회사 로고를 표시
 * 파일이 없는 회사는 Building2 아이콘으로 폴백
 */
export const COMPANIES_WITH_LOGO = new Set([
  // Korean - Big Tech
  "kakao",
  "kakaopay",
  "kakaobank",
  "naver",
  "line",
  "coupang",
  "toss",
  "woowa",
  "samsung-sds",
  "sk-planet",
  "nhn",
  // Korean - Startups & Scale-ups
  "daangn",
  "devsisters",
  "hyperconnect",
  "bucketplace",
  "socar",
  "kurly",
  "banksalad",
  "ridi",
  "watcha",
  "yogiyo",
  "29cm",
  "musinsa",
  "zigbang",
  // International
  "meta",
  "google",
  "netflix",
  "aws",
  "github",
  "linkedin",
  "x",
  "discord",
  "slack",
  "pinterest",
  "shopify",
  "stripe",
  "airbnb",
  "uber",
  "lyft",
  "doordash",
  "instacart",
  "spotify",
  "cloudflare",
  "dropbox",
  // Other
  "figma",
]);

interface CompanyLogoProps {
  companySlug: string;
  size?: number;
  className?: string;
}

export function CompanyLogo({
  companySlug,
  size = 20,
  className,
}: CompanyLogoProps) {
  const [hasError, setHasError] = useState(false);
  const hasLogo = COMPANIES_WITH_LOGO.has(companySlug);

  if (!hasLogo || hasError) {
    return (
      <Building2
        className={cn("text-muted-foreground", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/companies/${companySlug}.png`}
      alt=""
      width={size}
      height={size}
      className={cn("rounded-sm object-contain", className)}
      onError={() => setHasError(true)}
    />
  );
}
