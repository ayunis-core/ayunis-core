import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PDFDocument } from 'pdf-lib';
import {
  LetterheadInvalidPdfError,
  LetterheadPdfNotSinglePageError,
  LetterheadPdfPasswordProtectedError,
} from 'src/domain/letterheads/application/letterheads.errors';
import { PdfNormalizerService } from './pdf-normalizer.service';

type PdfLibReadResult =
  { readable: true; pageCount: number } | { readable: false; reason: string };

@Injectable()
export class LetterheadPdfService {
  constructor(
    @InjectPinoLogger(LetterheadPdfService.name)
    private readonly logger: PinoLogger,
    private readonly pdfNormalizer: PdfNormalizerService,
  ) {}

  /**
   * Validates an uploaded letterhead and returns the bytes to store: the upload
   * itself when pdf-lib can read it, otherwise a normalized copy. Only what
   * pdf-lib accepts may be stored — it is also the library that composites the
   * letterhead behind exported documents.
   */
  async prepareSinglePagePdf(buffer: Buffer, label: string): Promise<Buffer> {
    const upload = await this.readWithPdfLib(buffer);
    if (upload.readable) {
      this.assertSinglePage(upload.pageCount, label);
      return buffer;
    }

    this.logger.warn(
      { label, reason: upload.reason },
      'pdf-lib cannot read the uploaded letterhead PDF, normalizing it',
    );
    const normalized = await this.pdfNormalizer.normalize(buffer);
    if (normalized.status === 'passwordRequired') {
      throw new LetterheadPdfPasswordProtectedError(label);
    }
    if (normalized.status === 'unreadable') {
      throw new LetterheadInvalidPdfError(`${label} is not a valid PDF file`, {
        label,
        pdfLibError: upload.reason,
        normalizerError: normalized.reason,
      });
    }

    const rewritten = await this.readWithPdfLib(normalized.buffer);
    if (!rewritten.readable) {
      throw new LetterheadInvalidPdfError(`${label} is not a valid PDF file`, {
        label,
        pdfLibError: upload.reason,
        normalizedPdfLibError: rewritten.reason,
      });
    }
    this.assertSinglePage(rewritten.pageCount, label);
    return normalized.buffer;
  }

  buildStoragePath(orgId: UUID, letterheadId: UUID, fileName: string): string {
    return `letterheads/${orgId}/${letterheadId}/${fileName}`;
  }

  private assertSinglePage(pageCount: number, label: string): void {
    if (pageCount !== 1) {
      throw new LetterheadPdfNotSinglePageError(label, pageCount);
    }
  }

  private async readWithPdfLib(buffer: Buffer): Promise<PdfLibReadResult> {
    try {
      const pdfDoc = await PDFDocument.load(buffer);
      return { readable: true, pageCount: pdfDoc.getPageCount() };
    } catch (error) {
      return {
        readable: false,
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
