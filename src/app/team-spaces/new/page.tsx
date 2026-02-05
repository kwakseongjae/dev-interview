"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import logoImage from "@/assets/images/logo.png";
import logoTextImage from "@/assets/images/logo-text.png";
import { createTeamSpaceApi } from "@/lib/api";

export default function NewTeamSpacePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("이미지 크기는 5MB 이하여야 합니다");
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("팀스페이스 이름을 입력해주세요");
      return;
    }

    setIsLoading(true);

    try {
      let avatarUrl: string | undefined;

      // 이미지 업로드 (있는 경우)
      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);

        const token = localStorage.getItem("devinterview_access_token");
        const uploadResponse = await fetch("/api/team-spaces/upload-avatar", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || "이미지 업로드 실패");
        }

        const uploadData = await uploadResponse.json();
        avatarUrl = uploadData.url;
      }

      const response = await createTeamSpaceApi({
        name: name.trim(),
        avatar_url: avatarUrl,
        password: password.trim() || undefined,
      });

      // 생성 완료 페이지로 이동
      router.push(
        `/team-spaces/${response.teamSpace.id}/created?invite_code=${response.teamSpace.invite_code}`,
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "팀스페이스 생성에 실패했습니다",
      );
    } finally {
      setIsLoading(false);
    }
  };

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
          <h1 className="text-2xl font-semibold mb-6">새 팀스페이스 만들기</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 팀스페이스 이름 */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                팀스페이스 이름 <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="예: 프론트엔드 팀"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12"
                disabled={isLoading}
                required
              />
            </div>

            {/* 프로필 사진 */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                프로필 사진 (선택)
              </label>
              <div className="flex items-center gap-4">
                {avatarPreview ? (
                  <div className="relative">
                    <img
                      src={avatarPreview}
                      alt="프로필 미리보기"
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarFile(null);
                        setAvatarPreview(null);
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <div className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center hover:border-muted-foreground/50 transition-colors">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                      disabled={isLoading}
                    />
                  </label>
                )}
                <div className="text-sm text-muted-foreground">
                  <p>최대 5MB</p>
                  <p>JPG, PNG 형식</p>
                </div>
              </div>
            </div>

            {/* 비밀번호 */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                비밀번호 (선택)
              </label>
              <Input
                type="password"
                placeholder="비밀번호를 설정하면 초대 시 필요합니다"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12"
                disabled={isLoading}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1 h-12 bg-navy hover:bg-navy-light"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "만들기"
                )}
              </Button>
              <Link href="/">
                <Button type="button" variant="outline" className="h-12">
                  취소
                </Button>
              </Link>
            </div>
          </form>
        </Card>
      </motion.div>
    </main>
  );
}
