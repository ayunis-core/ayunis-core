import type { UUID } from 'crypto';
import { PDFDocument } from 'pdf-lib';
import { LetterheadPdfService } from './letterhead-pdf.service';
import {
  LetterheadErrorCode,
  LetterheadInvalidPdfError,
  LetterheadPdfNotSinglePageError,
} from 'src/domain/letterheads/application/letterheads.errors';

/**
 * pdf-lib cannot encrypt, so this flags encryption the way pdf-lib detects it
 * — an `/Encrypt` entry in the trailer (see PDFDocument's `isEncrypted`). The
 * streams are not really RC4-encrypted, but `load` takes the same branch it
 * takes for a genuinely protected letterhead.
 */
async function createEncryptedPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.addPage();
  const encryptDict = doc.context.obj({ Filter: 'Standard', V: 1, R: 2 });
  doc.context.trailerInfo.Encrypt = doc.context.register(encryptDict);
  return Buffer.from(await doc.save());
}

async function createSinglePagePdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.addPage();
  const bytes = await doc.save();
  return Buffer.from(bytes);
}

async function createMultiPagePdf(pages: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    doc.addPage();
  }
  const bytes = await doc.save();
  return Buffer.from(bytes);
}

describe('LetterheadPdfService', () => {
  let service: LetterheadPdfService;

  beforeEach(() => {
    service = new LetterheadPdfService();
  });

  describe('validateSinglePagePdf', () => {
    it('should accept a valid single-page PDF', async () => {
      const pdf = await createSinglePagePdf();
      await expect(
        service.validateSinglePagePdf(pdf, 'first page'),
      ).resolves.toBeUndefined();
    });

    it('should reject a multi-page PDF as not single-page, not as unreadable', async () => {
      const pdf = await createMultiPagePdf(3);
      await expect(
        service.validateSinglePagePdf(pdf, 'first page'),
      ).rejects.toThrow(LetterheadPdfNotSinglePageError);
    });

    it('should carry a distinct code and the actual page count for support', async () => {
      const pdf = await createMultiPagePdf(2);

      await expect(
        service.validateSinglePagePdf(pdf, 'first page'),
      ).rejects.toMatchObject({
        code: LetterheadErrorCode.LETTERHEAD_PDF_NOT_SINGLE_PAGE,
        message: expect.stringContaining('got 2'),
      });
    });

    it('should reject an invalid buffer', async () => {
      const buffer = Buffer.from('not a pdf');
      await expect(
        service.validateSinglePagePdf(buffer, 'first page'),
      ).rejects.toThrow(LetterheadInvalidPdfError);
    });

    it('should reject an empty buffer as unreadable', async () => {
      await expect(
        service.validateSinglePagePdf(Buffer.alloc(0), 'first page'),
      ).rejects.toThrow(LetterheadInvalidPdfError);
    });

    it('should reject an encrypted PDF as unreadable rather than swallowing it', async () => {
      // pdf-lib throws EncryptedPDFError because `load` runs with the default
      // `ignoreEncryption: false`. Permission-restricted letterheads (no open
      // password, but printing/editing locked) land here.
      const encrypted = await createEncryptedPdf();
      await expect(
        service.validateSinglePagePdf(encrypted, 'first page'),
      ).rejects.toThrow(LetterheadInvalidPdfError);
    });
  });

  describe('buildStoragePath', () => {
    it('should build a correct org-scoped storage path', () => {
      const orgId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
      const letterheadId = '223e4567-e89b-12d3-a456-426614174000' as UUID;

      const path = service.buildStoragePath(
        orgId,
        letterheadId,
        'first-page.pdf',
      );

      expect(path).toBe(`letterheads/${orgId}/${letterheadId}/first-page.pdf`);
    });
  });
});
