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
  abstract exportToDocx(html: string): Promise<Buffer>;
  abstract exportToPdf(
    html: string,
    letterhead?: LetterheadConfig,
  ): Promise<Buffer>;
}
