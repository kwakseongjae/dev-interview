"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Image from "next/image";
import logoImage from "@/assets/images/logo.png";
import logoTextImage from "@/assets/images/logo-text.png";
import { signIn, signUp, checkUsername } from "@/lib/api";

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  // 로그인 폼
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // 회원가입 폼
  const [signupUsername, setSignupUsername] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState("");
  const [signupErrors, setSignupErrors] = useState<{
    username?: string;
    password?: string;
    passwordConfirm?: string;
  }>({});
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null,
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!loginUsername || !loginPassword) {
      setLoginError("아이디와 비밀번호를 입력해주세요");
      return;
    }

    setIsLoading(true);
    try {
      await signIn(loginUsername, loginPassword);
      router.push(redirectTo);
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : "로그인에 실패했습니다",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckUsername = async () => {
    if (signupUsername.length < 4) {
      setSignupErrors((prev) => ({
        ...prev,
        username: "아이디는 4글자 이상이어야 합니다",
      }));
      setUsernameAvailable(false);
      return;
    }

    setIsCheckingUsername(true);
    try {
      const result = await checkUsername(signupUsername);
      setUsernameAvailable(result.available);
      setSignupErrors((prev) => ({
        ...prev,
        username: result.available ? undefined : result.message,
      }));
    } catch (error) {
      setSignupErrors((prev) => ({
        ...prev,
        username: "아이디 확인 중 오류가 발생했습니다",
      }));
      setUsernameAvailable(false);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const validateSignup = () => {
    const errors: typeof signupErrors = {};

    // 아이디 검증
    if (signupUsername.length < 4) {
      errors.username = "아이디는 4글자 이상이어야 합니다";
    }

    // 비밀번호 검증
    if (signupPassword.length < 8) {
      errors.password = "비밀번호는 8자 이상이어야 합니다";
    } else {
      const hasLetter = /[a-zA-Z]/.test(signupPassword);
      const hasNumber = /[0-9]/.test(signupPassword);
      if (!hasLetter || !hasNumber) {
        errors.password = "비밀번호는 영문과 숫자를 포함해야 합니다";
      }
    }

    // 비밀번호 확인 검증
    if (signupPassword !== signupPasswordConfirm) {
      errors.passwordConfirm = "비밀번호가 일치하지 않습니다";
    }

    setSignupErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateSignup()) {
      return;
    }

    if (usernameAvailable === false) {
      setSignupErrors((prev) => ({
        ...prev,
        username: "아이디 중복 확인을 해주세요",
      }));
      return;
    }

    setIsLoading(true);
    try {
      await signUp(signupUsername, signupPassword, signupPasswordConfirm);
      router.push(redirectTo);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "회원가입에 실패했습니다";
      if (message.includes("이미 존재하는")) {
        setSignupErrors((prev) => ({ ...prev, username: message }));
      } else {
        setSignupErrors((prev) => ({ ...prev, password: message }));
      }
    } finally {
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

        {/* Tabs */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 text-center font-medium transition-colors ${
              isLogin
                ? "text-foreground border-b-2 border-gold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            로그인
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 text-center font-medium transition-colors ${
              !isLogin
                ? "text-foreground border-b-2 border-gold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            회원가입
          </button>
        </div>

        {/* Login Form */}
        {isLogin ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="아이디"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="h-12"
                disabled={isLoading}
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="비밀번호"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="h-12"
                disabled={isLoading}
              />
            </div>
            {loginError && <p className="text-sm text-red-500">{loginError}</p>}
            <Button
              type="submit"
              className="w-full h-12 bg-navy hover:bg-navy-light"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "로그인"
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="아이디 (4글자 이상)"
                  value={signupUsername}
                  onChange={(e) => {
                    setSignupUsername(e.target.value);
                    setUsernameAvailable(null);
                    setSignupErrors((prev) => ({
                      ...prev,
                      username: undefined,
                    }));
                  }}
                  className="h-12 flex-1"
                  disabled={isLoading || isCheckingUsername}
                />
                <Button
                  type="button"
                  onClick={handleCheckUsername}
                  disabled={
                    isLoading || isCheckingUsername || signupUsername.length < 4
                  }
                  variant="outline"
                  className="h-12"
                >
                  {isCheckingUsername ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "중복확인"
                  )}
                </Button>
              </div>
              {signupErrors.username && (
                <p className="text-sm text-red-500 mt-1">
                  {signupErrors.username}
                </p>
              )}
              {usernameAvailable === true && (
                <p className="text-sm text-green-500 mt-1">
                  사용 가능한 아이디입니다
                </p>
              )}
            </div>
            <div>
              <Input
                type="password"
                placeholder="비밀번호 (영문+숫자 8자 이상)"
                value={signupPassword}
                onChange={(e) => {
                  setSignupPassword(e.target.value);
                  setSignupErrors((prev) => ({ ...prev, password: undefined }));
                }}
                className="h-12"
                disabled={isLoading}
              />
              {signupErrors.password && (
                <p className="text-sm text-red-500 mt-1">
                  {signupErrors.password}
                </p>
              )}
            </div>
            <div>
              <Input
                type="password"
                placeholder="비밀번호 확인"
                value={signupPasswordConfirm}
                onChange={(e) => {
                  setSignupPasswordConfirm(e.target.value);
                  setSignupErrors((prev) => ({
                    ...prev,
                    passwordConfirm: undefined,
                  }));
                }}
                className="h-12"
                disabled={isLoading}
              />
              {signupErrors.passwordConfirm && (
                <p className="text-sm text-red-500 mt-1">
                  {signupErrors.passwordConfirm}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full h-12 bg-navy hover:bg-navy-light"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "회원가입"
              )}
            </Button>
          </form>
        )}

        {/* Back to home */}
        <div className="mt-6 text-center">
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
