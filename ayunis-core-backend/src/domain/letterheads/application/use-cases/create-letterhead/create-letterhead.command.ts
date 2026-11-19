import type { DocumentFontFamily } from 'src/domain/letterheads/domain/value-objects/document-typography';
import type { PageMargins } from 'src/domain/letterheads/domain/value-objects/page-margins';

export class CreateLetterheadCommand {
  readonly name: string;
  readonly description: string | null;
  readonly firstPagePdfBuffer: Buffer;
  readonly continuationPagePdfBuffer: Buffer | null;
  readonly firstPageMargins: PageMargins;
  readonly continuationPageMargins: PageMargins;

  readonly fontFamily: DocumentFontFamily | null;
  readonly fontSizePt: number | null;

  constructor(params: {
    name: string;
    description?: string | null;
    fontFamily?: DocumentFontFamily | null;
    fontSizePt?: number | null;
    firstPagePdfBuffer: Buffer;
    continuationPagePdfBuffer?: Buffer | null;
    firstPageMargins: PageMargins;
    continuationPageMargins: PageMargins;
  }) {
    this.name = params.name;
    this.fontFamily = params.fontFamily ?? null;
    this.fontSizePt = params.fontSizePt ?? null;
    this.description = params.description ?? null;
    this.firstPagePdfBuffer = params.firstPagePdfBuffer;
    this.continuationPagePdfBuffer = params.continuationPagePdfBuffer ?? null;
    this.firstPageMargins = params.firstPageMargins;
    this.continuationPageMargins = params.continuationPageMargins;
  }
}
