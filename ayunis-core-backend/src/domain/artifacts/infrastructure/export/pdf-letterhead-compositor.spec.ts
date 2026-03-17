import { PDFDocument, rgb } from 'pdf-lib';
import { PdfLetterheadCompositor } from './pdf-letterhead-compositor';

async function createSinglePagePdf(label: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  page.drawText(label, { x: 50, y: 750, size: 14, color: rgb(0, 0, 0) });
  return Buffer.from(await doc.save());
}

async function createMultiPagePdf(pageCount: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([595.28, 841.89]);
    page.drawText(`Content page ${i + 1}`, {
      x: 50,
      y: 400,
      size: 12,
      color: rgb(0, 0, 0),
    });
  }
  return Buffer.from(await doc.save());
}

describe('PdfLetterheadCompositor', () => {
  let compositor: PdfLetterheadCompositor;

  beforeEach(() => {
    compositor = new PdfLetterheadCompositor();
  });

  it('should composite a single-page content PDF with first-page background', async () => {
    const contentPdf = await createSinglePagePdf('Content');
    const firstPagePdf = await createSinglePagePdf('Background');

    const result = await compositor.composite(contentPdf, firstPagePdf);

    const outputDoc = await PDFDocument.load(result);
    expect(outputDoc.getPageCount()).toBe(1);

    const page = outputDoc.getPage(0);
    const { width, height } = page.getSize();
    expect(width).toBeCloseTo(595.28, 1);
    expect(height).toBeCloseTo(841.89, 1);
  });

  it('should composite multi-page content with first and continuation backgrounds', async () => {
    const contentPdf = await createMultiPagePdf(3);
    const firstPagePdf = await createSinglePagePdf('First BG');
    const continuationPagePdf = await createSinglePagePdf('Continuation BG');

    const result = await compositor.composite(
      contentPdf,
      firstPagePdf,
      continuationPagePdf,
    );

    const outputDoc = await PDFDocument.load(result);
    expect(outputDoc.getPageCount()).toBe(3);
  });

  it('should copy continuation pages as-is when no continuation background is provided', async () => {
    const contentPdf = await createMultiPagePdf(2);
    const firstPagePdf = await createSinglePagePdf('First BG');

    const result = await compositor.composite(contentPdf, firstPagePdf);

    const outputDoc = await PDFDocument.load(result);
    expect(outputDoc.getPageCount()).toBe(2);
  });

  it('should produce a valid PDF buffer', async () => {
    const contentPdf = await createSinglePagePdf('Content');
    const firstPagePdf = await createSinglePagePdf('Background');

    const result = await compositor.composite(contentPdf, firstPagePdf);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('should preserve page dimensions from content PDF', async () => {
    const doc = await PDFDocument.create();
    const customWidth = 400;
    const customHeight = 600;
    const page = doc.addPage([customWidth, customHeight]);
    page.drawText('Custom size', { x: 10, y: 300, size: 10 });
    const contentPdf = Buffer.from(await doc.save());

    const firstPagePdf = await createSinglePagePdf('BG');

    const result = await compositor.composite(contentPdf, firstPagePdf);

    const outputDoc = await PDFDocument.load(result);
    const outputPage = outputDoc.getPage(0);
    const { width, height } = outputPage.getSize();
    expect(width).toBeCloseTo(customWidth, 1);
    expect(height).toBeCloseTo(customHeight, 1);
  });
});
