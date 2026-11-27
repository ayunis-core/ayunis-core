import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum AdventCalendarErrorCode {
  ADVENT_CALENDAR_DOOR_NOT_FOUND = 'ADVENT_CALENDAR_DOOR_NOT_FOUND',
  ADVENT_CALENDAR_DOOR_IMAGE_NOT_FOUND = 'ADVENT_CALENDAR_DOOR_IMAGE_NOT_FOUND',
  ADVENT_CALENDAR_IMAGE_UNSUPPORTED = 'ADVENT_CALENDAR_IMAGE_UNSUPPORTED',
  ADVENT_CALENDAR_VIDEO_INVALID = 'ADVENT_CALENDAR_VIDEO_INVALID',
  UNEXPECTED_ADVENT_CALENDAR_ERROR = 'UNEXPECTED_ADVENT_CALENDAR_ERROR',
}

export abstract class AdventCalendarError extends ApplicationError {
  constructor(
    message: string,
    code: AdventCalendarErrorCode,
    statusCode: number,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

/** The door has no content yet; save its text before adding an image. */
export class AdventCalendarDoorNotFoundError extends AdventCalendarError {
  constructor(day: number) {
    super(
      `Advent calendar door ${day} has no content`,
      AdventCalendarErrorCode.ADVENT_CALENDAR_DOOR_NOT_FOUND,
      404,
      { day },
    );
  }
}

/** Also raised for a door the caller may not open yet, so it reveals nothing. */
export class AdventCalendarDoorImageNotFoundError extends AdventCalendarError {
  constructor(day: number) {
    super(
      `Advent calendar door ${day} has no image`,
      AdventCalendarErrorCode.ADVENT_CALENDAR_DOOR_IMAGE_NOT_FOUND,
      404,
      { day },
    );
  }
}

export class AdventCalendarImageUnsupportedError extends AdventCalendarError {
  constructor() {
    super(
      'The image must be a JPEG, PNG, GIF or WebP file',
      AdventCalendarErrorCode.ADVENT_CALENDAR_IMAGE_UNSUPPORTED,
      400,
    );
  }
}

export class AdventCalendarVideoInvalidError extends AdventCalendarError {
  constructor() {
    super(
      'The video must be a Vimeo URL',
      AdventCalendarErrorCode.ADVENT_CALENDAR_VIDEO_INVALID,
      400,
    );
  }
}

export class UnexpectedAdventCalendarError extends AdventCalendarError {
  constructor(error: Error, metadata?: ErrorMetadata) {
    super(
      'Unexpected advent calendar error',
      AdventCalendarErrorCode.UNEXPECTED_ADVENT_CALENDAR_ERROR,
      500,
      metadata,
    );
    this.cause = error;
  }
}
