/**
 * Port for converting office documents (DOCX, PPTX, etc.) to PDF.
 */
export abstract class DocumentConverterPort {
  abstract convertToPdf(fileBuffer: Buffer, fileName: string): Promise<Buffer>;
  /**
   * Converts a document on disk and writes the PDF to `outputPath`, holding
   * neither in memory. The caller owns both files. Resolves the PDF's size.
   */
  abstract convertFileToPdf(
    inputPath: string,
    fileName: string,
    outputPath: string,
  ): Promise<{ size: number }>;
}
