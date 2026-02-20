import {
  ApplicationError,
  ErrorMetadata,
} from '../../../common/errors/base.error';

/**
 * Error codes specific to the Transcriptions domain
 */
export enum TranscriptionErrorCode {
  TRANSCRIPTION_FAILED = 'TRANSCRIPTION_FAILED',
  INVALID_AUDIO_FILE = 'INVALID_AUDIO_FILE',
  TRANSCRIPTION_SERVICE_UNAVAILABLE = 'TRANSCRIPTION_SERVICE_UNAVAILABLE',
}

/**
 * Base transcription error that all transcription-specific errors should extend
 */
export abstract class TranscriptionError extends ApplicationError {
  constructor(
    message: string,
    code: TranscriptionErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class TranscriptionFailedError extends TranscriptionError {
  constructor(
    message: string = 'Transcription failed',
    metadata?: ErrorMetadata,
  ) {
    super(message, TranscriptionErrorCode.TRANSCRIPTION_FAILED, 500, metadata);
  }
}

export class InvalidAudioFileError extends TranscriptionError {
  constructor(
    message: string = 'Invalid audio file',
    metadata?: ErrorMetadata,
  ) {
    super(message, TranscriptionErrorCode.INVALID_AUDIO_FILE, 400, metadata);
  }
}

export class TranscriptionServiceUnavailableError extends TranscriptionError {
  constructor(
    message: string = 'Transcription service unavailable',
    metadata?: ErrorMetadata,
  ) {
    super(
      message,
      TranscriptionErrorCode.TRANSCRIPTION_SERVICE_UNAVAILABLE,
      503,
      metadata,
    );
  }
}
