"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  Heart,
  Archive,
  ArrowRight,
  Settings,
  Upload,
  X,
  FileText,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import logoImage from "@/assets/images/logo.png";
import logoTextImage from "@/assets/images/logo-text.png";
import {
  isLoggedIn,
  getCurrentUser,
  signOut,
  getLastSelectedTeamSpaceApi,
  getAccessToken,
} from "@/lib/api";
import { TeamSpaceSelector } from "@/components/TeamSpaceSelector";
import { TeamSpaceIntro } from "@/components/TeamSpaceIntro";
import { validateInterviewInput } from "@/lib/validation";

const SAMPLE_PROMPTS = [
  "프론트엔드 3년차 개발자를 위한 기술면접",
  "백엔드 신입 개발자 면접 준비",
  "React와 TypeScript 심화 면접",
  "CS 기초 지식 점검",
];

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [user, setUser] = useState<{ nickname: string | null } | null>(null);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [currentTeamSpaceId, setCurrentTeamSpaceId] = useState<string | null>(
    null,
  );
  const [currentTeamSpaceRole, setCurrentTeamSpaceRole] = useState<
    "owner" | "member" | null
  >(null);
  const [inputWarning, setInputWarning] = useState<string | null>(null);

  useEffect(() => {
    // 로그인 상태 확인 후 마지막 선택한 팀스페이스 불러오기
    const loadLastSelectedTeamSpace = async () => {
      if (isLoggedIn()) {
        try {
          const { lastSelectedTeamSpaceId } =
            await getLastSelectedTeamSpaceApi();
          if (lastSelectedTeamSpaceId) {
            setCurrentTeamSpaceId(lastSelectedTeamSpaceId);
            localStorage.setItem("currentTeamSpaceId", lastSelectedTeamSpaceId);
          } else {
            // 서버에 저장된 값이 없으면 localStorage 확인
            const storedTeamSpaceId =
              localStorage.getItem("currentTeamSpaceId");
            if (storedTeamSpaceId) {
              setCurrentTeamSpaceId(storedTeamSpaceId);
            }
          }
        } catch {
          // API 실패 시 localStorage에서 로드
          const storedTeamSpaceId = localStorage.getItem("currentTeamSpaceId");
          if (storedTeamSpaceId) {
            setCurrentTeamSpaceId(storedTeamSpaceId);
          }
        }
      } else {
        // 로그인하지 않은 경우 localStorage에서만 로드
        const storedTeamSpaceId = localStorage.getItem("currentTeamSpaceId");
        if (storedTeamSpaceId) {
          setCurrentTeamSpaceId(storedTeamSpaceId);
        }
      }
    };

    loadLastSelectedTeamSpace();

    // storage 이벤트 리스너 추가 (다른 탭에서 변경 시 동기화)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "currentTeamSpaceId") {
        setCurrentTeamSpaceId(e.newValue);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // 팀스페이스 ID가 변경될 때마다 role 확인
  useEffect(() => {
    const loadTeamSpaceRole = async () => {
      if (currentTeamSpaceId && isLoggedIn()) {
        try {
          const { getTeamSpaceByIdApi } = await import("@/lib/api");
          const response = await getTeamSpaceByIdApi(currentTeamSpaceId);
          setCurrentTeamSpaceRole(response.teamSpace.role);
        } catch {
          setCurrentTeamSpaceRole(null);
        }
      } else {
        setCurrentTeamSpaceRole(null);
      }
    };
    loadTeamSpaceRole();
  }, [currentTeamSpaceId]);

  const handleTeamSpaceSelect = (teamSpaceId: string | null) => {
    setCurrentTeamSpaceId(teamSpaceId);
    // localStorage에 저장하여 전역적으로 사용
    if (teamSpaceId) {
      localStorage.setItem("currentTeamSpaceId", teamSpaceId);
    } else {
      localStorage.removeItem("currentTeamSpaceId");
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      if (isLoggedIn()) {
        try {
          const currentUser = await getCurrentUser();
          setUser(currentUser);
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoadingUser(false);
    };
    loadUser();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      console.error("로그아웃 실패:", error);
    }
  };

  const MAX_FILES = 3;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      const isPdf = file.type === "application/pdf";
      const isImage = file.type.startsWith("image/");
      return isPdf || isImage;
    });

    if (validFiles.length !== files.length) {
      alert("PDF 또는 이미지 파일만 업로드 가능합니다.");
    }

    // 현재 파일 수 + 새 파일 수가 최대치를 초과하는지 확인
    const currentCount = referenceFiles.length;
    const availableSlots = MAX_FILES - currentCount;

    if (validFiles.length > availableSlots) {
      alert(`레퍼런스는 최대 ${MAX_FILES}개까지 첨부할 수 있습니다.`);
    }

    const filesToAdd = validFiles.slice(0, availableSlots);
    if (filesToAdd.length > 0) {
      setReferenceFiles((prev) => [...prev, ...filesToAdd]);
    }

    // input 초기화 (같은 파일 다시 선택 가능하게)
    e.target.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setReferenceFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // 파일 프리뷰 URL 생성 (이미지 파일용)
  const filePreviews = useMemo(() => {
    return referenceFiles.map((file) => {
      if (file.type.startsWith("image/")) {
        return URL.createObjectURL(file);
      }
      return null;
    });
  }, [referenceFiles]);

  // 컴포넌트 언마운트 시 URL 정리
  useEffect(() => {
    return () => {
      filePreviews.forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [filePreviews]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 자식 요소로 이동하는 경우 무시
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter((file) => {
      const isPdf = file.type === "application/pdf";
      const isImage = file.type.startsWith("image/");
      return isPdf || isImage;
    });

    if (validFiles.length === 0) {
      alert("PDF 또는 이미지 파일만 업로드 가능합니다.");
      return;
    }

    if (validFiles.length !== files.length) {
      alert(
        `${files.length - validFiles.length}개의 파일이 지원되지 않는 형식입니다. PDF 또는 이미지 파일만 업로드 가능합니다.`,
      );
    }

    // 현재 파일 수 + 새 파일 수가 최대치를 초과하는지 확인
    const currentCount = referenceFiles.length;
    const availableSlots = MAX_FILES - currentCount;

    if (validFiles.length > availableSlots) {
      alert(`레퍼런스는 최대 ${MAX_FILES}개까지 첨부할 수 있습니다.`);
    }

    const filesToAdd = validFiles.slice(0, availableSlots);
    if (filesToAdd.length > 0) {
      setReferenceFiles((prev) => [...prev, ...filesToAdd]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // 이미 진행 중이면 무시
    if (isUploading) return;

    // 입력 유효성 검증
    const validation = validateInterviewInput(query);
    if (!validation.isValid) {
      setInputWarning(validation.suggestion || "유효한 검색어를 입력해주세요.");
      return;
    }

    // 유효한 입력이면 경고 제거
    setInputWarning(null);
    setIsUploading(true);

    try {
      // 레퍼런스 파일이 있으면 먼저 업로드 (로그인 필요)
      const referenceData: Array<{ url: string; type: string }> = [];
      if (referenceFiles.length > 0) {
        if (!isLoggedIn()) {
          alert("레퍼런스 파일을 업로드하려면 로그인이 필요합니다.");
          router.push("/auth");
          setIsUploading(false);
          return;
        }

        const token = getAccessToken();
        if (!token) {
          alert("로그인이 필요합니다.");
          router.push("/auth");
          setIsUploading(false);
          return;
        }

        for (const file of referenceFiles) {
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("/api/references/upload", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          if (response.ok) {
            const data = await response.json();
            referenceData.push({ url: data.url, type: data.type });
          } else {
            const errorText = await response.text();
            let errorData: { error?: string } = {};
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { error: errorText || "알 수 없는 오류" };
            }
            console.error("파일 업로드 실패:", {
              status: response.status,
              error: errorData,
              file: file.name,
            });
            alert(
              `파일 업로드 실패 (${file.name}): ${
                errorData.error || "알 수 없는 오류"
              }`,
            );
            // 업로드 실패 시 중단하지 않고 계속 진행 (다른 파일은 업로드 시도)
          }
        }
      }

      // 검색 페이지로 이동 (레퍼런스 URL 전달)
      const params = new URLSearchParams({
        q: query.trim(),
      });
      if (referenceData.length > 0) {
        // URL과 타입을 함께 인코딩하여 전달
        const referencesParam = referenceData
          .map((ref) => `${encodeURIComponent(ref.url)}::${ref.type}`)
          .join(",");
        params.append("references", referencesParam);
        console.log("레퍼런스와 함께 검색 페이지로 이동:", {
          query: query.trim(),
          referenceCount: referenceData.length,
          referencesParam,
        });
      } else {
        console.log("레퍼런스 없이 검색 페이지로 이동:", query.trim());
      }
      router.push(`/search?${params.toString()}`);
    } catch (error) {
      console.error("제출 실패:", error);
      alert("레퍼런스 업로드에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSampleClick = (sample: string) => {
    // 이미 진행 중이면 무시
    if (isUploading) return;

    setInputWarning(null);
    setIsUploading(true);
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
          <Link href="/" className="flex items-center gap-1 group">
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
          <div className="flex items-center gap-2">
            {user && (
              <TeamSpaceSelector
                currentTeamSpaceId={currentTeamSpaceId}
                onSelect={handleTeamSpaceSelect}
              />
            )}
            {!isLoadingUser && (
              <>
                {user ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    로그아웃
                  </Button>
                ) : (
                  <Link href="/auth">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      로그인
                    </Button>
                  </Link>
                )}
              </>
            )}
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
            <div
              className={`relative bg-card rounded-2xl shadow-sm border border-border/50 transition-all duration-300 hover:shadow-md ${
                isDragging
                  ? "ring-2 ring-gold ring-offset-2 ring-offset-background"
                  : ""
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {/* Drag overlay */}
              {isDragging && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-gold/10 rounded-2xl border-2 border-dashed border-gold pointer-events-none">
                  <div className="flex flex-col items-center gap-2 text-gold">
                    <Upload className="w-8 h-8" />
                    <span className="font-medium">파일을 여기에 놓으세요</span>
                    <span className="text-sm text-gold/70">
                      PDF, 이미지 · 최대 {MAX_FILES}개
                    </span>
                  </div>
                </div>
              )}
              <div className="flex items-start px-5 py-4 gap-4">
                <Search className="w-5 h-5 mt-1 text-muted-foreground flex-shrink-0" />
                <textarea
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (inputWarning) setInputWarning(null);
                  }}
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
                      200,
                    )}px`;
                  }}
                  aria-label="면접 유형 검색"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!query.trim() || isUploading}
                  className="bg-navy hover:bg-navy-light text-primary-foreground rounded-xl px-4 disabled:opacity-50 flex-shrink-0 mt-1"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Reference Files Preview */}
              {referenceFiles.length > 0 && (
                <div className="px-5 pb-4 border-t border-border/50">
                  <div className="flex items-center gap-3 pt-3">
                    {/* Preview cards */}
                    <div className="flex items-center gap-2">
                      {referenceFiles.map((file, index) => (
                        <div key={index} className="relative group">
                          {/* Preview Card */}
                          <div className="w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted/30">
                            {file.type === "application/pdf" ? (
                              // PDF Preview with filename
                              <div className="w-full h-full flex flex-col items-center justify-center p-1.5">
                                <FileText className="w-7 h-7 text-red-400 mb-1.5 flex-shrink-0" />
                                <span className="text-[10px] text-muted-foreground truncate w-full text-center px-1 leading-tight">
                                  {file.name.replace(/\.pdf$/i, "")}
                                </span>
                              </div>
                            ) : (
                              // Image Preview
                              filePreviews[index] && (
                                <Image
                                  src={filePreviews[index]}
                                  alt={file.name}
                                  width={80}
                                  height={80}
                                  className="w-full h-full object-cover"
                                />
                              )
                            )}
                          </div>

                          {/* Hover overlay with X button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(index)}
                            className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-foreground/80 text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-foreground shadow-md"
                            aria-label={`${file.name} 삭제`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      {/* Add more files button (only show if under limit) */}
                      {referenceFiles.length < MAX_FILES && (
                        <label
                          htmlFor="reference-upload"
                          className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-gold/50 bg-muted/30 hover:bg-gold/5 flex flex-col items-center justify-center cursor-pointer transition-colors"
                        >
                          <Upload className="w-4 h-4 text-muted-foreground mb-1" />
                          <span className="text-[10px] text-muted-foreground">
                            추가
                          </span>
                        </label>
                      )}
                    </div>

                    <input
                      id="reference-upload"
                      type="file"
                      accept=".pdf,image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    {/* File count hint */}
                    <div className="ml-auto flex items-center">
                      <span className="text-sm text-muted-foreground">
                        {referenceFiles.length}/{MAX_FILES}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Reference Files Upload (when no files) */}
              {referenceFiles.length === 0 && (
                <div className="px-5 pb-3 border-t border-border/50">
                  <div className="flex items-center gap-2 pt-3">
                    <label
                      htmlFor="reference-upload-empty"
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      <span>
                        레퍼런스 첨부{" "}
                        <span className="text-muted-foreground/60">
                          (PDF, 이미지 · 최대 {MAX_FILES}개)
                        </span>
                      </span>
                    </label>
                    <input
                      id="reference-upload-empty"
                      type="file"
                      accept=".pdf,image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                </div>
              )}

            </div>
          </form>

          {/* Input Warning */}
          {inputWarning && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm"
            >
              <p>{inputWarning}</p>
            </motion.div>
          )}

          {/* Sample Prompts */}
          <div className="mt-8">
            <p className="text-sm text-muted-foreground mb-3 text-center">
              클릭해서 바로 시작해보세요
            </p>
            <div className="grid grid-cols-2 gap-3">
              {SAMPLE_PROMPTS.map((sample, index) => (
                <button
                  key={index}
                  type="button"
                  disabled={isUploading}
                  onClick={() => handleSampleClick(sample)}
                  className="group text-left px-4 py-3 rounded-2xl bg-card border border-border/50 hover:border-gold/30 hover:bg-gold/5 text-sm text-foreground/70 hover:text-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold/60 group-hover:bg-gold transition-colors" />
                    {sample}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 flex items-center gap-6 text-sm text-muted-foreground"
        >
          <Link
            href="/archive"
            className="flex items-center gap-2 hover:text-foreground transition-colors group"
          >
            <Archive className="w-4 h-4 group-hover:text-gold transition-colors" />
            아카이브
          </Link>
          <span className="text-border">|</span>
          <Link
            href="/favorites"
            className="flex items-center gap-2 hover:text-foreground transition-colors group"
          >
            <Heart className="w-4 h-4 group-hover:text-red-500 transition-colors" />
            찜한 질문
          </Link>
          {user && currentTeamSpaceId && currentTeamSpaceRole === "owner" && (
            <>
              <span className="text-border">|</span>
              <Link
                href={`/team-spaces/${currentTeamSpaceId}/manage`}
                className="flex items-center gap-2 hover:text-foreground transition-colors group"
              >
                <Settings className="w-4 h-4 group-hover:text-gold transition-colors" />
                팀스페이스 관리
              </Link>
            </>
          )}
        </motion.div>
      </div>

      {/* Team Space Intro */}
      {user && <TeamSpaceIntro />}
    </main>
  );
}
