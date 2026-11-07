import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum ReleaseNoteErrorCode {
  ANNOUNCABLE_REQUEST_REJECTED = 'ANNOUNCABLE_REQUEST_REJECTED',
  ANNOUNCABLE_FEED_INVALID = 'ANNOUNCABLE_FEED_INVALID',
  UNEXPECTED_RELEASE_NOTE_ERROR = 'UNEXPECTED_RELEASE_NOTE_ERROR',
}

export abstract class ReleaseNoteError extends ApplicationError {
  constructor(
    message: string,
    code: ReleaseNoteErrorCode,
    statusCode: number = 500,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

/** A client error for the feed is most likely a wrong Announcable org ID. */
export class AnnouncableRequestRejectedError extends ReleaseNoteError {
  constructor(status: number) {
    super(
      `Announcable rejected the release-note feed request with status ${status}; check ANNOUNCABLE_ORG_ID`,
      ReleaseNoteErrorCode.ANNOUNCABLE_REQUEST_REJECTED,
      502,
      { upstreamStatus: status },
    );
  }
}

export class AnnouncableFeedInvalidError extends ReleaseNoteError {
  constructor(reason: string) {
    super(
      `The Announcable release-note feed is not as expected: ${reason}`,
      ReleaseNoteErrorCode.ANNOUNCABLE_FEED_INVALID,
      502,
      { reason },
    );
  }
}

export class UnexpectedReleaseNoteError extends ReleaseNoteError {
  constructor(error: Error, metadata?: ErrorMetadata) {
    super(
      'Unexpected release note error',
      ReleaseNoteErrorCode.UNEXPECTED_RELEASE_NOTE_ERROR,
      500,
      metadata,
    );
    this.cause = error;
  }
}
