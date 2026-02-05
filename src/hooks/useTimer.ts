/**
 * Timer hook for interview countdown
 * 3 minutes (180 seconds) per question
 */

import { useState, useEffect, useCallback, useRef } from "react";

interface UseTimerOptions {
  initialTime?: number; // seconds
  onTimeUp?: () => void;
  autoStart?: boolean;
}

interface UseTimerReturn {
  time: number;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  reset: (newTime?: number) => void;
  formatTime: () => string;
  percentage: number;
}

const DEFAULT_TIME = 180; // 3 minutes

export function useTimer({
  initialTime = DEFAULT_TIME,
  onTimeUp,
  autoStart = false,
}: UseTimerOptions = {}): UseTimerReturn {
  const [time, setTime] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(autoStart);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onTimeUpRef = useRef(onTimeUp);

  // Update ref when callback changes
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  // Main timer effect
  useEffect(() => {
    if (isRunning && time > 0) {
      intervalRef.current = setInterval(() => {
        setTime((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            onTimeUpRef.current?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, time]);

  const start = useCallback(() => {
    if (time > 0) {
      setIsRunning(true);
    }
  }, [time]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(
    (newTime?: number) => {
      setIsRunning(false);
      setTime(newTime ?? initialTime);
    },
    [initialTime],
  );

  const formatTime = useCallback(() => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, [time]);

  const percentage = (time / initialTime) * 100;

  return {
    time,
    isRunning,
    start,
    pause,
    reset,
    formatTime,
    percentage,
  };
}

// Format seconds to MM:SS string
export function formatSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// Format seconds to human readable (e.g., "12분 35초")
export function formatSecondsKorean(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) {
    return `${secs}초`;
  }
  if (secs === 0) {
    return `${mins}분`;
  }
  return `${mins}분 ${secs}초`;
}
