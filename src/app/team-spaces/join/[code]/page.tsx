"use client";

import { useState, Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import logoImage from "@/assets/images/logo.png";
import logoTextImage from "@/assets/images/logo-text.png";
import {
  getTeamSpaceByInviteCodeApi,
  joinTeamSpaceApi,
  isLoggedIn,
} from "@/lib/api";
import { LoginPromptModal } from "@/components/LoginPromptModal";

function JoinContent() {
  const params = useParams();
  const router = useRouter();
  const inviteCode = params.code as string;

  const [teamSpace, setTeamSpace] = useState<{
    id: string;
    name: string;
    avatar_url: string | null;
    has_password: boolean;
  } | null>(null);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    const loadTeamSpace = async () => {
      try {
        const response = await getTeamSpaceByInviteCodeApi(inviteCode);
        setTeamSpace(response.teamSpace);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "팀스페이스를 찾을 수 없습니다",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadTeamSpace();
  }, [inviteCode]);

  useEffect(() => {
    if (!isLoading && !isLoggedIn()) {
      setShowLoginModal(true);
    }
  }, [isLoading]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isLoggedIn()) {
      setShowLoginModal(true);
      return;
    }

    setIsJoining(true);

    try {
      const response = await joinTeamSpaceApi(inviteCode, {
        password: password.trim() || undefined,
      });

      // 현재 팀스페이스로 설정
      localStorage.setItem("currentTeamSpaceId", response.teamSpace.id);

      // 팀스페이스 페이지로 이동
      router.push(`/team-spaces/${response.teamSpace.id}`);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "팀스페이스 참여에 실패했습니다",
      );
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  if (error && !teamSpace) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 grain">
        <Card className="p-6 max-w-md">
          <h1 className="text-2xl font-semibold mb-4">오류</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Link href="/">
            <Button className="w-full">홈으로</Button>
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 grain">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-navy/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-1 mb-8">
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
            width={80}
            height={34}
            className="h-7 w-auto object-contain"
            priority
          />
        </div>

        <Card className="p-6">
          <div className="text-center mb-6">
            {teamSpace?.avatar_url ? (
              <img
                src={teamSpace.avatar_url}
                alt={teamSpace.name}
                className="w-20 h-20 rounded-lg mx-auto mb-4 object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallback = e.currentTarget
                    .nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            {!teamSpace?.avatar_url && (
              <div className="w-20 h-20 rounded-lg bg-muted mx-auto mb-4 flex items-center justify-center">
                <Lock className="w-10 h-10 text-muted-foreground" />
              </div>
            )}
            <h1 className="text-2xl font-semibold mb-2">{teamSpace?.name}</h1>
            <p className="text-muted-foreground">팀스페이스에 참여하기</p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            {teamSpace?.has_password && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  비밀번호
                </label>
                <Input
                  type="password"
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12"
                  disabled={isJoining}
                  required
                />
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button
              type="submit"
              className="w-full h-12 bg-navy hover:bg-navy-light"
              disabled={isJoining}
            >
              {isJoining ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "참여하기"
              )}
            </Button>
          </form>
        </Card>

        {/* Login Prompt Modal */}
        <LoginPromptModal
          open={showLoginModal}
          onOpenChange={setShowLoginModal}
          type="archive"
        />
      </motion.div>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gold" />
        </div>
      }
    >
      <JoinContent />
    </Suspense>
  );
}
