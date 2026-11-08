import type { APIRequestContext } from '@playwright/test';

export interface SpeechMockRequest {
  input: string;
  voiceId: string;
  model: string;
}

// The Mistral contract server the backend reaches via MISTRAL_SPEECH_SERVER_URL.
const baseUrl = `http://127.0.0.1:${process.env.E2E_MISTRAL_OCR_PORT ?? '3199'}`;

async function post(request: APIRequestContext, path: string): Promise<void> {
  const response = await request.post(`${baseUrl}${path}`);
  if (!response.ok()) throw new Error(`${path} answered ${response.status()}`);
}

export const speechMock = {
  reset: (request: APIRequestContext) => post(request, '/speech/reset'),
  /** Holds every following speech stream open after its first audio. */
  hold: (request: APIRequestContext) => post(request, '/speech/hold'),
  release: (request: APIRequestContext) => post(request, '/speech/release'),
  async requests(request: APIRequestContext): Promise<SpeechMockRequest[]> {
    const response = await request.get(`${baseUrl}/speech/requests`);
    if (!response.ok()) {
      throw new Error(`/speech/requests answered ${response.status()}`);
    }
    return (await response.json()) as SpeechMockRequest[];
  },
};
