import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Mistral } from '@mistralai/mistralai';
import { SDKError } from '@mistralai/mistralai/models/errors';
import { TranscriptionPort } from '../application/ports/transcription.port';
import {
  TranscriptionFailedError,
  TranscriptionServiceUnavailableError,
} from '../application/transcription.errors';
import retryWithBackoff from 'src/common/util/retryWithBackoff';

@Injectable()
export class MistralTranscriptionService extends TranscriptionPort {
  private readonly logger = new Logger(MistralTranscriptionService.name);
  private readonly client: Mistral;

  constructor(private readonly configService: ConfigService) {
    super();
    this.client = new Mistral({
      apiKey: this.configService.get('models.mistral.apiKey'),
      timeoutMs: 30_000,
    });
  }

  async transcribe(
    file: Buffer,
    fileName: string,
    mimeType: string,
    language?: string,
  ): Promise<string> {
    this.logger.log('Starting transcription', {
      fileName,
      fileSize: file.length,
      mimeType,
      language,
    });

    try {
      // Create a File object from the buffer for the Mistral API
      const audioFile = new File([new Uint8Array(file)], fileName, {
        type: mimeType,
      });

      const transcriptionRequest = {
        file: audioFile,
        model: 'voxtral-mini-latest',
        ...(language && { language }),
      };

      this.logger.log('Sending transcription request to Mistral', {
        model: 'voxtral-mini-latest',
        language,
      });

      const response = await retryWithBackoff({
        fn: () =>
          this.client.audio.transcriptions.complete(transcriptionRequest),
        maxRetries: 3,
        delay: 2000,
        retryIfError: (error: Error) => {
          const isTransient =
            error instanceof SDKError && error.statusCode >= 500;
          if (isTransient) {
            this.logger.warn(
              'Retrying Mistral transcription after transient error',
              {
                statusCode: (error as SDKError).statusCode,
                message: error.message,
              },
            );
          }
          return isTransient;
        },
      });

      const transcriptedText = response.text.trim() || '';

      this.logger.log('Transcription completed successfully', {
        fileName,
        textLength: transcriptedText.length,
      });

      return transcriptedText;
    } catch (error) {
      this.logger.error('Transcription failed', {
        fileName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Check if it's a service availability issue
      if (this.isServiceUnavailableError(error)) {
        throw new TranscriptionServiceUnavailableError(
          'Mistral transcription service is currently unavailable',
        );
      }

      throw new TranscriptionFailedError(
        `Mistral transcription failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  private isServiceUnavailableError(error: unknown): boolean {
    // Check for common service unavailable indicators
    if (error instanceof SDKError && error.statusCode >= 500) {
      return true;
    }
    const err = error as
      | {
          message?: string;
          name?: string;
        }
      | undefined;
    if (err?.name === 'RequestTimeoutError' || err?.name === 'TimeoutError') {
      return true;
    }
    if (
      err?.message?.includes('service unavailable') ||
      err?.message?.includes('timeout')
    ) {
      return true;
    }
    return false;
  }
}
