import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { HtmlDocumentExportService } from './html-document-export.service';
import type { PdfLetterheadCompositor } from './pdf-letterhead-compositor';
import type { LetterheadConfig } from '../../application/ports/document-export.port';
import { ArtifactExportTimeoutError } from '../../application/artifacts.errors';
import { TimeoutError } from 'puppeteer-core';
import * as JSZip from 'jszip';

async function extractDocumentXml(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const docXml = zip.file('word/document.xml');
  if (!docXml) throw new Error('No word/document.xml in DOCX');
  return docXml.async('text');
}

// ---------------------------------------------------------------------------
// Puppeteer mock — avoids launching a real browser in unit tests
// ---------------------------------------------------------------------------
const FAKE_PDF = Buffer.from('%PDF-1.4 fake');

const mockPage = {
  setRequestInterception: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
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

jest.mock('puppeteer-core', () => {
  const { TimeoutError: ActualTimeoutError } =
    jest.requireActual('puppeteer-core');
  return {
    __esModule: true,
    TimeoutError: ActualTimeoutError,
    default: { launch: (...args: unknown[]) => mockLaunch(...args) },
  };
});

describe('HtmlDocumentExportService', () => {
  let service: HtmlDocumentExportService;
  let compositor: jest.Mocked<PdfLetterheadCompositor>;
  const originalPuppeteerExecutablePath = process.env.PUPPETEER_EXECUTABLE_PATH;

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
    process.env.PUPPETEER_EXECUTABLE_PATH = '/mock/chromium';

    compositor = {
      composite: jest.fn().mockResolvedValue(Buffer.from('%PDF-composited')),
    } as unknown as jest.Mocked<PdfLetterheadCompositor>;
    service = new HtmlDocumentExportService(createPinoLoggerMock(), compositor);
  });

  afterAll(async () => {
    await service.onModuleDestroy();

    if (originalPuppeteerExecutablePath === undefined) {
      delete process.env.PUPPETEER_EXECUTABLE_PATH;
      return;
    }

    process.env.PUPPETEER_EXECUTABLE_PATH = originalPuppeteerExecutablePath;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockBrowser.connected = true;
    compositor.composite.mockResolvedValue(Buffer.from('%PDF-composited'));
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

    it('should preserve line-height and margin spacing through sanitization', async () => {
      const html =
        '<p style="line-height: 1; margin-top: 0pt; margin-bottom: 0pt; text-align: justify;">Body</p>';
      const result = await service.exportToDocx(html);
      const xml = await extractDocumentXml(result);

      expect(xml).toMatch(/<w:spacing[^>]*w:line="240"[^>]*w:lineRule="auto"/);
      expect(xml).toMatch(/<w:spacing[^>]*w:after="0"/);
      expect(xml).toMatch(/<w:spacing[^>]*w:before="0"/);
      expect(xml).toContain('both'); // JUSTIFIED alignment
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

    it('should abort remote resources before rendering', async () => {
      await service.exportToPdf(
        '<p>Agenda</p><img src="https://assets.example.org/header.png">',
      );

      expect(mockPage.setRequestInterception).toHaveBeenCalledWith(true);
      expect(mockPage.on).toHaveBeenCalledWith('request', expect.any(Function));

      const handleRequest = mockPage.on.mock.calls[0][1] as (request: {
        url: () => string;
        abort: () => void;
        continue: () => void;
      }) => void;
      const request = {
        url: () => 'https://assets.example.org/header.png',
        abort: jest.fn(),
        continue: jest.fn(),
      };
      handleRequest(request);

      expect(request.abort).toHaveBeenCalled();
      expect(request.continue).not.toHaveBeenCalled();
    });

    it('should allow embedded data resources', async () => {
      await service.exportToPdf('<p>Agenda</p>');

      const handleRequest = mockPage.on.mock.calls[0][1] as (request: {
        url: () => string;
        abort: () => void;
        continue: () => void;
      }) => void;
      const request = {
        url: () => 'data:image/png;base64,aGVhZGVy',
        abort: jest.fn(),
        continue: jest.fn(),
      };
      handleRequest(request);

      expect(request.continue).toHaveBeenCalled();
      expect(request.abort).not.toHaveBeenCalled();
    });

    it('should classify Puppeteer timeouts as artifact export timeouts', async () => {
      mockPage.setContent.mockRejectedValueOnce(
        new TimeoutError('Navigation timeout of 30000 ms exceeded'),
      );

      await expect(service.exportToPdf('<p>Agenda</p>')).rejects.toBeInstanceOf(
        ArtifactExportTimeoutError,
      );
      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should generate A4 PDF with correct margins when no letterhead', async () => {
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

    describe('with letterhead', () => {
      const letterheadConfig: LetterheadConfig = {
        firstPagePdf: Buffer.from('%PDF-first-bg'),
        continuationPagePdf: Buffer.from('%PDF-cont-bg'),
        firstPageMargins: { top: 55, right: 15, bottom: 20, left: 15 },
        continuationPageMargins: { top: 20, right: 15, bottom: 20, left: 15 },
      };

      it('should set zero margins in Puppeteer when letterhead is provided', async () => {
        await service.exportToPdf('<p>Hello</p>', letterheadConfig);

        expect(mockPage.pdf).toHaveBeenCalledWith({
          format: 'A4',
          margin: {
            top: '0mm',
            right: '0mm',
            bottom: '0mm',
            left: '0mm',
          },
          preferCSSPageSize: true,
          printBackground: true,
        });
      });

      it('should inject @page CSS rules with letterhead margins', async () => {
        await service.exportToPdf('<p>Hello</p>', letterheadConfig);

        const htmlArg = mockPage.setContent.mock.calls[0][0] as string;
        expect(htmlArg).toContain('@page :first');
        expect(htmlArg).toContain('55mm');
        expect(htmlArg).toContain('15mm');
        expect(htmlArg).toContain(
          '@page {\n    size: A4;\n    margin: 20mm 15mm 20mm 15mm;\n  }',
        );
      });

      it('should declare an explicit A4 page size so preferCSSPageSize keeps A4', async () => {
        await service.exportToPdf('<p>Hello</p>', letterheadConfig);

        const htmlArg = mockPage.setContent.mock.calls[0][0] as string;
        expect(htmlArg).toContain(
          '@page :first {\n    size: A4;\n    margin: 55mm 15mm 20mm 15mm;\n  }',
        );
      });

      it('should call compositor with content PDF and background PDFs', async () => {
        await service.exportToPdf('<p>Hello</p>', letterheadConfig);

        expect(compositor.composite).toHaveBeenCalledWith(
          FAKE_PDF,
          letterheadConfig.firstPagePdf,
          letterheadConfig.continuationPagePdf,
        );
      });

      it('should return the composited PDF buffer', async () => {
        const compositedPdf = Buffer.from('%PDF-composited-result');
        compositor.composite.mockResolvedValue(compositedPdf);

        const result = await service.exportToPdf(
          '<p>Hello</p>',
          letterheadConfig,
        );

        expect(result).toBe(compositedPdf);
      });

      it('should not call compositor when no letterhead is provided', async () => {
        await service.exportToPdf('<p>Hello</p>');

        expect(compositor.composite).not.toHaveBeenCalled();
      });
    });
  });
});
