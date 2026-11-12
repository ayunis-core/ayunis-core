import type { APIRequestContext } from '@playwright/test';

// The Mistral contract server the backend reaches via MISTRAL_TRANSCRIPTION_SERVER_URL.
const baseUrl = `http://127.0.0.1:${process.env.E2E_MISTRAL_OCR_PORT ?? '3199'}`;

/**
 * A recording whose file name contains this marker is answered only once it
 * is released, so a test can act while it is being transcribed.
 */
export const HELD_TRANSCRIPTION_MARKER = 'transcription-hold';

export const transcriptionMock = {
  async held(request: APIRequestContext): Promise<string[]> {
    const response = await request.get(`${baseUrl}/transcription/held`);
    if (!response.ok()) {
      throw new Error(`/transcription/held answered ${response.status()}`);
    }
    return (await response.json()) as string[];
  },
  async release(request: APIRequestContext, fileName: string): Promise<void> {
    const response = await request.post(`${baseUrl}/transcription/release`, {
      data: { fileName },
    });
    if (!response.ok()) {
      throw new Error(`/transcription/release answered ${response.status()}`);
    }
  },
};
