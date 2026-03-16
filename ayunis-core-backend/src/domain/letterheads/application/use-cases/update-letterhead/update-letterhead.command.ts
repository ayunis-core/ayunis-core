import type { UUID } from 'crypto';
import type { PageMargins } from '../../../domain/value-objects/page-margins';

export class UpdateLetterheadCommand {
  readonly letterheadId: UUID;
  readonly name?: string;
  readonly description?: string | null;
  readonly firstPagePdfBuffer?: Buffer;
  readonly continuationPagePdfBuffer?: Buffer | null;
  readonly firstPageMargins?: PageMargins;
  readonly continuationPageMargins?: PageMargins;

  constructor(params: {
    letterheadId: UUID;
    name?: string;
    description?: string | null;
    firstPagePdfBuffer?: Buffer;
    continuationPagePdfBuffer?: Buffer | null;
    firstPageMargins?: PageMargins;
    continuationPageMargins?: PageMargins;
  }) {
    this.letterheadId = params.letterheadId;
    this.name = params.name;
    this.description = params.description;
    this.firstPagePdfBuffer = params.firstPagePdfBuffer;
    this.continuationPagePdfBuffer = params.continuationPagePdfBuffer;
    this.firstPageMargins = params.firstPageMargins;
    this.continuationPageMargins = params.continuationPageMargins;
  }
}
