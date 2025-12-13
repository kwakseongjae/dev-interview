"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  Clock,
  Heart,
  Archive,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const SAMPLE_PROMPTS = [
  "프론트엔드 3년차 개발자를 위한 기술면접",
  "백엔드 신입 개발자 면접 준비",
  "React와 TypeScript 심화 면접",
  "CS 기초 지식 점검",
];

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleSampleClick = (sample: string) => {
    setQuery(sample);
    router.push(`/search?q=${encodeURIComponent(sample)}`);
  };

  return (
    <main className="min-h-screen flex flex-col grain">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-navy/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full px-6 py-4">
        <nav className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-gold" />
            </div>
            <span className="font-display text-xl font-semibold tracking-tight">
              DevInterview
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/archive">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                <Archive className="w-4 h-4 mr-2" />
                아카이브
              </Button>
            </Link>
            <Link href="/favorites">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                <Heart className="w-4 h-4 mr-2" />
                찜한 질문
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-semibold text-foreground mb-4 tracking-tight">
            기술면접, <span className="text-gold">AI</span>와 함께
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            맞춤형 질문 생성부터 실전 모의면접까지.
            <br className="hidden sm:block" />
            당신의 기술면접 준비를 도와드립니다.
          </p>
        </motion.div>

        {/* Search Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="w-full max-w-2xl"
        >
          <form onSubmit={handleSubmit}>
            <div className="relative bg-card rounded-2xl shadow-elegant transition-all duration-300 hover:shadow-lg">
              <div className="flex items-start px-5 py-4 gap-4">
                <Search className="w-5 h-5 mt-1 text-muted-foreground flex-shrink-0" />
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (query.trim()) {
                        handleSubmit(e);
                      }
                    }
                  }}
                  placeholder="어떤 면접을 준비하고 계신가요?"
                  className="flex-1 bg-transparent text-lg outline-none focus:outline-none focus-visible:outline-none placeholder:text-muted-foreground/60 resize-none min-h-[24px] max-h-[200px] overflow-y-auto"
                  rows={1}
                  style={{
                    height: "auto",
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = `${Math.min(
                      target.scrollHeight,
                      200
                    )}px`;
                  }}
                  aria-label="면접 유형 검색"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!query.trim()}
                  className="bg-navy hover:bg-navy-light text-primary-foreground rounded-xl px-4 disabled:opacity-50 flex-shrink-0 mt-1"
                >
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Sample Prompts */}
              <div className="px-5 pb-4 flex flex-wrap gap-2">
                {SAMPLE_PROMPTS.map((sample, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSampleClick(sample)}
                    className="text-sm px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 flex items-center gap-6 text-sm text-muted-foreground"
        >
          <Link
            href="/archive"
            className="flex items-center gap-2 hover:text-foreground transition-colors group"
          >
            <Clock className="w-4 h-4 group-hover:text-gold transition-colors" />
            최근 면접 기록
          </Link>
          <span className="text-border">|</span>
          <Link
            href="/favorites"
            className="flex items-center gap-2 hover:text-foreground transition-colors group"
          >
            <Heart className="w-4 h-4 group-hover:text-gold transition-colors" />
            찜한 질문
          </Link>
          <span className="text-border">|</span>
          <Link
            href="/archive"
            className="flex items-center gap-2 hover:text-foreground transition-colors group"
          >
            <Archive className="w-4 h-4 group-hover:text-gold transition-colors" />
            아카이브
          </Link>
        </motion.div>
      </div>
    </main>
  );
}
