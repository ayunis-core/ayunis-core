import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';

export enum LetterheadDomainErrorCode {
  LETTERHEAD_INVALID_PAGE_MARGINS = 'LETTERHEAD_INVALID_PAGE_MARGINS',
}

export class InvalidPageMarginsError extends ApplicationError {
  constructor(field: string, value: number, metadata?: ErrorMetadata) {
    super(
      `Invalid page margin: '${field}' must be a non-negative finite number, got ${value}`,
      LetterheadDomainErrorCode.LETTERHEAD_INVALID_PAGE_MARGINS,
      400,
      { field, value, ...metadata },
    );
  }
}
