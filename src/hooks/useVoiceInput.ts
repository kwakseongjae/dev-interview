// Applied rules: rerender-functional-setstate, rerender-lazy-state-init, js-early-exit

"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface UseVoiceInputOptions {
  /** Called when transcribed text is received */
  onTranscript?: (text: string) => void;
  /** Called with interim (partial) transcript — reserved for future WebSocket mode */
  onInterimTranscript?: (text: string) => void;
  /** Interview session ID for usage logging */
  sessionId?: string;
  /** Question ID for usage logging */
  questionId?: string;
  /** Maximum recording duration in seconds (default: 120) */
  maxDuration?: number;
  /** Remaining quota in seconds — recording auto-stops at this limit */
  quotaRemaining?: number | null;
}

interface UseVoiceInputReturn {
  /** Whether the microphone is currently recording */
  isRecording: boolean;
  /** Whether audio is being sent to the transcription API */
  isTranscribing: boolean;
  /** Start recording from the microphone */
  startRecording: () => Promise<void>;
  /** Stop recording and send audio for transcription */
  stopRecording: () => void;
  /** Current error message, if any */
  error: string | null;
  /** Microphone permission state */
  permissionState: PermissionState | "unknown";
  /** Recording duration in seconds */
  duration: number;
}

const DEFAULT_MAX_DURATION = 300;

/**
 * Custom hook for voice input with STT transcription.
 *
 * Manages MediaRecorder state, records audio in webm/opus format,
 * sends to /api/transcribe, and returns corrected text via onTranscript callback.
 */
export function useVoiceInput({
  onTranscript,
  onInterimTranscript: _onInterimTranscript,
  sessionId,
  questionId,
  maxDuration = DEFAULT_MAX_DURATION,
  quotaRemaining,
}: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  // Note: onInterimTranscript is accepted for API compatibility but not used
  // in REST mode. Will be utilized when upgrading to WebSocket Realtime API.
  void _onInterimTranscript;
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<
    PermissionState | "unknown"
  >("unknown");
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const onTranscriptRef = useRef(onTranscript);
  const quotaRemainingRef = useRef(quotaRemaining);

  // Keep callback ref up to date
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  // Keep quotaRemaining ref up to date
  useEffect(() => {
    quotaRemainingRef.current = quotaRemaining;
  }, [quotaRemaining]);

  // Check microphone permission on mount
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions) return;

    let permissionStatus: PermissionStatus | null = null;
    const handler = () => {
      if (permissionStatus) setPermissionState(permissionStatus.state);
    };

    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((status) => {
        permissionStatus = status;
        setPermissionState(status.state);
        status.addEventListener("change", handler);
      })
      .catch(() => {
        // permissions API not supported — will check on first use
      });

    return () => {
      permissionStatus?.removeEventListener("change", handler);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const sendAudioForTranscription = useCallback(
    async (audioBlob: Blob) => {
      setIsTranscribing(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");
        if (sessionId) formData.append("sessionId", sessionId);
        if (questionId) formData.append("questionId", questionId);
        // Send actual recording duration for more accurate quota tracking
        const recordingDuration = Math.round(
          (Date.now() - startTimeRef.current) / 1000,
        );
        formData.append("duration", String(recordingDuration));

        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error || "음성 인식에 실패했습니다");
        }

        const data = (await response.json()) as {
          correctedText: string;
          text: string;
        };
        const transcribedText = data.correctedText || data.text;

        if (transcribedText) {
          onTranscriptRef.current?.(transcribedText);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "음성 인식에 실패했습니다";
        setError(message);
      } finally {
        setIsTranscribing(false);
      }
    },
    [sessionId, questionId],
  );

  const startRecording = useCallback(async () => {
    setError(null);
    setDuration(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      streamRef.current = stream;
      setPermissionState("granted");

      // Determine supported MIME type
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        if (audioBlob.size > 0) {
          sendAudioForTranscription(audioBlob);
        }
        cleanup();
      };

      mediaRecorder.onerror = () => {
        setError("녹음 중 오류가 발생했습니다");
        setIsRecording(false);
        cleanup();
      };

      // Start recording
      mediaRecorder.start(1000); // collect data every second
      startTimeRef.current = Date.now();
      setIsRecording(true);

      // Duration counter
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);

        // Auto-stop at max duration or quota limit
        const currentQuota = quotaRemainingRef.current;
        const effectiveMax =
          currentQuota != null && currentQuota > 0
            ? Math.min(maxDuration, currentQuota)
            : maxDuration;
        if (elapsed >= effectiveMax) {
          mediaRecorder.stop();
          setIsRecording(false);
        }
      }, 1000);
    } catch (err) {
      if (err instanceof DOMException) {
        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError"
        ) {
          setPermissionState("denied");
          setError(
            "마이크 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.",
          );
          return;
        }
        if (err.name === "NotFoundError") {
          setError(
            "마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.",
          );
          return;
        }
      }
      setError("마이크를 시작할 수 없습니다");
    }
  }, [maxDuration, sendAudioForTranscription, cleanup]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    error,
    permissionState,
    duration,
  };
}
