import type { SpeechLanguage } from 'src/domain/speech/domain/speech-language';

export interface SpeechSynthesisRequest {
  text: string;
  language: SpeechLanguage;
  signal: AbortSignal;
}

export abstract class SpeechPort {
  /**
   * Resolves once the provider has accepted the request, so request failures
   * surface before any audio is sent; the iterable yields MP3 chunks.
   */
  abstract synthesize(
    request: SpeechSynthesisRequest,
  ): Promise<AsyncIterable<Buffer>>;
}
