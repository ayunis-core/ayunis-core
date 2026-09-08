import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { PDFDocument } from 'pdf-lib';
import {
  LetterheadInvalidPdfError,
  LetterheadPdfNotSinglePageError,
} from 'src/domain/letterheads/application/letterheads.errors';

@Injectable()
export class LetterheadPdfService {
  async validateSinglePagePdf(buffer: Buffer, label: string): Promise<void> {
    const pdfDoc = await this.loadPdf(buffer, label);

    const pageCount = pdfDoc.getPageCount();
    if (pageCount !== 1) {
      throw new LetterheadPdfNotSinglePageError(label, pageCount);
    }
  }

  /**
   * Kept separate so the page-count check below runs outside this catch —
   * a catch-all around both would report a wrong-page-count PDF as unreadable.
   *
   * `load` runs with pdf-lib's default `ignoreEncryption: false`, so
   * password- or permission-protected PDFs throw here and are reported as
   * unreadable, which is what the user has to act on.
   */
  private async loadPdf(buffer: Buffer, label: string): Promise<PDFDocument> {
    try {
      return await PDFDocument.load(buffer);
    } catch {
      throw new LetterheadInvalidPdfError(`${label} is not a valid PDF file`);
    }
  }

  buildStoragePath(orgId: UUID, letterheadId: UUID, fileName: string): string {
    return `letterheads/${orgId}/${letterheadId}/${fileName}`;
  }
}
