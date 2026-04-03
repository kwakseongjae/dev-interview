"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ExternalLink,
  ArrowLeft,
  Search,
  BookOpen,
  Palette,
  Server,
  Smartphone,
  BarChart3,
  Bot,
  Cloud,
  RefreshCw,
  Shield,
  Layers,
  Puzzle,
  Building2,
  Landmark,
  ShoppingCart,
  MessageCircle,
  UtensilsCrossed,
  Car,
  Music,
  Gamepad2,
  MapPin,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Image from "next/image";
import logoImage from "@/assets/images/logo.png";
import logoTextImage from "@/assets/images/logo-text.png";
import { CompanyLogo } from "@/components/CompanyLogo";
import {
  ALL_TECH_BLOGS,
  DOMAIN_LABELS,
  COMPANY_TYPE_LABELS,
  MEDIUM_ENGINEERING_PUBLICATIONS,
  getBlogCompanySlug,
  type TechDomain,
  type CompanyType,
  type TechBlog,
} from "@/data/tech-blogs";
import type { LucideIcon } from "lucide-react";

const DOMAIN_ICONS: Record<TechDomain, LucideIcon> = {
  frontend: Palette,
  backend: Server,
  mobile: Smartphone,
  data: BarChart3,
  "ai-ml": Bot,
  infrastructure: Cloud,
  devops: RefreshCw,
  security: Shield,
  "design-system": Layers,
  "full-stack": Server,
  platform: Puzzle,
  blockchain: Landmark,
};

const COMPANY_TYPE_ICONS: Record<CompanyType, LucideIcon> = {
  "big-tech": Building2,
  fintech: Landmark,
  "e-commerce": ShoppingCart,
  social: MessageCircle,
  foodtech: UtensilsCrossed,
  mobility: Car,
  entertainment: Music,
  cloud: Cloud,
  gaming: Gamepad2,
  proptech: MapPin,
  "developer-tools": Puzzle,
  enterprise: Building2,
};

const DOMAIN_FILTERS: TechDomain[] = [
  "frontend",
  "backend",
  "mobile",
  "data",
  "ai-ml",
  "infrastructure",
  "devops",
  "security",
  "design-system",
  "platform",
];

const COMPANY_TYPE_FILTERS: CompanyType[] = [
  "big-tech",
  "fintech",
  "e-commerce",
  "social",
  "foodtech",
  "mobility",
  "entertainment",
  "cloud",
  "gaming",
];

// Company slug resolution uses getBlogCompanySlug from @/data/tech-blogs

