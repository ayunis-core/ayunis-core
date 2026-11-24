import { PDFDocument, StandardFonts } from 'pdf-lib';
import { File } from 'src/domain/retrievers/file-retrievers/domain/file.entity';
import { NpmPdfParseFileRetrieverHandler } from './npm-pdf-parse-file-retriever.handler';

const RESOLUTION = 'Beschluss der Gemeindevertretung';

/** A readable PDF whose cross-reference offset is wrong, so PDF.js warns while repairing it. */
async function pdfThatMakesPdfJsWarn(): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage().drawText(RESOLUTION, { font, size: 10, x: 40, y: 700 });
  const bytes = Buffer.from(await pdf.save({ useObjectStreams: false }));
  return Buffer.from(
    bytes.toString('latin1').replace(/startxref\s+\d+/, 'startxref\n999999'),
    'latin1',
  );
}

describe('NpmPdfParseFileRetrieverHandler logging', () => {
  it('keeps PDF.js warnings out of stdout and still reads the text', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      const file = new File(
        await pdfThatMakesPdfJsWarn(),
        'protokoll.pdf',
        'application/pdf',
      );
      const handler = new NpmPdfParseFileRetrieverHandler();

      const pages = await handler.processFile(file, { splitPages: true });
      const whole = await handler.processFile(file);

      expect(pages.pages.map((page) => page.text)).toEqual([RESOLUTION]);
      expect(whole.pages[0].text).toContain(RESOLUTION);
      expect(log).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });
});
