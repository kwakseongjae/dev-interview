"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Image from "next/image";
import logoImage from "@/assets/images/logo.png";

function CreatedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const teamSpaceId = params.id as string;
  const inviteCode = searchParams.get("invite_code");
  const [copied, setCopied] = useState(false);

  const inviteLink = inviteCode
    ? `${
        typeof window !== "undefined" ? window.location.origin : ""
      }/team-spaces/join/${inviteCode}`
    : "";

  const handleCopy = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 text-center max-w-lg mx-auto"
      >
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mb-8"
        >
          <div className="w-24 h-24 mx-auto bg-timer-safe/10 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-timer-safe" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="font-display text-4xl md:text-5xl font-semibold mb-4"
        >
          팀스페이스가 생성되었습니다!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-lg text-muted-foreground mb-8"
        >
          링크를 공유하여 팀원을 초대하세요.
        </motion.p>

        {/* Invite Link Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-6 mb-8">
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
                    onClick={handleCopy}
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
            </div>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Button
            onClick={() => {
              if (teamSpaceId) {
                localStorage.setItem("currentTeamSpaceId", teamSpaceId);
                router.push(`/team-spaces/${teamSpaceId}`);
              } else {
                router.push("/");
              }
            }}
            size="lg"
            className="w-full sm:w-auto bg-navy hover:bg-navy-light"
          >
            팀스페이스로 이동
          </Button>
          <Button
            onClick={() => router.push("/")}
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
          >
            홈으로
          </Button>
        </motion.div>
      </motion.div>
    </main>
  );
}

export default function CreatedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
        </div>
      }
    >
      <CreatedContent />
    </Suspense>
  );
}


