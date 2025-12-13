"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Archive,
  ArrowLeft,
  Heart,
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
import { SAMPLE_FAVORITES } from "@/data/dummy-sessions";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteQuestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load favorites from localStorage, fallback to sample data if empty
    const storedFavorites = getFavorites();
    if (storedFavorites.length > 0) {
      setFavorites(storedFavorites);
    } else {
      // Use sample data for demo
      setFavorites(SAMPLE_FAVORITES);
    }
    setIsLoading(false);
  }, []);

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

  const handleRemove = (id: string, questionId: string) => {
    removeFavorite(questionId);
    setFavorites((prev) => prev.filter((f) => f.id !== id));
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
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
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-6 bg-muted rounded w-2/3 mb-3" />
                <div className="h-4 bg-muted rounded w-1/3" />
              </Card>
            ))}
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
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
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
