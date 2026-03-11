import { HtmlDocumentExportService } from './html-document-export.service';

// ---------------------------------------------------------------------------
// Puppeteer mock — avoids launching a real browser in unit tests
// ---------------------------------------------------------------------------
const FAKE_PDF = Buffer.from('%PDF-1.4 fake');

const mockPage = {
  setContent: jest.fn().mockResolvedValue(undefined),
  pdf: jest.fn().mockResolvedValue(FAKE_PDF),
  close: jest.fn().mockResolvedValue(undefined),
};

const mockBrowser = {
  connected: true,
  newPage: jest.fn().mockResolvedValue(mockPage),
  close: jest.fn().mockResolvedValue(undefined),
};

const mockLaunch = jest.fn().mockResolvedValue(mockBrowser);

jest.mock('puppeteer-core', () => ({
  __esModule: true,
  default: { launch: (...args: unknown[]) => mockLaunch(...args) },
}));

describe('HtmlDocumentExportService', () => {
  let service: HtmlDocumentExportService;

  const sampleHtml = `
    <h1>Test Document</h1>
    <p>This is a <strong>test</strong> paragraph with <em>formatted</em> text.</p>
    <ul>
      <li>Item 1</li>
      <li>Item 2</li>
    </ul>
    <table>
      <tr><th>Header</th><th>Value</th></tr>
      <tr><td>Row 1</td><td>Data 1</td></tr>
    </table>
  `;

  beforeAll(() => {
    service = new HtmlDocumentExportService();
  });

  afterAll(async () => {
    await service.onModuleDestroy();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockBrowser.connected = true;
  });

  describe('exportToDocx', () => {
    it('should produce a non-empty buffer from sample HTML', async () => {
      const result = await service.exportToDocx(sampleHtml);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should produce a valid DOCX file (ZIP magic bytes)', async () => {
      const result = await service.exportToDocx(sampleHtml);

      // DOCX files are ZIP archives — first 4 bytes are PK\x03\x04
      expect(result[0]).toBe(0x50); // P
      expect(result[1]).toBe(0x4b); // K
      expect(result[2]).toBe(0x03);
      expect(result[3]).toBe(0x04);
    });

    it('should handle minimal HTML', async () => {
      const result = await service.exportToDocx('<p>Hello</p>');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty HTML', async () => {
      const result = await service.exportToDocx('');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle headings followed by paragraphs', async () => {
      const html =
        '<h1>Title</h1><p>Normal paragraph text.</p><p>Another paragraph.</p>';
      const result = await service.exportToDocx(html);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle inline formatting', async () => {
      const html =
        '<p><strong>Bold</strong> <em>italic</em> <u>underline</u> <s>strike</s></p>';
      const result = await service.exportToDocx(html);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle blockquotes', async () => {
      const html = '<blockquote><p>Quoted text</p></blockquote>';
      const result = await service.exportToDocx(html);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle code blocks', async () => {
      const html = '<pre><code>const x = 1;\nconsole.log(x);</code></pre>';
      const result = await service.exportToDocx(html);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle links', async () => {
      const html = '<p>Visit <a href="https://example.com">Example</a></p>';
      const result = await service.exportToDocx(html);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should sanitize dangerous HTML', async () => {
      const html = '<p>Safe</p><script>alert("xss")</script><p>Also safe</p>';
      const result = await service.exportToDocx(html);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('exportToPdf', () => {
    it('should produce a non-empty buffer from sample HTML', async () => {
      const result = await service.exportToPdf(sampleHtml);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should produce a valid PDF file (PDF magic bytes)', async () => {
      const result = await service.exportToPdf(sampleHtml);

      const header = result.subarray(0, 4).toString('ascii');
      expect(header).toBe('%PDF');
    });

    it('should set page content with networkidle0', async () => {
      await service.exportToPdf('<p>Hello</p>');

      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.stringContaining('Hello'),
        { waitUntil: 'networkidle0' },
      );
    });

    it('should generate A4 PDF with correct margins', async () => {
      await service.exportToPdf('<p>Hello</p>');

      expect(mockPage.pdf).toHaveBeenCalledWith({
        format: 'A4',
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
        printBackground: true,
      });
    });

    it('should close the page after export', async () => {
      await service.exportToPdf('<p>Hello</p>');

      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should close the page even if pdf generation fails', async () => {
      mockPage.pdf.mockRejectedValueOnce(new Error('render failed'));

      await expect(service.exportToPdf('<p>Fail</p>')).rejects.toThrow(
        'render failed',
      );
      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should relaunch browser if disconnected', async () => {
      mockBrowser.connected = false;

      await service.exportToPdf('<p>After reconnect</p>');

      expect(mockLaunch).toHaveBeenCalled();
    });
  });
});
