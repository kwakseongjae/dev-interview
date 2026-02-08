"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import logoImage from "@/assets/images/logo.png";
import logoTextImage from "@/assets/images/logo-text.png";
import { signInWithGoogle } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const error = searchParams.get("error");
  const { loggedIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    error === "callback_failed"
      ? "로그인에 실패했습니다. 다시 시도해주세요."
      : "",
  );

  useEffect(() => {
    if (loggedIn) {
      router.replace(redirectTo);
    }
  }, [loggedIn, router, redirectTo]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      await signInWithGoogle(redirectTo);
    } catch {
      setErrorMessage("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 grain">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-navy/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-[420px]"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-14 h-14 rounded-lg flex items-center justify-center overflow-hidden">
            <Image
              src={logoImage}
              alt="모카번 Logo"
              width={56}
              height={56}
              className="w-full h-full object-contain"
            />
          </div>
          <Image
            src={logoTextImage}
            alt="모카번"
            width={96}
            height={40}
            className="h-9 w-auto object-contain"
            priority
          />
        </div>

        {/* Description */}
        <p className="text-center text-muted-foreground text-lg mb-10">
          AI 기반 개발자 기술면접 준비 서비스
        </p>

        {/* Card */}
        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-8 shadow-sm">
          <p className="text-center text-sm text-muted-foreground mb-6">
            Google 계정으로 간편하게 시작하세요
          </p>

          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full h-[52px] flex items-center justify-center gap-3 rounded-xl border border-border bg-white text-[15px] font-medium text-gray-700 transition-colors hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            ) : (
              <>
                <GoogleIcon />
                Google로 시작하기
              </>
            )}
          </button>

          {errorMessage && (
            <p className="text-sm text-red-500 text-center mt-4">
              {errorMessage}
            </p>
          )}
        </div>

        {/* Back to home */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </motion.div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gold" />
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  );
}
