import { apiFetch } from '@/shared/api/embedded-session';
import type { SynthesizeSpeechDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

// SynthesizeSpeechDto's limit on the backend.
export const MAX_SPEECH_TEXT_LENGTH = 30_000;

/**
 * Posts with fetch rather than the generated client so playback can start on
 * the first audio chunk instead of the complete file.
 */
export async function requestSpeech(
  body: SynthesizeSpeechDto,
  signal: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  const response = await apiFetch('/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok || !response.body) {
    throw new Error(`Speech request failed with status ${response.status}`);
  }
  return response.body;
}
