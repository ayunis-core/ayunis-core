import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Mistral } from '@mistralai/mistralai';
import type { EventStream } from '@mistralai/mistralai/lib/event-streams';
import type { SpeechStreamEvents } from '@mistralai/mistralai/models/operations';
import {
  SpeechPort,
  type SpeechSynthesisRequest,
} from 'src/domain/speech/application/ports/speech.port';
import { SpeechGenerationFailedError } from 'src/domain/speech/application/speech.errors';
import { wrapProviderFailure } from 'src/common/errors/wrap-provider-failure.helper';
import { isTransientMistralError } from 'src/common/util/mistral-transient-error';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import { MISTRAL_PRESET_VOICES } from './mistral-preset-voices';

// Bounds generation, not playback: the whole answer is generated well within
// this, while the client keeps buffering the audio it has not played yet.
const GENERATION_TIMEOUT_MS = 5 * 60 * 1000;

@Injectable()
export class MistralSpeechService extends SpeechPort {
  private readonly logger = new Logger(MistralSpeechService.name);

  private readonly client: Mistral;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.client = new Mistral({
      apiKey: this.configService.get('models.mistral.apiKey'),
      server: 'eu',
      serverURL: this.configService.get('models.mistral.speechServerUrl'),
    });
    this.model = this.configService.get<string>(
      'models.mistral.ttsModel',
      'voxtral-mini-tts-3-0',
    );
  }

  async synthesize({
    text,
    language,
    signal,
  }: SpeechSynthesisRequest): Promise<AsyncIterable<Buffer>> {
    const voiceId = MISTRAL_PRESET_VOICES[language];
    try {
      const stream = await retryWithBackoff({
        fn: () =>
          this.client.audio.speech.complete(
            {
              model: this.model,
              input: text,
              voiceId,
              responseFormat: 'mp3',
              stream: true,
            },
            {
              signal: AbortSignal.any([
                signal,
                AbortSignal.timeout(GENERATION_TIMEOUT_MS),
              ]),
            },
          ),
        maxRetries: 2,
        delay: 1000,
        retryIfError: (error) =>
          !signal.aborted && isTransientMistralError(error),
      });
      return this.decode(stream, voiceId, signal);
    } catch (error) {
      // The listener left before any audio; there is nobody to report to.
      if (signal.aborted) return noAudio();
      throw this.classify(error, voiceId);
    }
  }

  private async *decode(
    stream: EventStream<SpeechStreamEvents>,
    voiceId: string,
    signal: AbortSignal,
  ): AsyncIterable<Buffer> {
    try {
      for await (const event of stream) {
        if (event.data.type === 'speech.audio.delta') {
          yield Buffer.from(event.data.audioData, 'base64');
        }
      }
    } catch (error) {
      // The listener stopped playback; nobody is left to receive the audio.
      if (signal.aborted) return;
      throw this.classify(error, voiceId);
    }
  }

  private classify(error: unknown, voiceId: string): Error {
    this.logger.error(
      { err: error as Error, model: this.model, voiceId },
      'Speech generation failed',
    );
    const providerError = wrapProviderFailure(error, {
      provider: 'mistral',
      modelId: this.model,
    });
    if (providerError) return providerError;
    return new SpeechGenerationFailedError(
      `Mistral speech generation failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }
}

async function* noAudio(): AsyncIterable<Buffer> {}
