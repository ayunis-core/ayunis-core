import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';

export { InvalidPageMarginsError } from '../domain/letterhead.errors';

export enum LetterheadErrorCode {
  LETTERHEAD_NOT_FOUND = 'LETTERHEAD_NOT_FOUND',
  LETTERHEAD_INVALID_PDF = 'LETTERHEAD_INVALID_PDF',
  LETTERHEAD_ORG_MISMATCH = 'LETTERHEAD_ORG_MISMATCH',
}

export abstract class LetterheadError extends ApplicationError {
  constructor(
    message: string,
    code: LetterheadErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class LetterheadNotFoundError extends LetterheadError {
  constructor(letterheadId: string, metadata?: ErrorMetadata) {
    super(
      `Letterhead with ID '${letterheadId}' not found`,
      LetterheadErrorCode.LETTERHEAD_NOT_FOUND,
      404,
      { letterheadId, ...metadata },
    );
  }
}

export class LetterheadInvalidPdfError extends LetterheadError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Invalid letterhead PDF: ${reason}`,
      LetterheadErrorCode.LETTERHEAD_INVALID_PDF,
      400,
      metadata,
    );
  }
}

export class LetterheadOrgMismatchError extends LetterheadError {
  constructor(letterheadId: string, metadata?: ErrorMetadata) {
    super(
      `Letterhead '${letterheadId}' does not belong to the current organization`,
      LetterheadErrorCode.LETTERHEAD_ORG_MISMATCH,
      403,
      { letterheadId, ...metadata },
    );
  }
}
