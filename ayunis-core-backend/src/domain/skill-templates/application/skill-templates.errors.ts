import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';

export enum SkillTemplateErrorCode {
  SKILL_TEMPLATE_NOT_FOUND = 'SKILL_TEMPLATE_NOT_FOUND',
  DUPLICATE_SKILL_TEMPLATE_NAME = 'DUPLICATE_SKILL_TEMPLATE_NAME',
  UNEXPECTED_SKILL_TEMPLATE_ERROR = 'UNEXPECTED_SKILL_TEMPLATE_ERROR',
}

export abstract class SkillTemplateError extends ApplicationError {
  constructor(
    message: string,
    code: SkillTemplateErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class SkillTemplateNotFoundError extends SkillTemplateError {
  constructor(skillTemplateId: string, metadata?: ErrorMetadata) {
    super(
      `Skill template with ID ${skillTemplateId} not found`,
      SkillTemplateErrorCode.SKILL_TEMPLATE_NOT_FOUND,
      404,
      metadata,
    );
  }
}

export class DuplicateSkillTemplateNameError extends SkillTemplateError {
  constructor(name: string, metadata?: ErrorMetadata) {
    super(
      `A skill template with the name "${name}" already exists`,
      SkillTemplateErrorCode.DUPLICATE_SKILL_TEMPLATE_NAME,
      409,
      metadata,
    );
  }
}

export class UnexpectedSkillTemplateError extends SkillTemplateError {
  constructor(error: unknown) {
    super(
      'Unexpected error occurred',
      SkillTemplateErrorCode.UNEXPECTED_SKILL_TEMPLATE_ERROR,
      500,
      { error },
    );
  }
}
