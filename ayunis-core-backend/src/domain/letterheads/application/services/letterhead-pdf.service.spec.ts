import type { UUID } from 'crypto';
import { PDFDocument } from 'pdf-lib';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import {
  LetterheadInvalidPdfError,
  LetterheadPdfNotSinglePageError,
  LetterheadPdfPasswordProtectedError,
} from 'src/domain/letterheads/application/letterheads.errors';
import {
  createPdf,
  encryptPdf,
} from 'src/domain/letterheads/testing/pdf-fixtures';
import { LetterheadPdfService } from './letterhead-pdf.service';
import { PdfNormalizerService } from './pdf-normalizer.service';

async function isReadableByPdfLib(buffer: Buffer): Promise<boolean> {
  try {
    await PDFDocument.load(buffer);
    return true;
  } catch {
    return false;
  }
}

describe('LetterheadPdfService', () => {
  let service: LetterheadPdfService;

  beforeEach(() => {
    service = new LetterheadPdfService(
      createPinoLoggerMock(),
      new PdfNormalizerService(createPinoLoggerMock()),
    );
  });

  describe('prepareSinglePagePdf', () => {
    it('should keep a valid single-page PDF byte-for-byte', async () => {
      const pdf = await createPdf(1);

      const prepared = await service.prepareSinglePagePdf(pdf, 'first page');

      expect(prepared).toBe(pdf);
    });

    it('should reject a multi-page PDF and report the page count', async () => {
      const pdf = await createPdf(3);

      await expect(
        service.prepareSinglePagePdf(pdf, 'first page'),
      ).rejects.toMatchObject({
        constructor: LetterheadPdfNotSinglePageError,
        metadata: { pageCount: 3 },
      });
    });

    it('should accept a permission-encrypted PDF that pdf-lib alone rejects', async () => {
      const encrypted = await encryptPdf(
        await createPdf(1),
        'encrypt=aes-256,owner-password=locked',
      );
      expect(await isReadableByPdfLib(encrypted)).toBe(false);

      const prepared = await service.prepareSinglePagePdf(
        encrypted,
        'first page',
      );

      expect(await isReadableByPdfLib(prepared)).toBe(true);
    });

    it('should produce a decrypted PDF that can be composited onto an export', async () => {
      const encrypted = await encryptPdf(
        await createPdf(1),
        'encrypt=rc4-128,owner-password=locked',
      );

      const prepared = await service.prepareSinglePagePdf(
        encrypted,
        'first page',
      );

      const background = await PDFDocument.load(prepared);
      const output = await PDFDocument.create();
      const [embedded] = await output.embedPdf(background, [0]);
      output.addPage().drawPage(embedded);
      await expect(output.save()).resolves.toBeDefined();
    });

    it('should reject an encrypted PDF that has more than one page', async () => {
      const encrypted = await encryptPdf(
        await createPdf(2),
        'encrypt=aes-256,owner-password=locked',
      );

      await expect(
        service.prepareSinglePagePdf(encrypted, 'first page'),
      ).rejects.toThrow(LetterheadPdfNotSinglePageError);
    });

    it('should reject a PDF that needs a user password', async () => {
      const encrypted = await encryptPdf(
        await createPdf(1),
        'encrypt=aes-256,user-password=secret,owner-password=locked',
      );

      await expect(
        service.prepareSinglePagePdf(encrypted, 'first page'),
      ).rejects.toThrow(LetterheadPdfPasswordProtectedError);
    });

    it('should reject a buffer that is not a PDF', async () => {
      const buffer = Buffer.from('not a pdf');

      await expect(
        service.prepareSinglePagePdf(buffer, 'first page'),
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
