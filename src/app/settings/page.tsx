"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, Mail, Calendar, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "@/lib/api";
import { DeleteAccountDialog } from "@/components/DeleteAccountDialog";

interface SettingsUser {
  id: string;
  email: string;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { loggedIn } = useAuth();
  const [user, setUser] = useState<SettingsUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (loggedIn) {
      fetch("/api/auth/me")
        .then((res) => res.json())
        .then((data) => {
          if (data.deleted) {
            router.replace("/account-recovery");
            return;
          }
          if (data.user) setUser(data.user);
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    } else if (loggedIn === false) {
      router.replace("/auth");
    }
  }, [loggedIn, router]);

  const handleDeleteAccount = async (reason: string | null) => {
    const res = await fetch("/api/auth/delete-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "회원탈퇴에 실패했습니다");
    }

    // 클라이언트 사이드 로그아웃 + 리다이렉트
    try {
      await signOut();
    } catch {
      // 이미 서버에서 로그아웃 처리됨
    }
    window.location.href = "/?deleted=true";
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const createdDate = new Date(user.created_at).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-medium">설정</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* 계정 정보 */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            계정 정보
          </h2>
          <div className="rounded-lg border border-border/60 divide-y divide-border/40">
            <div className="flex items-center gap-3 px-4 py-3">
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">닉네임</p>
                <p className="text-sm truncate">
                  {user.nickname || "설정되지 않음"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">이메일</p>
                <p className="text-sm truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">가입일</p>
                <p className="text-sm">{createdDate}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 로그아웃 */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            세션
          </h2>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full justify-start gap-2"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </Button>
        </section>

        {/* 회원탈퇴 */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            계정 관리
          </h2>
          <div className="rounded-lg border border-border/60 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">회원탈퇴</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                탈퇴 후 15일간 복구가 가능하며, 이후 데이터가 영구 삭제됩니다.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive shrink-0"
            >
              탈퇴하기
            </Button>
          </div>
        </section>
      </main>

      <DeleteAccountDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onDelete={handleDeleteAccount}
      />
    </div>
  );
}
