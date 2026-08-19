import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type * as Mupdf from 'mupdf';

export type PdfNormalizationResult =
  | { status: 'normalized'; buffer: Buffer }
  | { status: 'passwordRequired' }
  | { status: 'unreadable'; reason: string };

type MupdfModule = typeof Mupdf;

@Injectable()
export class PdfNormalizerService {
  private mupdf?: Promise<MupdfModule>;

  constructor(
    @InjectPinoLogger(PdfNormalizerService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Rewrites a PDF into the plain, unencrypted form pdf-lib can read: it drops
   * the encryption dictionary that permission-locked files carry (those open
   * without a password in every viewer, but pdf-lib refuses them) and rebuilds
   * broken cross-reference tables.
   *
   * Files that need a real user password stay closed — decrypting those would
   * require a password we do not have.
   */
  async normalize(buffer: Buffer): Promise<PdfNormalizationResult> {
    const mupdf = await this.loadMupdf();
    try {
      const document = mupdf.PDFDocument.openDocument(
        buffer,
        'application/pdf',
      );
      if (document.needsPassword()) {
        return { status: 'passwordRequired' };
      }
      if (!(document instanceof mupdf.PDFDocument)) {
        return { status: 'unreadable', reason: 'not a PDF document' };
      }
      const bytes = document.saveToBuffer('encrypt=none').asUint8Array();
      return { status: 'normalized', buffer: Buffer.from(bytes) };
    } catch (error) {
      return {
        status: 'unreadable',
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * MuPDF is ESM-only with top-level await, so it cannot be `require`d from the
   * CommonJS build. Importing it lazily also keeps its WASM runtime out of
   * memory for the common case where pdf-lib reads an upload directly.
   */
  private loadMupdf(): Promise<MupdfModule> {
    this.mupdf ??= import('mupdf').then((mupdf) => {
      mupdf.setLog((message) =>
        this.logger.debug({ message }, 'MuPDF diagnostic'),
      );
      return mupdf;
    });
    return this.mupdf;
  }
}
