"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  FileText,
  Video,
  GraduationCap,
  Eye,
  MessageSquare,
  BookOpen,
  Lightbulb,
  Target,
  Trophy,
  Zap,
  Timer,
  ClipboardList,
  Archive,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";
import logoImage from "@/assets/images/logo.png";
import logoTextImage from "@/assets/images/logo-text.png";
import { getCaseStudyBySlugApi } from "@/lib/api";
import type { CaseStudy } from "@/types/case-study";
import { DIFFICULTY_CONFIG } from "@/types/case-study";
import { CompanyLogo } from "@/components/CompanyLogo";

const SOURCE_TYPE_ICONS = {
  blog: FileText,
  conference: Video,
  paper: GraduationCap,
} as const;

const SOURCE_TYPE_LABELS = {
  blog: "기술 블로그",
  conference: "컨퍼런스",
  paper: "논문",
} as const;

const SUMMARY_SECTIONS = [
  {
    key: "background" as const,
    label: "배경",
    icon: BookOpen,
    color: "text-blue-600",
  },
  {
    key: "challenge" as const,
    label: "도전 과제",
    icon: Target,
    color: "text-orange-600",
  },
  {
    key: "solution" as const,
    label: "해결 방안",
    icon: Lightbulb,
    color: "text-green-600",
  },
  {
    key: "results" as const,
    label: "결과",
    icon: Trophy,
    color: "text-purple-600",
  },
];

export default function CaseStudyDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [caseStudy, setCaseStudy] = useState<CaseStudy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    const fetchCaseStudy = async () => {
      try {
        const { caseStudy: data } = await getCaseStudyBySlugApi(slug);
        setCaseStudy(data);
      } catch (error) {
        console.error("케이스 스터디 로드 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCaseStudy();
  }, [slug]);

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </main>
    );
  }

  if (!caseStudy) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-lg text-muted-foreground">
          케이스 스터디를 찾을 수 없습니다
        </p>
        <Link href="/case-studies">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            목록으로 돌아가기
          </Button>
        </Link>
      </main>
    );
  }

  const diffConfig = DIFFICULTY_CONFIG[caseStudy.difficulty];
  const SourceIcon = SOURCE_TYPE_ICONS[caseStudy.sourceType];

  return (
    <main className="min-h-screen grain">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-navy/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full border-b border-border/50">
        <nav className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/case-studies"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>목록으로</span>
          </Link>
          <Link href="/" className="flex items-center gap-1">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden">
              <Image
                src={logoImage}
                alt="모카번 Logo"
                width={48}
                height={48}
                className="w-full h-full object-contain"
              />
            </div>
            <Image
              src={logoTextImage}
              alt="모카번"
              width={66}
              height={28}
              className="h-5 w-auto object-contain"
              priority
            />
          </Link>
        </nav>
      </header>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        {/* Metadata */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <CompanyLogo companySlug={caseStudy.companySlug} size={20} />
              <span className="font-medium">{caseStudy.companyName}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <SourceIcon className="w-4 h-4" />
              <span className="text-sm">
                {SOURCE_TYPE_LABELS[caseStudy.sourceType]}
              </span>
            </div>
            <Badge variant="outline" className={`border ${diffConfig.color}`}>
              {diffConfig.label} - {diffConfig.description}
            </Badge>
          </div>

          <h1 className="font-display text-2xl md:text-3xl font-bold mb-4">
            {caseStudy.title}
          </h1>

          {/* Tags */}
          <div className="flex gap-2 flex-wrap mb-4">
            {caseStudy.domains.map((domain) => (
              <Badge key={domain} variant="secondary">
                {domain}
              </Badge>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap mb-4">
            {caseStudy.technologies.map((tech) => (
              <span
                key={tech}
                className="text-sm text-muted-foreground bg-muted/50 px-2.5 py-1 rounded"
              >
                {tech}
              </span>
            ))}
          </div>

          {/* Stats & Source Link */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            {caseStudy.publishedAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {new Date(caseStudy.publishedAt).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                })}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              조회 {caseStudy.viewCount}
            </span>
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" />
              면접 {caseStudy.interviewCount}회
            </span>
            <a
              href={caseStudy.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-gold hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              원문 보기
            </a>
          </div>
        </motion.div>

        {/* Case Study Summary */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4 mb-8"
        >
          {SUMMARY_SECTIONS.map((section) => {
            const Icon = section.icon;
            const content = caseStudy.summary[section.key];
            if (!content) return null;

            return (
              <Card key={section.key} className="p-5">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg bg-muted/50 ${section.color}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-semibold text-base mb-2">
                      {section.label}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                      {content}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}

          {/* Key Takeaways */}
          {caseStudy.summary.keyTakeaways.length > 0 && (
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-muted/50 text-gold">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-semibold text-base mb-3">
                    핵심 인사이트
                  </h3>
                  <ul className="space-y-2">
                    {caseStudy.summary.keyTakeaways.map((takeaway, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-gold font-medium text-sm mt-0.5">
                          {i + 1}.
                        </span>
                        <span className="text-muted-foreground leading-relaxed">
                          {takeaway}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}
        </motion.div>

        {/* 면접 시작 CTA */}
        {caseStudy.seedQuestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-t-4 border-t-gold bg-gradient-to-b from-gold/5 to-transparent p-6 md:p-8">
              <div className="flex flex-col items-center text-center">
                {/* Icon */}
                <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center mb-4">
                  <MessageSquare className="w-7 h-7 text-gold" />
                </div>

                {/* Title & Description */}
                <h2 className="font-display text-xl md:text-2xl font-bold mb-2">
                  이 사례 기반 면접에 도전해보세요
                </h2>
                <p className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-lg mb-5">
                  {caseStudy.companyName}의 실제 기술적 결정과 트레이드오프를
                  깊이 파고드는 면접 질문{" "}
                  <span className="font-semibold text-foreground">
                    {caseStudy.seedQuestions.length}개
                  </span>
                  가 준비되어 있습니다
                </p>

                {/* Category badges */}
                <div className="flex gap-2 flex-wrap justify-center mb-5">
                  {[
                    ...new Set(caseStudy.seedQuestions.map((q) => q.category)),
                  ].map((category) => (
                    <Badge key={category} variant="secondary">
                      {category}
                    </Badge>
                  ))}
                </div>

                {/* Feature chips */}
                <div className="flex gap-3 flex-wrap justify-center mb-6 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full">
                    <Timer className="w-3.5 h-3.5" />
                    타이머
                  </span>
                  <span className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full">
                    <ClipboardList className="w-3.5 h-3.5" />
                    사례 참조 가능
                  </span>
                  <span className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full">
                    <Archive className="w-3.5 h-3.5" />
                    결과 아카이브
                  </span>
                </div>

                {/* CTA Button */}
                <Link href={`/case-studies/${slug}/interview`}>
                  <Button
                    size="lg"
                    className="bg-gold hover:bg-gold-light text-navy font-semibold px-8 gap-2"
                  >
                    면접 시작하기
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>

                <p className="text-xs text-muted-foreground mt-3">
                  로그인 없이 바로 면접을 시작할 수 있습니다
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </main>
  );
}
