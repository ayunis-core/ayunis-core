import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum RecordingErrorCode {
  RECORDING_NOT_FOUND = 'RECORDING_NOT_FOUND',
  OWNER_CHANGE_NOT_ALLOWED = 'RECORDING_OWNER_CHANGE_NOT_ALLOWED',
  AUDIO_ALREADY_UPLOADED = 'RECORDING_AUDIO_ALREADY_UPLOADED',
  SUMMARY_NOT_FOUND = 'RECORDING_SUMMARY_NOT_FOUND',
  SUMMARY_NOT_RETRYABLE = 'RECORDING_SUMMARY_NOT_RETRYABLE',
  TRANSCRIPT_TOO_LONG = 'RECORDING_TRANSCRIPT_TOO_LONG',
  TRANSCRIPT_EMPTY = 'RECORDING_TRANSCRIPT_EMPTY',
  SUMMARY_GENERATION_FAILED = 'RECORDING_SUMMARY_GENERATION_FAILED',
  UNEXPECTED_RECORDING_ERROR = 'UNEXPECTED_RECORDING_ERROR',
}

export abstract class RecordingError extends ApplicationError {
  constructor(
    message: string,
    code: RecordingErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class RecordingNotFoundError extends RecordingError {
  constructor(recordingId: string) {
    super(
      `Recording with ID '${recordingId}' not found`,
      RecordingErrorCode.RECORDING_NOT_FOUND,
      404,
      { recordingId },
    );
  }
}

export class RecordingOwnerChangeNotAllowedError extends RecordingError {
  constructor(recordingId: string) {
    super(
      'Workspace recordings cannot change owner',
      RecordingErrorCode.OWNER_CHANGE_NOT_ALLOWED,
      400,
      { recordingId },
    );
  }
}

/** A recording keeps one audio file; another is uploaded to a new recording. */
export class RecordingAudioAlreadyUploadedError extends RecordingError {
  constructor(recordingId: string) {
    super(
      'The recording already has its audio',
      RecordingErrorCode.AUDIO_ALREADY_UPLOADED,
      409,
      { recordingId },
    );
  }
}

/** The recording has no generated summary (yet). */
export class RecordingSummaryNotFoundError extends RecordingError {
  constructor(recordingId: string) {
    super(
      'The recording has no summary',
      RecordingErrorCode.SUMMARY_NOT_FOUND,
      404,
      { recordingId },
    );
  }
}

/** Only a failed summary is tried again; a generated one is not replaced. */
export class RecordingSummaryNotRetryableError extends RecordingError {
  constructor(recordingId: string) {
    super(
      'Only a failed summary can be tried again',
      RecordingErrorCode.SUMMARY_NOT_RETRYABLE,
      409,
      { recordingId },
    );
  }
}

/** The transcript does not fit into the summary model's context window. */
export class RecordingTranscriptTooLongError extends RecordingError {
  constructor(metadata: { transcriptTokens: number; contextWindow: number }) {
    super(
      'The transcript is too long for the summary model',
      RecordingErrorCode.TRANSCRIPT_TOO_LONG,
      422,
      metadata,
    );
  }
}

export class RecordingTranscriptEmptyError extends RecordingError {
  constructor(recordingId: string) {
    super(
      'The transcript has no speech to summarize',
      RecordingErrorCode.TRANSCRIPT_EMPTY,
      422,
      { recordingId },
    );
  }
}

/** The model answered without a usable summary. */
export class RecordingSummaryGenerationFailedError extends RecordingError {
  constructor(reason: string) {
    super(
      `The summary could not be generated: ${reason}`,
      RecordingErrorCode.SUMMARY_GENERATION_FAILED,
      502,
      { reason },
    );
  }
}

export class UnexpectedRecordingError extends RecordingError {
  constructor(cause: Error) {
    super(
      'Unexpected error occurred',
      RecordingErrorCode.UNEXPECTED_RECORDING_ERROR,
      500,
    );
    this.cause = cause;
  }
}
