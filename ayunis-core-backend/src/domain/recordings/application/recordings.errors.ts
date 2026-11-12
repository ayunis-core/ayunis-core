import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum RecordingErrorCode {
  RECORDING_NOT_FOUND = 'RECORDING_NOT_FOUND',
  OWNER_CHANGE_NOT_ALLOWED = 'RECORDING_OWNER_CHANGE_NOT_ALLOWED',
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
