import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

/**
 * Error codes specific to the Transcriptions domain
 */
export enum TranscriptionErrorCode {
  TRANSCRIPTION_FAILED = 'TRANSCRIPTION_FAILED',
  INVALID_AUDIO_FILE = 'INVALID_AUDIO_FILE',
  RECORDING_TOO_LONG = 'RECORDING_TOO_LONG',
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

/**
 * The recording cannot be transcribed in one request: it exceeds the duration
 * cap, or the provider refused it as too large. Deterministic, so the job is
 * not retried; the user is asked to cut the recording.
 */
export class RecordingTooLongError extends TranscriptionError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super(message, TranscriptionErrorCode.RECORDING_TOO_LONG, 422, metadata);
  }
}

export class UnexpectedTranscriptionError extends TranscriptionFailedError {
  constructor(error: Error) {
    super('Unexpected error processing the recording', { error });
  }
}
