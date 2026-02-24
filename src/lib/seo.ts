/**
 * SEO / AEO / GEO utilities
 * JSON-LD structured data helpers for AI search engine optimization
 */

import type {
  Organization,
  WebApplication,
  FAQPage,
  BreadcrumbList,
  WithContext,
  Thing,
} from "schema-dts";

// ============ Constants ============

export const SITE_URL = "https://www.mochabun.co.kr";
export const SITE_NAME = "모카번";
export const SITE_NAME_EN = "mochabun";
export const SITE_DESCRIPTION =
  "개발자 기술면접, AI와 함께 준비하세요. 맞춤형 질문 생성과 실전 모의면접을 경험해보세요.";

// ============ JSON-LD Generators ============

export function getOrganizationJsonLd(): WithContext<Organization> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    alternateName: SITE_NAME_EN,
    url: SITE_URL,
    logo: `${SITE_URL}/assets/images/logo.png`,
    description: "AI 기반 개발자 기술면접 준비 서비스",
  };
}

export function getWebApplicationJsonLd(): WithContext<WebApplication> {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url: SITE_URL,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "KRW",
      description: "무료 체험 가능",
    },
    featureList: [
      "AI 맞춤형 면접 질문 생성",
      "실전 타이머 기반 모의면접",
      "경력/포지션별 맞춤 질문",
      "AI 트렌드 기술 질문 (LLM, RAG, AI Agent)",
      "실제 기업 기술블로그 기반 케이스 스터디 면접",
      "팀 스페이스 협업 학습",
    ],
    inLanguage: "ko",
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

export function getFaqJsonLd(faqs: FaqItem[]): WithContext<FAQPage> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question" as const,
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer" as const,
        text: faq.answer,
      },
    })),
  };
}

export interface BreadcrumbItem {
  name: string;
  url?: string;
}

export function getBreadcrumbJsonLd(
  items: BreadcrumbItem[],
): WithContext<BreadcrumbList> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem" as const,
      position: index + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
}

// ============ JSON-LD Serializer ============

/**
 * Serialize JSON-LD data to a safe HTML string for use with dangerouslySetInnerHTML.
 * Escapes '<' to prevent XSS in script tags.
 */
export function serializeJsonLd<T extends Thing>(data: WithContext<T>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
