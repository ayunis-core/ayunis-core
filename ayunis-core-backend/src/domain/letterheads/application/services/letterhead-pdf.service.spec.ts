import type { UUID } from 'crypto';
import { PDFDocument } from 'pdf-lib';
import { LetterheadPdfService } from './letterhead-pdf.service';
import { LetterheadInvalidPdfError } from '../letterheads.errors';

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

    it('should reject a multi-page PDF', async () => {
      const pdf = await createMultiPagePdf(3);
      await expect(
        service.validateSinglePagePdf(pdf, 'first page'),
      ).rejects.toThrow(LetterheadInvalidPdfError);
    });

    it('should reject an invalid buffer', async () => {
      const buffer = Buffer.from('not a pdf');
      await expect(
        service.validateSinglePagePdf(buffer, 'first page'),
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
