"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Upload, X, Copy, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import logoImage from "@/assets/images/logo.png";
import {
  getTeamSpaceByIdApi,
  updateTeamSpaceApi,
  regenerateInviteCodeApi,
  isLoggedIn,
} from "@/lib/api";

function ManageContent() {
  const params = useParams();
  const router = useRouter();
  const teamSpaceId = params.id as string;

  const [teamSpace, setTeamSpace] = useState<{
    id: string;
    name: string;
    avatar_url: string | null;
    invite_code: string;
    role: "owner" | "member";
  } | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadTeamSpace = async () => {
      try {
        const response = await getTeamSpaceByIdApi(teamSpaceId);
        if (response.teamSpace.role !== "owner") {
          router.push("/");
          return;
        }
        setTeamSpace(response.teamSpace);
        setName(response.teamSpace.name);
        setAvatarPreview(response.teamSpace.avatar_url);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "팀스페이스를 불러올 수 없습니다",
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (isLoggedIn()) {
      loadTeamSpace();
    } else {
      router.push("/auth");
    }
  }, [teamSpaceId, router]);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("팀스페이스 이름을 입력해주세요");
      return;
    }

    setIsSaving(true);

    try {
      let avatarUrl: string | undefined;

      // 이미지 업로드 (변경된 경우)
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

      await updateTeamSpaceApi(teamSpaceId, {
        name: name.trim(),
        avatar_url:
          avatarUrl !== undefined
            ? avatarUrl
            : (teamSpace?.avatar_url ?? undefined),
        password: password.trim() || undefined,
      });

      setSuccess("팀스페이스가 업데이트되었습니다");
      setPassword(""); // 비밀번호 필드 초기화
      setAvatarFile(null);

      // 팀스페이스 정보 다시 로드
      const response = await getTeamSpaceByIdApi(teamSpaceId);
      setTeamSpace(response.teamSpace);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "팀스페이스 수정에 실패했습니다",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerateInvite = async () => {
    if (
      !confirm(
        "초대 링크를 재생성하시겠습니까? 기존 링크는 더 이상 사용할 수 없습니다.",
      )
    ) {
      return;
    }

    setIsRegenerating(true);
    setError("");
    setSuccess("");

    try {
      const response = await regenerateInviteCodeApi(teamSpaceId);
      if (teamSpace) {
        setTeamSpace({ ...teamSpace, invite_code: response.invite_code });
      }
      setSuccess("초대 링크가 재생성되었습니다");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "초대 링크 재생성에 실패했습니다",
      );
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopyInviteLink = async () => {
    if (teamSpace) {
      const inviteLink = `${window.location.origin}/team-spaces/join/${teamSpace.invite_code}`;
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  if (!teamSpace) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">
          <p className="text-muted-foreground">
            팀스페이스를 찾을 수 없습니다.
          </p>
          <Link href="/">
            <Button className="mt-4 w-full">홈으로</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const inviteLink = `${window.location.origin}/team-spaces/join/${teamSpace.invite_code}`;

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-12 grain">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-navy/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Link href="/">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden">
                <Image
                  src={logoImage}
                  alt="모카번 Logo"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                />
              </div>
            </Link>
            <h1 className="text-2xl font-semibold">팀스페이스 관리</h1>
          </div>
          <Link href="/">
            <Button variant="outline">홈으로</Button>
          </Link>
        </div>

        <div className="space-y-6">
          {/* 프로필 수정 */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">프로필 수정</h2>
            <form onSubmit={handleSave} className="space-y-4">
              {/* 팀스페이스 이름 */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  팀스페이스 이름 <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12"
                  disabled={isSaving}
                  required
                />
              </div>

              {/* 프로필 사진 */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  프로필 사진
                </label>
                <div className="flex items-center gap-4">
                  {avatarPreview ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={avatarPreview}
                        alt="프로필 미리보기"
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarFile(null);
                          setAvatarPreview(teamSpace.avatar_url);
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
                        disabled={isSaving}
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
                  비밀번호 변경
                </label>
                <Input
                  type="password"
                  placeholder="새 비밀번호를 입력하세요 (비워두면 비밀번호 제거)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12"
                  disabled={isSaving}
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
              {success && !success.includes("재생성") && (
                <p className="text-sm text-green-500">{success}</p>
              )}

              <Button
                type="submit"
                className="w-full h-12 bg-navy hover:bg-navy-light"
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "저장"
                )}
              </Button>
            </form>
          </Card>

          {/* 링크 관리 */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">초대 링크</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  초대 링크
                </label>
                <div className="flex gap-2">
                  <Input
                    value={inviteLink}
                    readOnly
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    onClick={handleCopyInviteLink}
                    variant="outline"
                    className="px-4"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        복사됨
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        복사
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {success && success.includes("재생성") && (
                <p className="text-sm text-green-500">{success}</p>
              )}

              <Button
                onClick={handleRegenerateInvite}
                variant="outline"
                className="w-full"
                disabled={isRegenerating}
              >
                {isRegenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                링크 재생성
              </Button>
            </div>
          </Card>
        </div>
      </motion.div>
    </main>
  );
}

export default function ManagePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gold" />
        </div>
      }
    >
      <ManageContent />
    </Suspense>
  );
}
