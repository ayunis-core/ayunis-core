import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';

export enum AcademyErrorCode {
  CHAPTER_NOT_FOUND = 'CHAPTER_NOT_FOUND',
  COURSE_MODULE_NOT_FOUND = 'COURSE_MODULE_NOT_FOUND',
  QUIZ_QUESTION_NOT_FOUND = 'QUIZ_QUESTION_NOT_FOUND',
  INVALID_REORDER = 'INVALID_REORDER',
  INVALID_QUIZ_QUESTION = 'INVALID_QUIZ_QUESTION',
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

export class QuizQuestionNotFoundError extends AcademyError {
  constructor(quizQuestionId: string, metadata?: ErrorMetadata) {
    super(
      `Academy quiz question with ID ${quizQuestionId} not found`,
      AcademyErrorCode.QUIZ_QUESTION_NOT_FOUND,
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

export class InvalidQuizQuestionError extends AcademyError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(reason, AcademyErrorCode.INVALID_QUIZ_QUESTION, 400, metadata);
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
