/**
 * Port for converting office documents (DOCX, PPTX, etc.) to PDF.
 */
export abstract class DocumentConverterPort {
  abstract convertToPdf(fileBuffer: Buffer, fileName: string): Promise<Buffer>;
}
