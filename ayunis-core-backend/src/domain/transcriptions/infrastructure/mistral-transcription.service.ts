import { Injectable, Logger } from '@nestjs/common';
import { openAsBlob } from 'fs';
import { ConfigService } from '@nestjs/config';
import { Mistral } from '@mistralai/mistralai';
import { MistralError } from '@mistralai/mistralai/models/errors';
import {
  TranscriptionPort,
  type AudioFileRef,
} from 'src/domain/transcriptions/application/ports/transcription.port';
import {
  InvalidAudioFileError,
  RecordingTooLongError,
  TranscriptionFailedError,
} from 'src/domain/transcriptions/application/transcription.errors';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import { isTransientMistralError } from 'src/common/util/mistral-transient-error';
import { wrapProviderFailure } from 'src/common/errors/wrap-provider-failure.helper';

import type { TranscriptionResponse } from '@mistralai/mistralai/models/components';
import type { RecordingTranscript } from 'src/domain/transcriptions/domain/recording-transcript';
import type { ApplicationError } from 'src/common/errors/base.error';
@Injectable()
export class MistralTranscriptionService extends TranscriptionPort {
  private readonly logger = new Logger(MistralTranscriptionService.name);
  private readonly client: Mistral;
  private readonly model: string;
  private readonly segmentTimeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    super();
    this.client = new Mistral({
      apiKey: this.configService.get('models.mistral.apiKey'),
      server: 'eu',
      serverURL: this.configService.get<string>(
        'models.mistral.transcriptionServerUrl',
      ),
      timeoutMs: 30_000,
    });
    this.model =
      this.configService.get<string>('models.mistral.transcriptionModel') ??
      'voxtral-mini-2602';
    this.segmentTimeoutMs =
      this.configService.get<number>('transcription.requestTimeoutMs') ??
      300_000;
    if (
      !Number.isSafeInteger(this.segmentTimeoutMs) ||
      this.segmentTimeoutMs <= 0
    )
      throw new Error('Invalid audio transcription timeout');
  }

  async transcribe(
    file: Buffer,
    fileName: string,
    mimeType: string,
    language?: string,
  ): Promise<string> {
    const response = await this.perform(
      { file, fileName, mimeType, language },
      false,
    );
    return response.text.trim();
  }

  async transcribeSegment(
    file: Buffer | AudioFileRef,
    fileName: string,
    mimeType: string,
    language?: string,
  ): Promise<RecordingTranscript> {
    const response = await this.perform(
      { file, fileName, mimeType, language },
      true,
    );
    const text = response.text.trim();
    const segments = (response.segments ?? []).map((segment) => {
      if (
        segment.start === null ||
        segment.end === null ||
        segment.start < 0 ||
        segment.end < segment.start
      ) {
        throw new TranscriptionFailedError(
          'The transcription provider returned invalid segment timestamps',
        );
      }
      return {
        text: segment.text,
        start: segment.start,
        end: segment.end,
        ...(segment.speakerId !== null &&
          segment.speakerId !== undefined && { speakerId: segment.speakerId }),
      };
    });
    return { text, segments };
  }

  private async perform(
    input: {
      file: Buffer | AudioFileRef;
      fileName: string;
      mimeType: string;
      language?: string;
    },
    timestamps: boolean,
  ): Promise<TranscriptionResponse> {
    this.logger.log(
      { fileName: input.fileName, fileSize: sizeOf(input.file) },
      'Starting transcription',
    );
    try {
      const audioFile = await toUploadFile(
        input.file,
        input.fileName,
        input.mimeType,
      );
      const result = await this.requestTranscription(
        audioFile,
        input.language,
        timestamps,
      );
      this.logger.log(
        { fileName: input.fileName, textLength: result.text.length },
        'Transcription completed',
      );
      return result;
    } catch (error) {
      this.logger.error(
        { err: error as Error, fileName: input.fileName },
        'Transcription failed',
      );
      throw this.mapError(error);
    }
  }

  private mapError(error: unknown): ApplicationError {
    const providerError = wrapProviderFailure(error, {
      provider: 'mistral',
      modelId: this.model,
    });
    if (providerError) return providerError;
    if (isUndecodableAudioError(error)) return new InvalidAudioFileError();
    if (isRecordingTooLongError(error)) {
      return new RecordingTooLongError(
        'The provider refused the recording as too large for one request',
      );
    }
    return new TranscriptionFailedError(
      `Mistral transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }

  private requestTranscription(
    audioFile: File,
    language?: string,
    timestamps = false,
  ) {
    const request = {
      file: audioFile,
      model: this.model,
      ...(language && { language }),
      ...(timestamps && {
        diarize: true,
        timestampGranularities: ['segment' as const],
      }),
    };
    return retryWithBackoff({
      fn: () =>
        timestamps
          ? this.client.audio.transcriptions.complete(request, {
              timeoutMs: this.segmentTimeoutMs,
            })
          : this.client.audio.transcriptions.complete(request),
      maxRetries: 3,
      delay: 2000,
      retryIfError: (error: Error) => isTransientMistralError(error),
    });
  }
}

// 413, or the two 400s a too-long recording triggers: the context-length
// refusal of the current models ("Prompt > 65536 maximum context length") and
// the duration refusal ("Audio duration exceeds the supported limit").
function isRecordingTooLongError(error: unknown): boolean {
  if (!(error instanceof MistralError)) return false;
  if (error.statusCode === 413) return true;
  if (error.statusCode !== 400) return false;
  return /maximum context length|duration exceeds/i.test(error.body);
}

function isUndecodableAudioError(error: unknown): boolean {
  if (!(error instanceof MistralError) || error.statusCode !== 400) {
    return false;
  }

  try {
    const body: unknown = JSON.parse(error.body);
    if (typeof body !== 'object' || body === null) return false;
    const details = body as Record<string, unknown>;
    return (
      details.type === 'invalid_request_file' &&
      details.code === '3310' &&
      typeof details.message === 'string' &&
      details.message.trim() === 'Audio input could not be decoded.'
    );
  } catch {
    return false;
  }
}

function sizeOf(file: Buffer | AudioFileRef): number {
  return Buffer.isBuffer(file) ? file.length : file.size;
}

// A file-backed blob is read from disk while the request body streams, so a
// segment on disk is never copied into the process.
async function toUploadFile(
  file: Buffer | AudioFileRef,
  fileName: string,
  mimeType: string,
): Promise<File> {
  const part = Buffer.isBuffer(file)
    ? new Uint8Array(file)
    : await openAsBlob(file.path, { type: mimeType });
  return new File([part], fileName, { type: mimeType });
}
