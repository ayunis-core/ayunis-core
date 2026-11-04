import { inflateSync } from 'zlib';
import { PDFArray, PDFDocument, PDFRawStream, degrees, rgb } from 'pdf-lib';
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

type Matrix = [number, number, number, number, number, number];

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

async function createRotatedLandscapePdf(rotation: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([A4_HEIGHT, A4_WIDTH]);
  page.setRotation(degrees(rotation));
  page.drawText('Letterhead', { x: 50, y: 50, size: 14 });
  return Buffer.from(await doc.save());
}

function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[1] * n[2],
    m[0] * n[1] + m[1] * n[3],
    m[2] * n[0] + m[3] * n[2],
    m[2] * n[1] + m[3] * n[3],
    m[4] * n[0] + m[5] * n[2] + n[4],
    m[4] * n[1] + m[5] * n[3] + n[5],
  ];
}

/** Composed `cm` transform in effect when the first (background) XObject is drawn. */
async function backgroundTransform(pdf: Buffer): Promise<Matrix> {
  const doc = await PDFDocument.load(pdf);
  const contents = doc.getPage(0).node.Contents();
  const stream =
    contents instanceof PDFArray
      ? contents.lookup(0, PDFRawStream)
      : (contents as PDFRawStream);
  const ops = inflateSync(stream.contents).toString('latin1');
  const beforeFirstDraw = ops.slice(0, ops.indexOf(' Do'));
  let ctm: Matrix = [1, 0, 0, 1, 0, 0];
  for (const line of beforeFirstDraw.split('\n')) {
    if (!line.endsWith(' cm')) continue;
    const m = line.split(' ').slice(0, 6).map(Number) as Matrix;
    ctm = multiply(m, ctm);
  }
  return ctm;
}

function apply(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
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

  it('should use first-page background for continuation pages when no continuation background is provided', async () => {
    const contentPdf = await createMultiPagePdf(3);
    const firstPagePdf = await createSinglePagePdf('First BG');

    const result = await compositor.composite(contentPdf, firstPagePdf);

    const outputDoc = await PDFDocument.load(result);
    expect(outputDoc.getPageCount()).toBe(3);

    // All pages should have the same dimensions (background was applied)
    for (let i = 0; i < 3; i++) {
      const page = outputDoc.getPage(i);
      const { width, height } = page.getSize();
      expect(width).toBeCloseTo(595.28, 1);
      expect(height).toBeCloseTo(841.89, 1);
    }
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

  // A /Rotate N page shows its MediaBox turned N degrees clockwise, so the
  // MediaBox origin and opposite corner must land on these visual corners.
  it.each([
    [90, [0, A4_HEIGHT], [A4_WIDTH, 0]],
    [180, [A4_WIDTH, A4_HEIGHT], [0, 0]],
    [270, [A4_WIDTH, 0], [0, A4_HEIGHT]],
    [-90, [A4_WIDTH, 0], [0, A4_HEIGHT]],
  ])(
    'should draw a background with /Rotate %i as it is displayed',
    async (rotation, expectedOrigin, expectedOppositeCorner) => {
      const contentPdf = await createSinglePagePdf('Content');
      const firstPagePdf = await createRotatedLandscapePdf(rotation);

      const result = await compositor.composite(contentPdf, firstPagePdf);
      const ctm = await backgroundTransform(result);

      const origin = apply(ctm, 0, 0);
      const opposite = apply(ctm, A4_HEIGHT, A4_WIDTH);
      expect(origin[0]).toBeCloseTo(expectedOrigin[0], 1);
      expect(origin[1]).toBeCloseTo(expectedOrigin[1], 1);
      expect(opposite[0]).toBeCloseTo(expectedOppositeCorner[0], 1);
      expect(opposite[1]).toBeCloseTo(expectedOppositeCorner[1], 1);
    },
  );
});
