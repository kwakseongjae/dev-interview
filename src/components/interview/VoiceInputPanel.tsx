"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Keyboard,
  Loader2,
  MessageCircleQuestion,
  Mic,
  MicOff,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import { Button } from "@/components/ui/button";

interface VoiceInputPanelProps {
  onApply: (text: string) => void;
  onSwitchToText?: () => void;
  sessionId: string;
  questionId: string;
  disabled?: boolean;
  isLoggedIn?: boolean;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatMinutes(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return `${m}분`;
}

export function VoiceInputPanel({
  onApply,
  onSwitchToText,
  sessionId,
  questionId,
  disabled = false,
  isLoggedIn = false,
}: VoiceInputPanelProps) {
  const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null);
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  // Transcription result — held until user clicks "적용하기"
  const [transcriptResult, setTranscriptResult] = useState<string | null>(null);

  // Refetch quota from the server
  const refetchQuota = useCallback(() => {
    if (!isLoggedIn) return;
    fetch("/api/transcribe/quota")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setQuotaRemaining(data.remaining);
          setQuotaExhausted(data.remaining <= 0);
        }
      })
      .catch(() => {});
  }, [isLoggedIn]);

  const handleTranscript = useCallback(
    (text: string) => {
      setTranscriptResult(text);
      refetchQuota();
    },
    [refetchQuota],
  );

  const {
    isRecording,
    isTranscribing,
    duration,
    startRecording,
    stopRecording,
    error,
    permissionState,
  } = useVoiceInput({
    onTranscript: handleTranscript,
    sessionId,
    questionId,
    quotaRemaining,
  });

  // Fetch quota on mount (only if logged in)
  useEffect(() => {
    refetchQuota();
  }, [refetchQuota]);

  // Refetch quota when transcription completes (success or error)
  const prevTranscribingRef = useRef(false);
  useEffect(() => {
    if (prevTranscribingRef.current && !isTranscribing) {
      refetchQuota();
    }
    prevTranscribingRef.current = isTranscribing;
  }, [isTranscribing, refetchQuota]);

  const isQuotaError = error?.includes("소진") ?? false;
  const effectiveQuotaExhausted = quotaExhausted || isQuotaError;

  const handleToggleRecording = async () => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }
    if (isRecording) {
      stopRecording();
    } else {
      // Block recording if quota known to be exhausted
      if (quotaRemaining !== null && quotaRemaining <= 0) {
        setQuotaExhausted(true);
        return;
      }
      setTranscriptResult(null);
      await startRecording();
    }
  };

  const handleApply = () => {
    if (transcriptResult) {
      onApply(transcriptResult);
      setTranscriptResult(null);
    }
  };

  const handleRetry = async () => {
    setTranscriptResult(null);
    await startRecording();
  };

  // Quota exhausted
  if (isLoggedIn && effectiveQuotaExhausted) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <MicOff className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="space-y-1.5 text-center">
          <p className="text-sm font-medium">
            음성 입력 사용량을 모두 소진했습니다
          </p>
          <p className="text-xs text-muted-foreground">
            충전이 필요하시면 문의해주세요
          </p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <a
            href="https://open.kakao.com/o/scbn4tfi"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <MessageCircleQuestion className="h-3.5 w-3.5" />
            카카오톡으로 문의하기
          </a>
          {onSwitchToText && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSwitchToText}
              className="gap-1.5 mt-1"
            >
              <Keyboard className="h-3.5 w-3.5" />
              텍스트로 입력하기
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Result preview — show after transcription completes
  if (transcriptResult) {
    return (
      <>
        <div className="flex flex-col gap-3 px-4 py-4">
          {/* Result text preview */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              변환 결과
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {transcriptResult}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              다시 녹음
            </Button>
            <Button size="sm" onClick={handleApply} className="gap-1.5">
              <Check className="h-3.5 w-3.5" />
              적용하기
            </Button>
          </div>
        </div>

        <LoginPromptModal
          open={showLoginModal}
          onOpenChange={setShowLoginModal}
          type="voice"
          onLater={() => setShowLoginModal(false)}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center gap-3 px-4 py-4">
        {/* Microphone Button */}
        <button
          type="button"
          onClick={handleToggleRecording}
          disabled={disabled || isTranscribing}
          className={cn(
            "relative flex h-16 w-16 items-center justify-center rounded-full transition-all",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            isRecording
              ? "bg-red-500 text-white shadow-lg shadow-red-200 hover:bg-red-600"
              : isTranscribing
                ? "cursor-wait bg-muted text-muted-foreground"
                : "bg-muted text-foreground hover:bg-accent",
          )}
          aria-label={isRecording ? "녹음 중지" : "녹음 시작"}
        >
          {isTranscribing ? (
            <Loader2 className="h-7 w-7 animate-spin" />
          ) : isRecording ? (
            <MicOff className="h-7 w-7" />
          ) : (
            <Mic className="h-7 w-7" />
          )}

          {isRecording && (
            <span className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-20" />
          )}
        </button>

        {/* Status Text */}
        <div className="flex items-center gap-2 text-sm">
          {isRecording ? (
            <>
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <span className="font-medium text-red-600">
                녹음 중 {formatDuration(duration)}
              </span>
            </>
          ) : isTranscribing ? (
            <span className="text-muted-foreground">변환 중...</span>
          ) : !isLoggedIn ? (
            <span className="text-muted-foreground">
              로그인하면 음성 입력을 사용할 수 있습니다
            </span>
          ) : (
            <span className="text-muted-foreground">
              마이크 버튼을 눌러 녹음을 시작하세요
            </span>
          )}
        </div>

        {/* Quota remaining */}
        {isLoggedIn &&
        quotaRemaining !== null &&
        !isRecording &&
        !isTranscribing ? (
          <p className="text-xs text-muted-foreground/60">
            남은 사용량: {formatMinutes(quotaRemaining)}
          </p>
        ) : null}

        {/* Error Display */}
        {error ? (
          <p className="max-w-[280px] text-center text-xs text-destructive">
            {permissionState === "denied"
              ? "마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요."
              : error}
          </p>
        ) : (
          isLoggedIn &&
          !isRecording &&
          !isTranscribing &&
          quotaRemaining === null && (
            <p className="text-xs text-muted-foreground/60">
              음성이 텍스트로 변환되어 답변에 추가됩니다
            </p>
          )
        )}
      </div>

      <LoginPromptModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        type="voice"
        onLater={() => setShowLoginModal(false)}
      />
    </>
  );
}
