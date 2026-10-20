import type { UUID } from 'crypto';
import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum AcademyErrorCode {
  CHAPTER_NOT_FOUND = 'CHAPTER_NOT_FOUND',
  COURSE_MODULE_NOT_FOUND = 'COURSE_MODULE_NOT_FOUND',
  INVALID_REORDER = 'INVALID_REORDER',
  COMPLETION_NOT_FOUND = 'COMPLETION_NOT_FOUND',
  MODULES_BELOW_MINIMUM_TIME = 'MODULES_BELOW_MINIMUM_TIME',
  UNEXPECTED_ACADEMY_ERROR = 'UNEXPECTED_ACADEMY_ERROR',
}

export abstract class AcademyError extends ApplicationError {
  constructor(
    message: string,
    code: AcademyErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class ChapterNotFoundError extends AcademyError {
  constructor(chapterId: string, metadata?: ErrorMetadata) {
    super(
      `Academy chapter with ID ${chapterId} not found`,
      AcademyErrorCode.CHAPTER_NOT_FOUND,
      404,
      metadata,
    );
  }
}

export class CourseModuleNotFoundError extends AcademyError {
  constructor(courseModuleId: string, metadata?: ErrorMetadata) {
    super(
      `Academy courseModule with ID ${courseModuleId} not found`,
      AcademyErrorCode.COURSE_MODULE_NOT_FOUND,
      404,
      metadata,
    );
  }
}

export class InvalidReorderError extends AcademyError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'The submitted ids do not match the current set of items',
      AcademyErrorCode.INVALID_REORDER,
      400,
      metadata,
    );
  }
}

export class AcademyCompletionNotFoundError extends AcademyError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'The academy has not been completed yet',
      AcademyErrorCode.COMPLETION_NOT_FOUND,
      404,
      metadata,
    );
  }
}

export class ChapterModulesBelowMinimumTimeError extends AcademyError {
  constructor(courseModuleIds: UUID[], minimumSeconds: number) {
    super(
      `${courseModuleIds.length} video page(s) have not been open for ${minimumSeconds} seconds yet`,
      AcademyErrorCode.MODULES_BELOW_MINIMUM_TIME,
      409,
      { courseModuleIds, minimumSeconds },
    );
  }
}

export class UnexpectedAcademyError extends AcademyError {
  constructor(error: unknown) {
    super(
      'Unexpected error occurred',
      AcademyErrorCode.UNEXPECTED_ACADEMY_ERROR,
      500,
      { error },
    );
  }
}
