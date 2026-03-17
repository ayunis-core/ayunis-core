import type { PageMargins } from 'src/domain/letterheads/domain/value-objects/page-margins';

export interface LetterheadConfig {
  firstPagePdf: Buffer;
  continuationPagePdf?: Buffer;
  firstPageMargins: PageMargins;
  continuationPageMargins: PageMargins;
}

export abstract class DocumentExportPort {
  abstract exportToDocx(html: string): Promise<Buffer>;
  abstract exportToPdf(
    html: string,
    letterhead?: LetterheadConfig,
  ): Promise<Buffer>;
}
