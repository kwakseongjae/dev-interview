// Applied rules: js-early-exit

/**
 * OpenAI Realtime Transcription utilities
 *
 * Provides server-side helpers for OpenAI's audio transcription API.
 * Currently uses the REST /v1/audio/transcriptions endpoint.
 * Can be upgraded to WebSocket Realtime API later.
 */

const OPENAI_TRANSCRIPTION_URL =
  "https://api.openai.com/v1/audio/transcriptions";
const TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";

/** Cost per minute in USD for gpt-4o-mini-transcribe */
const COST_PER_MINUTE_USD = 0.003;

/**
 * Transcribes an audio file using OpenAI's REST API.
 *
 * @param audioBlob - The audio data as a Blob/File
 * @param language - BCP-47 language code (default: "ko" for Korean)
 * @returns The transcribed text
 */
export async function transcribeAudio(
  audioBlob: Blob,
  language: string = "ko",
): Promise<{ text: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  const formData = new FormData();
  formData.append("file", audioBlob, "audio.webm");
  formData.append("model", TRANSCRIPTION_MODEL);
  formData.append("language", language);

  const response = await fetch(OPENAI_TRANSCRIPTION_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `OpenAI transcription failed (${response.status}): ${errorBody}`,
    );
  }

  const data = (await response.json()) as { text: string };
  return { text: data.text };
}

/**
 * Calculates the cost of STT usage in USD.
 *
 * @param durationSeconds - Duration of audio transcribed in seconds
 * @returns Cost in USD
 */
export function calculateSttCost(durationSeconds: number): number {
  const minutes = durationSeconds / 60;
  return Math.round(minutes * COST_PER_MINUTE_USD * 1_000_000) / 1_000_000;
}

/**
 * Returns the WebSocket URL for OpenAI Realtime API (for future upgrade).
 */
export function getRealtimeWebSocketUrl(): string {
  return `wss://api.openai.com/v1/realtime?model=${TRANSCRIPTION_MODEL}`;
}

/**
 * Returns headers needed for OpenAI Realtime WebSocket connection (for future upgrade).
 */
export function getRealtimeHeaders(): Record<string, string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    "OpenAI-Beta": "realtime=v1",
  };
}
