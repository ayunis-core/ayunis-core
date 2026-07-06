import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Mistral } from '@mistralai/mistralai';
import { SDKError } from '@mistralai/mistralai/models/errors';
import { TextToSpeechPort } from '../application/ports/text-to-speech.port';
import {
  SpeechServiceUnavailableError,
  SpeechSynthesisFailedError,
} from '../application/speech.errors';
import retryWithBackoff from 'src/common/util/retryWithBackoff';

@Injectable()
export class MistralTextToSpeechService extends TextToSpeechPort {
  private readonly logger = new Logger(MistralTextToSpeechService.name);
  private readonly client: Mistral;
  private readonly model: string;
  private readonly voiceId: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.client = new Mistral({
      apiKey: this.configService.get('models.mistral.apiKey'),
      // TTS on long input is slower than transcription
      timeoutMs: 60_000,
    });
    this.model = this.configService.get<string>(
      'models.mistral.ttsModel',
      'voxtral-mini-tts-latest',
    );
    // Mistral rejects speech requests without a voice — always send one
    this.voiceId = this.configService.get<string>(
      'models.mistral.ttsVoice',
      'en_paul_neutral',
    );
  }

  async synthesize(input: string): Promise<Buffer> {
    this.logger.log('Starting speech synthesis', {
      model: this.model,
      inputLength: input.length,
    });

    try {
      const response = await retryWithBackoff({
        fn: () =>
          this.client.audio.speech.complete({
            model: this.model,
            voiceId: this.voiceId,
            input,
            responseFormat: 'mp3',
            stream: false,
          }),
        maxRetries: 3,
        delay: 2000,
        retryIfError: (error: Error) => this.shouldRetry(error),
      });

      const audio = Buffer.from(response.audioData, 'base64');

      this.logger.log('Speech synthesis completed', {
        audioBytes: audio.length,
      });

      return audio;
    } catch (error) {
      this.logger.error('Speech synthesis failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof SDKError && error.statusCode >= 500) {
        throw new SpeechServiceUnavailableError(
          'Mistral speech service is currently unavailable',
        );
      }

      throw new SpeechSynthesisFailedError(
        `Mistral speech synthesis failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  private shouldRetry(error: Error): boolean {
    const isTransient = error instanceof SDKError && error.statusCode >= 500;
    if (isTransient) {
      this.logger.warn(
        'Retrying Mistral speech synthesis after transient error',
        {
          statusCode: error.statusCode,
          message: error.message,
        },
      );
    }
    return isTransient;
  }
}