export default function TechBlogsPage() {
  const [selectedDomain, setSelectedDomain] = useState<TechDomain | null>(null);
  const [selectedType, setSelectedType] = useState<CompanyType | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<"all" | "kr" | "intl">(
    "all",
  );
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBlogs = useMemo(() => {
    let blogs: TechBlog[] = ALL_TECH_BLOGS;

    if (selectedRegion !== "all") {
      blogs = blogs.filter((b) => b.region === selectedRegion);
    }
    if (selectedDomain) {
      blogs = blogs.filter((b) => b.domains.includes(selectedDomain));
    }
    if (selectedType) {
      blogs = blogs.filter((b) => b.companyType === selectedType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      blogs = blogs.filter(
        (b) =>
          b.company.toLowerCase().includes(q) ||
          (b.companyKo && b.companyKo.includes(q)) ||
          b.description.toLowerCase().includes(q),
      );
    }

    return blogs;
  }, [selectedDomain, selectedType, selectedRegion, searchQuery]);

  const krBlogs = filteredBlogs.filter((b) => b.region === "kr");
  const intlBlogs = filteredBlogs.filter((b) => b.region === "intl");

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <Image src={logoImage} alt="" width={28} height={28} />
              <Image
                src={logoTextImage}
                alt="mocha bun"
                width={65}
                height={20}
                className="hidden sm:block"
              />
            </Link>
            <span className="text-border">/</span>
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span className="font-display text-sm font-semibold">
                Tech Blog Archive
              </span>
            </div>
          </div>
          <Link
            href="/case-studies"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            기업 사례 면접
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            Tech Blog Archive
          </h1>
          <p className="text-muted-foreground text-lg">
            면접 준비에 도움이 되는 국내외 주요 기업의 엔지니어링 블로그를
            키워드별로 모았습니다.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {ALL_TECH_BLOGS.length}개 블로그 · 국내{" "}
            {ALL_TECH_BLOGS.filter((b) => b.region === "kr").length}개 · 해외{" "}
            {ALL_TECH_BLOGS.filter((b) => b.region === "intl").length}개
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4 mb-8"
        >
          {/* Search + Region */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="회사명 또는 키워드로 검색..."
                className="pl-10"
              />
            </div>
            <div className="flex gap-1.5">
              {(
                [
                  { key: "all", label: "전체" },
                  { key: "kr", label: "국내" },
                  { key: "intl", label: "해외" },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSelectedRegion(key)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedRegion === key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Domain Filter */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              기술 분야
            </p>
            <div className="flex flex-wrap gap-2">
              {DOMAIN_FILTERS.map((key) => {
                const Icon = DOMAIN_ICONS[key];
                return (
                  <button
                    key={key}
                    onClick={() =>
                      setSelectedDomain(selectedDomain === key ? null : key)
                    }
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      selectedDomain === key
                        ? "border-emerald-500/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 shadow-sm"
                        : "border-border/50 text-muted-foreground hover:border-border hover:bg-muted/50"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {DOMAIN_LABELS[key]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Company Type Filter */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              기업 유형
            </p>
            <div className="flex flex-wrap gap-2">
              {COMPANY_TYPE_FILTERS.map((key) => {
                const Icon = COMPANY_TYPE_ICONS[key];
                return (
                  <button
                    key={key}
                    onClick={() =>
                      setSelectedType(selectedType === key ? null : key)
                    }
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      selectedType === key
                        ? "border-blue-500/50 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 shadow-sm"
                        : "border-border/50 text-muted-foreground hover:border-border hover:bg-muted/50"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {COMPANY_TYPE_LABELS[key]}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Results Count */}
        <p className="text-sm text-muted-foreground mb-6">
          총{" "}
          <span className="font-medium text-foreground">
            {filteredBlogs.length}
          </span>
          개 블로그
          {selectedDomain && <span> · {DOMAIN_LABELS[selectedDomain]}</span>}
          {selectedType && <span> · {COMPANY_TYPE_LABELS[selectedType]}</span>}
        </p>

        {/* Blog Grid */}
        {filteredBlogs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            검색 결과가 없습니다. 다른 필터를 시도해보세요.
          </div>
        ) : (
          <div className="space-y-10">
            {/* Korean Blogs */}
            {krBlogs.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  국내 기업 블로그
                  <span className="text-sm font-normal text-muted-foreground">
                    ({krBlogs.length})
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {krBlogs.map((blog) => (
                    <BlogCard key={blog.url} blog={blog} />
                  ))}
                </div>
              </section>
            )}

            {/* International Blogs */}
            {intlBlogs.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-indigo-500" />
                  해외 기업 블로그
                  <span className="text-sm font-normal text-muted-foreground">
                    ({intlBlogs.length})
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {intlBlogs.map((blog) => (
                    <BlogCard key={blog.url} blog={blog} />
                  ))}
                </div>
              </section>
            )}

            {/* Medium Publications */}
            {!selectedDomain && !selectedType && searchQuery === "" && (
              <section>
                <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/companies/medium.png"
                    alt=""
                    className="w-5 h-5 object-contain"
                  />
                  Medium Engineering Publications
                  <span className="text-sm font-normal text-muted-foreground">
                    ({MEDIUM_ENGINEERING_PUBLICATIONS.length})
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {MEDIUM_ENGINEERING_PUBLICATIONS.map((pub) => (
                    <a
                      key={pub.url}
                      href={pub.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group rounded-xl border border-border/50 bg-card p-4 hover:border-emerald-300/50 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="/companies/medium.png"
                            alt=""
                            className="w-[18px] h-[18px] object-contain"
                          />
                        </div>
                        <span className="font-medium text-sm group-hover:text-emerald-600 transition-colors">
                          {pub.name}
                        </span>
                        <ExternalLink className="w-3 h-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {pub.focus}
                      </p>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function BlogCard({ blog }: { blog: TechBlog }) {
  const slug = getBlogCompanySlug(blog.company);

  return (
    <a
      href={blog.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group rounded-xl border border-border/50 bg-card p-4 hover:border-emerald-300/50 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden flex-shrink-0">
            <CompanyLogo companySlug={slug} size={18} />
          </div>
          <span className="font-medium text-sm group-hover:text-emerald-600 transition-colors">
            {blog.companyKo
              ? `${blog.companyKo} (${blog.company})`
              : blog.company}
          </span>
        </div>
        <ExternalLink className="w-3 h-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1.5" />
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
        {blog.description}
      </p>
      <div className="flex flex-wrap gap-1">
        {blog.domains.slice(0, 3).map((domain) => (
          <Badge
            key={domain}
            variant="secondary"
            className="text-[10px] px-1.5 py-0 h-4"
          >
            {DOMAIN_LABELS[domain as TechDomain] ?? domain}
          </Badge>
        ))}
        {blog.region === "kr" && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 h-4 border-blue-200 text-blue-600"
          >
            KR
          </Badge>
        )}
      </div>
    </a>
  );
}
