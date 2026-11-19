import type { UUID } from 'crypto';
import type { DocumentFontFamily } from 'src/domain/letterheads/domain/value-objects/document-typography';
import type { PageMargins } from 'src/domain/letterheads/domain/value-objects/page-margins';

export class UpdateLetterheadCommand {
  readonly letterheadId: UUID;
  readonly name?: string;
  readonly description?: string | null;
  readonly firstPagePdfBuffer?: Buffer;
  readonly continuationPagePdfBuffer?: Buffer;
  readonly removeContinuationPage: boolean;
  readonly firstPageMargins?: PageMargins;
  readonly continuationPageMargins?: PageMargins;

  readonly fontFamily?: DocumentFontFamily | null;
  readonly fontSizePt?: number | null;

  constructor(params: {
    letterheadId: UUID;
    name?: string;
    description?: string | null;
    fontFamily?: DocumentFontFamily | null;
    fontSizePt?: number | null;
    firstPagePdfBuffer?: Buffer;
    continuationPagePdfBuffer?: Buffer;
    removeContinuationPage?: boolean;
    firstPageMargins?: PageMargins;
    continuationPageMargins?: PageMargins;
  }) {
    this.letterheadId = params.letterheadId;
    this.name = params.name;
    this.fontFamily = params.fontFamily;
    this.fontSizePt = params.fontSizePt;
    this.description = params.description;
    this.firstPagePdfBuffer = params.firstPagePdfBuffer;
    this.continuationPagePdfBuffer = params.continuationPagePdfBuffer;
    this.removeContinuationPage = params.removeContinuationPage ?? false;
    this.firstPageMargins = params.firstPageMargins;
    this.continuationPageMargins = params.continuationPageMargins;
  }
}
