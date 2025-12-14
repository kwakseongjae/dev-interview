"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Archive,
  ArrowLeft,
  Heart,
  Loader2,
  Play,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";

import type { FavoriteQuestion } from "@/types/interview";
import { getFavorites, removeFavorite } from "@/lib/storage";
import {
  getFavoritesApi,
  removeFavoriteApi,
  isLoggedIn,
  type ApiFavorite,
} from "@/lib/api";
import { SAMPLE_FAVORITES } from "@/data/dummy-sessions";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteQuestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [useApi, setUseApi] = useState(false);

  // API 데이터를 FavoriteQuestion 형태로 변환
  const convertApiFavorite = (apiFav: ApiFavorite): FavoriteQuestion => ({
    id: apiFav.id,
    questionId: apiFav.question_id,
    content: apiFav.content,
    hint: apiFav.hint || "",
    category: apiFav.category,
    savedAt: apiFav.created_at,
  });

  // 데이터 로드
  const loadFavorites = useCallback(async () => {
    setIsLoading(true);

    // 로그인 상태면 API 사용
    if (isLoggedIn()) {
      try {
        const response = await getFavoritesApi();
        const converted = response.favorites.map(convertApiFavorite);
        setFavorites(converted);
        setUseApi(true);
        setIsLoading(false);
        return;
      } catch (error) {
        console.error("API 호출 실패, 로컬 스토리지 폴백:", error);
      }
    }

    // 로컬 스토리지 사용 (비로그인 또는 API 실패)
    const storedFavorites = getFavorites();
    if (storedFavorites.length > 0) {
      setFavorites(storedFavorites);
    } else {
      // 데모용 샘플 데이터
      setFavorites(SAMPLE_FAVORITES);
    }
    setUseApi(false);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === favorites.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(favorites.map((f) => f.id)));
    }
  };

  const handleRemove = async (id: string, questionId: string) => {
    setIsRemoving(id);

    try {
      if (useApi) {
        // API로 삭제
        await removeFavoriteApi(questionId);
      } else {
        // 로컬 스토리지에서 삭제
        removeFavorite(questionId);
      }

      setFavorites((prev) => prev.filter((f) => f.id !== id));
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    } catch (error) {
      console.error("찜 삭제 실패:", error);
      alert("찜 삭제에 실패했습니다.");
    } finally {
      setIsRemoving(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <main className="min-h-screen grain">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-navy/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full px-6 py-4 border-b border-border/50">
        <nav className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>홈</span>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-gold" />
            </div>
            <span className="font-display text-xl font-semibold tracking-tight">
              DevInterview
            </span>
          </Link>
        </nav>
      </header>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Heart className="w-6 h-6 text-red-500 fill-red-500" />
            <h1 className="font-display text-3xl font-semibold">찜한 질문</h1>
          </div>
          <p className="text-muted-foreground">
            관심 있는 질문을 모아서 집중적으로 연습하세요.
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-4 mb-6"
        >
          <Link href="/archive">
            <Button variant="ghost" size="sm">
              <Archive className="w-4 h-4 mr-2" />
              면접 기록
            </Button>
          </Link>
          <Link href="/favorites">
            <Button variant="default" size="sm" className="bg-navy">
              <Heart className="w-4 h-4 mr-2" />
              찜한 질문
            </Button>
          </Link>
        </motion.div>

        {/* Favorites List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gold" />
          </div>
        ) : favorites.length === 0 ? (
          <Card className="p-12 text-center">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-xl font-semibold mb-2">
              찜한 질문이 없습니다
            </h2>
            <p className="text-muted-foreground mb-6">
              면접 중에 마음에 드는 질문을 찜해보세요.
            </p>
            <Link href="/">
              <Button className="bg-navy hover:bg-navy-light">
                면접 시작하기
              </Button>
            </Link>
          </Card>
        ) : (
          <>
            {/* Actions Bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex items-center justify-between mb-4"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Checkbox
                    checked={selectedIds.size === favorites.length}
                    onCheckedChange={handleSelectAll}
                  />
                  전체 선택
                </button>
                <span className="text-sm text-muted-foreground">
                  총 {favorites.length}개
                </span>
              </div>

              {selectedIds.size > 0 && (
                <Button
                  size="sm"
                  className="bg-gold hover:bg-gold-light text-navy"
                >
                  <Play className="w-4 h-4 mr-2" />
                  선택한 {selectedIds.size}개로 연습하기
                </Button>
              )}
            </motion.div>

            <div className="space-y-4">
              {favorites.map((favorite, index) => (
                <motion.div
                  key={favorite.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className={`p-5 transition-all group ${
                      selectedIds.has(favorite.id)
                        ? "ring-2 ring-gold/50 bg-gold/5"
                        : "hover:shadow-elegant"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={selectedIds.has(favorite.id)}
                        onCheckedChange={() => handleToggleSelect(favorite.id)}
                        className="mt-1"
                      />

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                          <p className="text-foreground leading-relaxed flex-1">
                            {favorite.content}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {favorite.category}
                          </Badge>
                          <span>{formatDate(favorite.savedAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Play className="w-4 h-4 mr-1" />
                          연습
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleRemove(favorite.id, favorite.questionId)
                          }
                          disabled={isRemoving === favorite.id}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        >
                          {isRemoving === favorite.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
