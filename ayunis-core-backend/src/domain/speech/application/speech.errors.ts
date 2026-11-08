import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum SpeechErrorCode {
  SPEECH_GENERATION_FAILED = 'SPEECH_GENERATION_FAILED',
  UNEXPECTED_SPEECH_ERROR = 'UNEXPECTED_SPEECH_ERROR',
}

export abstract class SpeechError extends ApplicationError {
  constructor(
    message: string,
    code: SpeechErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class SpeechGenerationFailedError extends SpeechError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super(message, SpeechErrorCode.SPEECH_GENERATION_FAILED, 500, metadata);
  }
}

export class UnexpectedSpeechError extends SpeechError {
  constructor(error: unknown) {
    super(
      'Unexpected error occurred',
      SpeechErrorCode.UNEXPECTED_SPEECH_ERROR,
      500,
      { error },
    );
  }
}
