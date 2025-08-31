import {
  ApplicationError,
  ErrorMetadata,
} from '../../../../common/errors/base.error';

export enum ToolErrorCode {
  ICS_MISSING_REQUIRED_FIELDS = 'ICS_MISSING_REQUIRED_FIELDS',
  ICS_INVALID_DATE_FORMAT = 'ICS_INVALID_DATE_FORMAT',
  ICS_END_BEFORE_START = 'ICS_END_BEFORE_START',
  ICS_GENERATION_ERROR = 'ICS_GENERATION_ERROR',
}

export abstract class ToolError extends ApplicationError {
  constructor(
    message: string,
    code: ToolErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class IcsMissingRequiredFieldsError extends ToolError {
  constructor(
    title: string | undefined,
    startIso: string | undefined,
    endIso: string | undefined,
    metadata?: ErrorMetadata,
  ) {
    super(
      'Missing required fields for ICS generation',
      ToolErrorCode.ICS_MISSING_REQUIRED_FIELDS,
      400,
      {
        title,
        startIso,
        endIso,
        ...metadata,
      },
    );
  }
}

export class IcsInvalidDateFormatError extends ToolError {
  constructor(startIso: string, endIso: string, metadata?: ErrorMetadata) {
    super(
      'Invalid date format for start or end',
      ToolErrorCode.ICS_INVALID_DATE_FORMAT,
      400,
      {
        startIso,
        endIso,
        ...metadata,
      },
    );
  }
}

export class IcsEndBeforeStartError extends ToolError {
  constructor(startIso: string, endIso: string, metadata?: ErrorMetadata) {
    super(
      'End time must be after start time',
      ToolErrorCode.ICS_END_BEFORE_START,
      400,
      {
        startIso,
        endIso,
        ...metadata,
      },
    );
  }
}

export class IcsGenerationError extends ToolError {
  constructor(originalError?: string, metadata?: ErrorMetadata) {
    super(
      'Failed to generate ICS content',
      ToolErrorCode.ICS_GENERATION_ERROR,
      500,
      {
        originalError,
        ...metadata,
      },
    );
  }
}
