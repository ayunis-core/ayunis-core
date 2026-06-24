import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';

export enum AcademyErrorCode {
  CHAPTER_NOT_FOUND = 'CHAPTER_NOT_FOUND',
  LESSON_NOT_FOUND = 'LESSON_NOT_FOUND',
  INVALID_REORDER = 'INVALID_REORDER',
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

export class LessonNotFoundError extends AcademyError {
  constructor(lessonId: string, metadata?: ErrorMetadata) {
    super(
      `Academy lesson with ID ${lessonId} not found`,
      AcademyErrorCode.LESSON_NOT_FOUND,
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
