import type { DocumentTypography } from 'src/domain/letterheads/domain/value-objects/document-typography';

export interface LetterheadConfig {
  firstPagePdf: Buffer;
  continuationPagePdf?: Buffer;
  firstPageMargins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  continuationPageMargins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export abstract class DocumentExportPort {
  abstract exportToDocx(
    html: string,
    letterhead?: LetterheadConfig,
    typography?: DocumentTypography,
  ): Promise<Buffer>;
  abstract exportToPdf(
    html: string,
    letterhead?: LetterheadConfig,
    typography?: DocumentTypography,
    continuationPageHtml?: string,
  ): Promise<Buffer>;
}
