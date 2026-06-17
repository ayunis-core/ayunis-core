import type { UUID } from 'crypto';
import type { PageMargins } from '../../../domain/value-objects/page-margins';

export class UpdateLetterheadCommand {
  readonly letterheadId: UUID;
  readonly name?: string;
  readonly description?: string | null;
  readonly firstPagePdfBuffer?: Buffer;
  readonly continuationPagePdfBuffer?: Buffer;
  readonly removeContinuationPage: boolean;
  readonly firstPageMargins?: PageMargins;
  readonly continuationPageMargins?: PageMargins;

  constructor(params: {
    letterheadId: UUID;
    name?: string;
    description?: string | null;
    firstPagePdfBuffer?: Buffer;
    continuationPagePdfBuffer?: Buffer;
    removeContinuationPage?: boolean;
    firstPageMargins?: PageMargins;
    continuationPageMargins?: PageMargins;
  }) {
    this.letterheadId = params.letterheadId;
    this.name = params.name;
    this.description = params.description;
    this.firstPagePdfBuffer = params.firstPagePdfBuffer;
    this.continuationPagePdfBuffer = params.continuationPagePdfBuffer;
    this.removeContinuationPage = params.removeContinuationPage ?? false;
    this.firstPageMargins = params.firstPageMargins;
    this.continuationPageMargins = params.continuationPageMargins;
  }
}
