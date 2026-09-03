import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Mistral } from '@mistralai/mistralai';
import { TranscriptionPort } from 'src/domain/transcriptions/application/ports/transcription.port';
import { TranscriptionFailedError } from 'src/domain/transcriptions/application/transcription.errors';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import { isTransientMistralError } from 'src/common/util/mistral-transient-error';
import { wrapProviderFailure } from 'src/common/errors/wrap-provider-failure.helper';

@Injectable()
export class MistralTranscriptionService extends TranscriptionPort {
  private readonly logger = new Logger(MistralTranscriptionService.name);

  private readonly client: Mistral;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.client = new Mistral({
      apiKey: this.configService.get('models.mistral.apiKey'),
      timeoutMs: 30_000,
    });
    this.model = this.configService.get<string>(
      'models.mistral.transcriptionModel',
      'voxtral-mini-latest',
    );
  }

  async transcribe(
    file: Buffer,
    fileName: string,
    mimeType: string,
    language?: string,
  ): Promise<string> {
    this.logger.log(
      {
        fileName,
        fileSize: file.length,
        mimeType,
        language,
      },
      'Starting transcription',
    );

    try {
      // Create a File object from the buffer for the Mistral API
      const audioFile = new File([new Uint8Array(file)], fileName, {
        type: mimeType,
      });

      const response = await this.requestTranscription(audioFile, language);

      const transcriptedText = response.text.trim() || '';

      this.logger.log(
        {
          fileName,
          textLength: transcriptedText.length,
        },
        'Transcription completed successfully',
      );

      return transcriptedText;
    } catch (error) {
      this.logger.error(
        { err: error as Error, fileName },
        'Transcription failed',
      );

      // Availability failures (transport errors, SDK 5xx, timeouts) all
      // classify here; what falls through is a request-shaped failure.
      const providerError = wrapProviderFailure(error, {
        provider: 'mistral',
        modelId: this.model,
      });
      if (providerError) {
        throw providerError;
      }

      throw new TranscriptionFailedError(
        `Mistral transcription failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  private requestTranscription(audioFile: File, language?: string) {
    const transcriptionRequest = {
      file: audioFile,
      model: this.model,
      ...(language && { language }),
    };

    this.logger.log(
      {
        model: this.model,
        language,
      },
      'Sending transcription request to Mistral',
    );

    return retryWithBackoff({
      fn: () => this.client.audio.transcriptions.complete(transcriptionRequest),
      maxRetries: 3,
      delay: 2000,
      retryIfError: (error: Error) => this.shouldRetry(error),
    });
  }

  private shouldRetry(error: Error): boolean {
    const isTransient = isTransientMistralError(error);
    if (isTransient) {
      this.logger.warn(
        { err: error },
        'Retrying Mistral transcription after transient error',
      );
    }
    return isTransient;
  }
}
