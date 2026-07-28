import { PDFDocument, StandardFonts } from 'pdf-lib';
import { countPdfPages, extractPdfPageTexts } from './pdf-text-parser';

async function pdfBuffer(pageTexts: (string | null)[]): Promise<Buffer> {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  for (const text of pageTexts) {
    const page = document.addPage();
    if (text !== null) {
      page.drawText(text, { x: 50, y: 700, size: 12, font });
    }
  }
  // Object streams (pdf-lib's default) are not supported by pdf-parse's
  // bundled pdf.js; classic xref keeps the fixture readable by both libs.
  return Buffer.from(await document.save({ useObjectStreams: false }));
}

describe('countPdfPages', () => {
  it('returns the page count without extracting text', async () => {
    const buffer = await pdfBuffer(['Seite eins', 'Seite zwei', null]);

    await expect(countPdfPages(buffer)).resolves.toBe(3);
  });

  it('rejects on a non-PDF buffer', async () => {
    await expect(countPdfPages(Buffer.from('not a pdf'))).rejects.toThrow();
  });
});

describe('extractPdfPageTexts', () => {
  it('returns one entry per page with each page’s own text', async () => {
    const buffer = await pdfBuffer(['Haushaltsplan 2026', 'Anlage B']);

    const texts = await extractPdfPageTexts(buffer);

    expect(texts).toHaveLength(2);
    expect(texts[0]).toContain('Haushaltsplan 2026');
    expect(texts[1]).toContain('Anlage B');
  });

  it('yields an empty string for a page without a text layer', async () => {
    const buffer = await pdfBuffer(['Deckblatt', null]);

    const texts = await extractPdfPageTexts(buffer);

    expect(texts).toHaveLength(2);
    expect(texts[1]).toBe('');
  });
});
