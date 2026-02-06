"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ArrowLeft,
  Loader2,
  FileText,
  Video,
  GraduationCap,
  Building2,
  Filter,
  X,
  Eye,
  MessageSquare,
  ChevronDown,
  Check,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Image from "next/image";
import logoImage from "@/assets/images/logo.png";
import logoTextImage from "@/assets/images/logo-text.png";
import {
  getCaseStudiesApi,
  getCaseStudyFiltersApi,
  type CaseStudiesResponse,
} from "@/lib/api";
import type { CaseStudyListItem, CaseStudyFilters } from "@/types/case-study";
import { DIFFICULTY_CONFIG } from "@/types/case-study";
import { CompanyLogo } from "@/components/CompanyLogo";

const SOURCE_TYPE_ICONS = {
  blog: FileText,
  conference: Video,
  paper: GraduationCap,
} as const;

const SOURCE_TYPE_LABELS = {
  blog: "블로그",
  conference: "컨퍼런스",
  paper: "논문",
} as const;

const SORT_OPTIONS = [
  { value: "recent", label: "최신순" },
  { value: "popular", label: "인기순" },
  { value: "difficulty", label: "난이도순" },
] as const;

function SortDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedLabel =
    SORT_OPTIONS.find((opt) => opt.value === value)?.label ?? "정렬";

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="h-10 px-3 pr-8 rounded-md border border-input bg-background text-sm cursor-pointer hover:bg-muted/50 transition-colors inline-flex items-center gap-2 focus:outline-none"
      >
        {selectedLabel}
        <ChevronDown
          className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1 z-50 min-w-[140px] rounded-lg border border-border bg-popover p-1 shadow-lg"
          >
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors focus:outline-none ${
                  value === opt.value
                    ? "bg-gold/10 text-gold font-medium"
                    : "text-foreground hover:bg-muted/60"
                }`}
              >
                <Check
                  className={`w-3.5 h-3.5 flex-shrink-0 ${
                    value === opt.value ? "opacity-100 text-gold" : "opacity-0"
                  }`}
                />
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CaseStudiesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gold" />
        </div>
      }
    >
      <CaseStudiesContent />
    </Suspense>
  );
}

function CaseStudiesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [caseStudies, setCaseStudies] = useState<CaseStudyListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [filterOptions, setFilterOptions] = useState<{
    companies: { slug: string; name: string }[];
    domains: string[];
  }>({ companies: [], domains: [] });
  const [showFilters, setShowFilters] = useState(false);

  // Filters from URL (memoized to avoid re-renders)
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const currentSort =
    (searchParams.get("sort") as CaseStudyFilters["sort"]) || "recent";
  const currentSearch = searchParams.get("search") || "";
  const companiesParam = searchParams.get("companies") || "";
  const domainsParam = searchParams.get("domains") || "";
  const difficultyParam = searchParams.get("difficulty") || "";
  const sourceTypeParam = searchParams.get("sourceType") || "";
  const currentCompanies = useMemo(
    () => companiesParam.split(",").filter(Boolean),
    [companiesParam],
  );
  const currentDomains = useMemo(
    () => domainsParam.split(",").filter(Boolean),
    [domainsParam],
  );
  const currentDifficulty = useMemo(
    () => difficultyParam.split(",").filter(Boolean),
    [difficultyParam],
  );
  const currentSourceType = useMemo(
    () => sourceTypeParam.split(",").filter(Boolean),
    [sourceTypeParam],
  );

  const hasActiveFilters =
    currentCompanies.length > 0 ||
    currentDomains.length > 0 ||
    currentDifficulty.length > 0 ||
    currentSourceType.length > 0;

  // Update URL with new filters
  const updateFilters = useCallback(
    (updates: Partial<CaseStudyFilters> & { page?: number }) => {
      const params = new URLSearchParams();

      const search =
        updates.search !== undefined ? updates.search : currentSearch;
      const companies =
        updates.companies !== undefined ? updates.companies : currentCompanies;
      const domains =
        updates.domains !== undefined ? updates.domains : currentDomains;
      const difficulty =
        updates.difficulty !== undefined
          ? updates.difficulty
          : currentDifficulty;
      const sourceType =
        updates.sourceType !== undefined
          ? updates.sourceType
          : currentSourceType;
      const sort = updates.sort || currentSort;
      const page = updates.page || 1;

      if (search) params.set("search", search);
      if (companies.length) params.set("companies", companies.join(","));
      if (domains.length) params.set("domains", domains.join(","));
      if (difficulty.length) params.set("difficulty", difficulty.join(","));
      if (sourceType.length) params.set("sourceType", sourceType.join(","));
      if (sort !== "recent") params.set("sort", sort);
      if (page > 1) params.set("page", String(page));

      const queryString = params.toString();
      router.push(`/case-studies${queryString ? `?${queryString}` : ""}`, {
        scroll: false,
      });
    },
    [
      router,
      currentSearch,
      currentCompanies,
      currentDomains,
      currentDifficulty,
      currentSourceType,
      currentSort,
    ],
  );

  // Fetch filter options
  useEffect(() => {
    getCaseStudyFiltersApi().then(setFilterOptions).catch(console.error);
  }, []);

  // Fetch case studies
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const result: CaseStudiesResponse = await getCaseStudiesApi(
          {
            search: currentSearch,
            companies: currentCompanies,
            domains: currentDomains,
            difficulty: currentDifficulty,
            sourceType: currentSourceType,
            sort: currentSort,
          },
          currentPage,
          12,
        );
        setCaseStudies(result.caseStudies);
        setTotalPages(result.totalPages);
        setTotal(result.total);
      } catch (error) {
        console.error("케이스 스터디 로드 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [
    currentSearch,
    currentCompanies,
    currentDomains,
    currentDifficulty,
    currentSourceType,
    currentSort,
    currentPage,
  ]);

  // Toggle array filter
  const toggleFilter = (
    key: "companies" | "domains" | "difficulty" | "sourceType",
    value: string,
  ) => {
    const current =
      key === "companies"
        ? currentCompanies
        : key === "domains"
          ? currentDomains
          : key === "difficulty"
            ? currentDifficulty
            : currentSourceType;
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    updateFilters({ [key]: updated });
  };

  const clearAllFilters = () => {
    updateFilters({
      search: "",
      companies: [],
      domains: [],
      difficulty: [],
      sourceType: [],
      sort: "recent",
    });
  };

  // Search handler
  const [searchInput, setSearchInput] = useState(currentSearch);
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchInput });
  };

  return (
    <main className="min-h-screen grain">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-navy/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full border-b border-border/50">
        <nav className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>홈으로</span>
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
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            케이스 스터디
          </h1>
          <p className="text-muted-foreground text-lg">
            실제 기업의 기술 블로그와 컨퍼런스를 기반으로 한 고난도 면접을
            준비하세요.
          </p>
        </motion.div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex gap-3 flex-wrap">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 min-w-[240px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="케이스 스터디 검색..."
                  className="pl-10 pr-4"
                />
              </div>
            </form>

            {/* Sort */}
            <SortDropdown
              value={currentSort}
              onChange={(value) =>
                updateFilters({
                  sort: value as CaseStudyFilters["sort"],
                })
              }
            />

            {/* Filter Toggle */}
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2 h-10"
            >
              <Filter className="w-4 h-4" />
              필터
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 text-xs px-1.5">
                  {currentCompanies.length +
                    currentDomains.length +
                    currentDifficulty.length +
                    currentSourceType.length}
                </Badge>
              )}
            </Button>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="gap-1 text-muted-foreground h-10"
              >
                <X className="w-4 h-4" />
                초기화
              </Button>
            )}
          </div>

          {/* Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Card className="p-4 space-y-4">
                  {/* Difficulty */}
                  <div>
                    <h3 className="text-sm font-medium mb-2">난이도</h3>
                    <div className="flex gap-2 flex-wrap">
                      {(["A", "B", "C"] as const).map((d) => {
                        const config = DIFFICULTY_CONFIG[d];
                        const isActive = currentDifficulty.includes(d);
                        return (
                          <button
                            key={d}
                            onClick={() => toggleFilter("difficulty", d)}
                            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                              isActive
                                ? config.color + " font-medium"
                                : "border-border text-muted-foreground hover:border-foreground/30"
                            }`}
                          >
                            {config.label} ({config.description})
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Source Type */}
                  <div>
                    <h3 className="text-sm font-medium mb-2">소스 타입</h3>
                    <div className="flex gap-2 flex-wrap">
                      {(["blog", "conference", "paper"] as const).map((st) => {
                        const Icon = SOURCE_TYPE_ICONS[st];
                        const isActive = currentSourceType.includes(st);
                        return (
                          <button
                            key={st}
                            onClick={() => toggleFilter("sourceType", st)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                              isActive
                                ? "bg-navy text-white border-navy"
                                : "border-border text-muted-foreground hover:border-foreground/30"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {SOURCE_TYPE_LABELS[st]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Companies */}
                  {filterOptions.companies.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">기업</h3>
                      <div className="flex gap-2 flex-wrap">
                        {filterOptions.companies.map((company) => {
                          const isActive = currentCompanies.includes(
                            company.slug,
                          );
                          return (
                            <button
                              key={company.slug}
                              onClick={() =>
                                toggleFilter("companies", company.slug)
                              }
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                                isActive
                                  ? "bg-navy text-white border-navy"
                                  : "border-border text-muted-foreground hover:border-foreground/30"
                              }`}
                            >
                              <Building2 className="w-3.5 h-3.5" />
                              {company.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Domains */}
                  {filterOptions.domains.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">도메인</h3>
                      <div className="flex gap-2 flex-wrap">
                        {filterOptions.domains.map((domain) => {
                          const isActive = currentDomains.includes(domain);
                          return (
                            <button
                              key={domain}
                              onClick={() => toggleFilter("domains", domain)}
                              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                                isActive
                                  ? "bg-navy text-white border-navy"
                                  : "border-border text-muted-foreground hover:border-foreground/30"
                              }`}
                            >
                              {domain}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            총 <span className="font-medium text-foreground">{total}</span>개의
            케이스 스터디
          </p>
        </div>

        {/* Case Studies Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-5 animate-pulse">
                <div className="h-5 bg-muted rounded w-3/4 mb-3" />
                <div className="h-4 bg-muted rounded w-1/2 mb-4" />
                <div className="flex gap-2 mb-3">
                  <div className="h-6 bg-muted rounded w-16" />
                  <div className="h-6 bg-muted rounded w-20" />
                </div>
                <div className="h-4 bg-muted rounded w-1/3" />
              </Card>
            ))}
          </div>
        ) : caseStudies.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground text-lg mb-2">
              검색 결과가 없습니다
            </p>
            <p className="text-sm text-muted-foreground">
              다른 검색어나 필터를 시도해보세요
            </p>
          </Card>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {caseStudies.map((cs, index) => (
              <CaseStudyCard key={cs.id} caseStudy={cs} index={index} />
            ))}
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
              (pageNum) => (
                <Button
                  key={pageNum}
                  variant={pageNum === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilters({ page: pageNum })}
                >
                  {pageNum}
                </Button>
              ),
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function CaseStudyCard({
  caseStudy,
  index,
}: {
  caseStudy: CaseStudyListItem;
  index: number;
}) {
  const diffConfig = DIFFICULTY_CONFIG[caseStudy.difficulty];
  const SourceIcon = SOURCE_TYPE_ICONS[caseStudy.sourceType];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="h-full"
    >
      <Link href={`/case-studies/${caseStudy.slug}`} className="block h-full">
        <Card className="p-5 h-full flex flex-col hover:shadow-md hover:border-gold/30 transition-all group cursor-pointer">
          {/* Company & Source */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CompanyLogo companySlug={caseStudy.companySlug} size={18} />
              <span className="text-sm font-medium">
                {caseStudy.companyName}
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <SourceIcon className="w-3.5 h-3.5" />
              <span className="text-xs">
                {SOURCE_TYPE_LABELS[caseStudy.sourceType]}
              </span>
            </div>
          </div>

          {/* Title - 2줄 고정 높이로 카드 일관성 유지 */}
          <h3 className="font-display font-semibold text-base mb-3 line-clamp-2 min-h-[3rem] group-hover:text-gold transition-colors">
            {caseStudy.title}
          </h3>

          {/* Tags */}
          <div className="flex gap-1.5 flex-wrap mb-3">
            <Badge
              variant="outline"
              className={`text-xs border ${diffConfig.color}`}
            >
              {diffConfig.label}
            </Badge>
            {caseStudy.domains.slice(0, 2).map((domain) => (
              <Badge key={domain} variant="secondary" className="text-xs">
                {domain}
              </Badge>
            ))}
            {caseStudy.domains.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{caseStudy.domains.length - 2}
              </Badge>
            )}
          </div>

          {/* Technologies */}
          <div className="flex gap-1 flex-wrap mb-3 flex-1">
            {caseStudy.technologies.slice(0, 3).map((tech) => (
              <span
                key={tech}
                className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded h-fit"
              >
                {tech}
              </span>
            ))}
            {caseStudy.technologies.length > 3 && (
              <span className="text-xs text-muted-foreground h-fit">
                +{caseStudy.technologies.length - 3}
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border/50">
            {caseStudy.publishedAt && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(caseStudy.publishedAt).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "short",
                })}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {caseStudy.viewCount}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" />
              {caseStudy.interviewCount}회 면접
            </span>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
