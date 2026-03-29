"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/api";
import Image from "next/image";
import logoImage from "@/assets/images/logo.png";

const GRACE_PERIOD_DAYS = 15;

export default function AccountRecoveryPage() {
  const router = useRouter();
  const [isRecovering, setIsRecovering] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.deleted) {
          // 탈퇴 상태가 아니면 홈으로
          router.replace("/");
          return;
        }
        if (data.deleted_at) {
          const deletedAt = new Date(data.deleted_at);
          const now = new Date();
          const elapsed = Math.floor(
            (now.getTime() - deletedAt.getTime()) / (1000 * 60 * 60 * 24),
          );
          const remaining = GRACE_PERIOD_DAYS - elapsed;
          if (remaining <= 0) {
            setIsExpired(true);
          } else {
            setDaysRemaining(remaining);
          }
        }
      })
      .catch(() => {
        router.replace("/");
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  const handleRecover = async () => {
    setIsRecovering(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/recover-account", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "복구에 실패했습니다");
      }

      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "복구에 실패했습니다");
      setIsRecovering(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch {
      // 무시
    }
    window.location.href = "/";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center space-y-6">
        <Image
          src={logoImage}
          alt="모카번"
          width={48}
          height={48}
          className="mx-auto"
        />

        {isExpired ? (
          <>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold">
                복구 기간이 만료되었습니다
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                탈퇴 후 15일이 경과하여 계정 데이터가 삭제되었습니다.
                <br />
                동일한 계정으로 새로 가입하실 수 있습니다.
              </p>
            </div>
            <Button
              onClick={handleSignOut}
              disabled={isSigningOut}
              variant="outline"
              className="w-full h-12"
            >
              {isSigningOut ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <LogOut className="w-4 h-4 mr-2" />
              )}
              로그아웃
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold">탈퇴한 계정입니다</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                이전에 탈퇴 처리된 계정으로 로그인하셨습니다.
                <br />
                계정을 복구하면 이전 데이터를 다시 사용할 수 있습니다.
              </p>
            </div>

            {daysRemaining !== null && (
              <div className="rounded-lg bg-muted/50 border border-border/60 px-4 py-3 text-sm text-muted-foreground">
                복구 가능 기간이{" "}
                <span className="font-semibold text-foreground">
                  {daysRemaining}일
                </span>{" "}
                남았습니다.
                <br />
                <span className="text-xs">
                  기간이 지나면 데이터가 영구 삭제됩니다.
                </span>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="space-y-3">
              <Button
                onClick={handleRecover}
                disabled={isRecovering || isSigningOut}
                className="w-full h-12 bg-navy hover:bg-navy-light"
              >
                {isRecovering ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <RotateCcw className="w-4 h-4 mr-2" />
                )}
                계정 복구하기
              </Button>
              <Button
                onClick={handleSignOut}
                disabled={isRecovering || isSigningOut}
                variant="ghost"
                className="w-full h-12"
              >
                {isSigningOut ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <LogOut className="w-4 h-4 mr-2" />
                )}
                로그아웃
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
