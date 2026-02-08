"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Flame,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";
import logoImage from "@/assets/images/logo.png";
import logoTextImage from "@/assets/images/logo-text.png";
import { cn } from "@/lib/utils";
import {
  getTopicsSorted,
  type TrendTopic,
  type TrendRelevance,
} from "@/data/trend-topics";

const RELEVANCE_CONFIG: Record<
  TrendRelevance,
  { label: string; color: string; bg: string; border: string }
> = {
  critical: {
    label: "핵심",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  high: {
    label: "주요",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  medium: {
    label: "관련",
    color: "text-gray-600",
    bg: "bg-gray-50",
    border: "border-gray-200",
  },
};

const INTERVIEW_TYPE_LABELS: Record<string, string> = {
  CS: "CS 기초",
  PROJECT: "프로젝트",
  SYSTEM_DESIGN: "시스템 설계",
  CASE_STUDY: "케이스 스터디",
};

type FilterType = "all" | TrendRelevance;

function TrendTopicCard({
  topic,
  index,
}: {
  topic: TrendTopic;
  index: number;
}) {
  const config = RELEVANCE_CONFIG[topic.relevance];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="p-5 h-full flex flex-col hover:shadow-md transition-shadow border-border/50">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-base font-semibold mb-0.5 truncate">
              {topic.nameKo}
            </h3>
            <p className="text-xs text-muted-foreground">{topic.name}</p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-xs flex-shrink-0",
              config.color,
              config.bg,
              config.border,
            )}
          >
            {topic.relevance === "critical" && (
              <Flame className="w-3 h-3 mr-1" />
            )}
            {config.label}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
          {topic.description}
        </p>

        {/* Sample Angles */}
        <div className="mb-4 flex-1">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">
            이런 질문이 나옵니다
          </p>
          <ul className="space-y-1">
            {topic.sampleAngles.slice(0, 3).map((angle, i) => (
              <li
                key={i}
                className="flex items-start gap-1.5 text-xs text-foreground/70"
              >
                <span className="w-1 h-1 rounded-full bg-gold/60 mt-1.5 flex-shrink-0" />
                <span className="line-clamp-1">{angle}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border/30">
          <div className="flex flex-wrap gap-1">
            {topic.applicableTypes.map((type) => (
              <span
                key={type}
                className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
              >
                {INTERVIEW_TYPE_LABELS[type] || type}
              </span>
            ))}
          </div>
          <Link
            href={`/search?q=${encodeURIComponent(topic.chipQuery)}&trend_topic=${topic.id}`}
          >
            <Button
              size="sm"
              variant="ghost"
              className="text-xs gap-1 h-7 px-2"
            >
              <Sparkles className="w-3 h-3" />
              연습
            </Button>
          </Link>
        </div>
      </Card>
    </motion.div>
  );
}

export default function TrendsPage() {
  const [filter, setFilter] = useState<FilterType>("all");
  const allTopics = getTopicsSorted();

  const filteredTopics =
    filter === "all"
      ? allTopics
      : allTopics.filter((t) => t.relevance === filter);

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "전체" },
    { key: "critical", label: "핵심" },
    { key: "high", label: "주요" },
    { key: "medium", label: "관련" },
  ];

  return (
    <main className="min-h-screen flex flex-col grain">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-navy/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full px-4 md:px-6 py-2 md:py-4">
        <nav className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1 group">
            <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg flex items-center justify-center overflow-hidden">
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
              className="h-4 md:h-5 w-auto object-contain"
              priority
            />
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="w-4 h-4" />
              홈으로
            </Button>
          </Link>
        </nav>
      </header>

      {/* Content */}
      <div className="flex-1 px-4 md:px-6 pb-12 pt-8 md:pt-12">
        <div className="max-w-5xl mx-auto">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 md:mb-10"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-amber-500" />
              <h1 className="font-display text-2xl md:text-3xl font-semibold">
                기술면접 트렌드
              </h1>
              <Badge variant="outline" className="text-xs">
                2026 Q1
              </Badge>
            </div>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
              최신 기술 트렌드를 반영한 면접 질문으로 연습하세요. AI가 각 트렌드
              토픽에 특화된 심층 질문을 생성합니다.
            </p>
          </motion.div>

          {/* Filter */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-2 mb-6"
          >
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm transition-colors",
                  filter === f.key
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
            <span className="text-xs text-muted-foreground ml-2">
              {filteredTopics.length}개 토픽
            </span>
          </motion.div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTopics.map((topic, index) => (
              <TrendTopicCard key={topic.id} topic={topic} index={index} />
            ))}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-10 text-center"
          >
            <Link href="/">
              <Button size="lg" className="bg-navy hover:bg-navy-light gap-2">
                면접 시작하기
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
