import type { Metadata } from "next";
import { getCaseStudyBySlug } from "@/lib/case-studies";
import { getBreadcrumbJsonLd, SITE_URL, SITE_NAME } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import CaseStudyClient from "./CaseStudyClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const caseStudy = await getCaseStudyBySlug(slug);

  if (!caseStudy) {
    return {
      title: "케이스 스터디를 찾을 수 없습니다 | 모카번",
    };
  }

  const title = `${caseStudy.companyName} - ${caseStudy.title} | 모카번`;
  const description = caseStudy.summary.background
    ? `${caseStudy.companyName}의 ${caseStudy.title}. ${caseStudy.summary.background.slice(0, 120)}...`
    : `${caseStudy.companyName}의 기술적 결정과 트레이드오프를 분석하는 케이스 스터디 면접`;

  return {
    title,
    description,
    keywords: [
      caseStudy.companyName,
      "케이스 스터디",
      "기술면접",
      ...caseStudy.domains,
      ...caseStudy.technologies.slice(0, 5),
    ],
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/case-studies/${slug}`,
      siteName: SITE_NAME,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: `${SITE_URL}/case-studies/${slug}`,
    },
  };
}

export default async function CaseStudyDetailPage({ params }: Props) {
  const { slug } = await params;
  const caseStudy = await getCaseStudyBySlug(slug);

  const breadcrumbItems = [
    { name: "홈", url: SITE_URL },
    { name: "케이스 스터디", url: `${SITE_URL}/case-studies` },
    ...(caseStudy
      ? [{ name: `${caseStudy.companyName} - ${caseStudy.title}` }]
      : []),
  ];

  return (
    <>
      <JsonLd data={getBreadcrumbJsonLd(breadcrumbItems)} />
      <CaseStudyClient caseStudy={caseStudy} />
    </>
  );
}
