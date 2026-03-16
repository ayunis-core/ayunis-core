import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { PDFDocument } from 'pdf-lib';
import { LetterheadInvalidPdfError } from '../letterheads.errors';

@Injectable()
export class LetterheadPdfService {
  async validateSinglePagePdf(buffer: Buffer, label: string): Promise<void> {
    try {
      const pdfDoc = await PDFDocument.load(buffer);
      const pageCount = pdfDoc.getPageCount();
      if (pageCount !== 1) {
        throw new LetterheadInvalidPdfError(
          `${label} PDF must be exactly 1 page, got ${pageCount}`,
        );
      }
    } catch (error) {
      if (error instanceof LetterheadInvalidPdfError) {
        throw error;
      }
      throw new LetterheadInvalidPdfError(`${label} is not a valid PDF file`);
    }
  }

  buildStoragePath(orgId: UUID, letterheadId: UUID, fileName: string): string {
    return `letterheads/${orgId}/${letterheadId}/${fileName}`;
  }
}
