"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 회사 로고 컴포넌트
 * public/companies/{slug}.png 정적 파일을 사용하여 회사 로고를 표시
 * 파일이 없는 회사는 Building2 아이콘으로 폴백
 */
const COMPANIES_WITH_LOGO = new Set([
  "toss",
  "woowa",
  "daangn",
  "netflix",
  "stripe",
  "figma",
  "slack",
  "discord",
  "kakao",
  "naver",
  "line",
  "coupang",
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
