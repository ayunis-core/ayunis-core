import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum SkillAuthoringErrorCode {
  SKILL_TEXT_IMPROVEMENT_FAILED = 'SKILL_TEXT_IMPROVEMENT_FAILED',
  SKILL_TEXT_IMPROVEMENT_UNAVAILABLE = 'SKILL_TEXT_IMPROVEMENT_UNAVAILABLE',
  UNEXPECTED_SKILL_AUTHORING_ERROR = 'UNEXPECTED_SKILL_AUTHORING_ERROR',
}

export abstract class SkillAuthoringError extends ApplicationError {
  constructor(
    message: string,
    code: SkillAuthoringErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class SkillTextImprovementFailedError extends SkillAuthoringError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'The improved text could not be generated',
      SkillAuthoringErrorCode.SKILL_TEXT_IMPROVEMENT_FAILED,
      502,
      metadata,
    );
  }
}

export class SkillTextImprovementUnavailableError extends SkillAuthoringError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'No permitted model may receive skill texts without anonymization',
      SkillAuthoringErrorCode.SKILL_TEXT_IMPROVEMENT_UNAVAILABLE,
      422,
      metadata,
    );
  }
}

export class UnexpectedSkillAuthoringError extends SkillAuthoringError {
  constructor(error: unknown) {
    super(
      'Unexpected error occurred',
      SkillAuthoringErrorCode.UNEXPECTED_SKILL_AUTHORING_ERROR,
      500,
      { error },
    );
  }
}
