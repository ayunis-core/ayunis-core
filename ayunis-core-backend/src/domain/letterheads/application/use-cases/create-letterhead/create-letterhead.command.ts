import type { PageMargins } from '../../../domain/value-objects/page-margins';

export class CreateLetterheadCommand {
  readonly name: string;
  readonly description: string | null;
  readonly firstPagePdfBuffer: Buffer;
  readonly continuationPagePdfBuffer: Buffer | null;
  readonly firstPageMargins: PageMargins;
  readonly continuationPageMargins: PageMargins;

  constructor(params: {
    name: string;
    description?: string | null;
    firstPagePdfBuffer: Buffer;
    continuationPagePdfBuffer?: Buffer | null;
    firstPageMargins: PageMargins;
    continuationPageMargins: PageMargins;
  }) {
    this.name = params.name;
    this.description = params.description ?? null;
    this.firstPagePdfBuffer = params.firstPagePdfBuffer;
    this.continuationPagePdfBuffer = params.continuationPagePdfBuffer ?? null;
    this.firstPageMargins = params.firstPageMargins;
    this.continuationPageMargins = params.continuationPageMargins;
  }
}
