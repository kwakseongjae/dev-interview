const STORAGE_KEY = "pendingInterview";
const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10분

export interface PendingInterview {
  questions: Array<{
    content: string;
    hint: string;
    category: string;
    subcategory?: string;
  }>;
  query: string;
  interviewTypeCode?: string | null;
  timestamp: number;
}

export function savePendingInterview(
  data: Omit<PendingInterview, "timestamp">,
): void {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...data, timestamp: Date.now() }),
  );
}

export function loadPendingInterview(): PendingInterview | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data: PendingInterview = JSON.parse(raw);

    if (Date.now() - data.timestamp > STALE_THRESHOLD_MS) {
      clearPendingInterview();
      return null;
    }

    return data;
  } catch {
    clearPendingInterview();
    return null;
  }
}

export function clearPendingInterview(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
