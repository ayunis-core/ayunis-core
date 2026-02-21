import { HtmlDocumentExportService } from './html-document-export.service';

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
  });

  describe('applyInlineStyles', () => {
    const applyInlineStyles = (html: string): string => {
      return (service as any).applyInlineStyles(html);
    };

    it('should not affect <pre> tags when styling <p> tags', () => {
      const html = '<pre><code>const x = 1;</code></pre><p>Normal text</p>';
      const result = applyInlineStyles(html);

      expect(result).toContain('<pre><code>const x = 1;</code></pre>');
      expect(result).toContain('<p style="margin-bottom:8pt"');
      expect(result).not.toMatch(/<pre style=/);
    });

    it('should not affect <thead> tags when styling <th> tags', () => {
      const html = '<table><thead><tr><th>Name</th></tr></thead></table>';
      const result = applyInlineStyles(html);

      expect(result).not.toMatch(/<thead style=/);
      expect(result).toContain(
        '<th style="border:1px solid #ccc;padding:6pt 8pt;text-align:left;background-color:#f5f5f5;font-weight:bold"',
      );
    });

    it('should merge styles when element already has a style attribute', () => {
      const html = '<p style="text-align:center">Centered paragraph</p>';
      const result = applyInlineStyles(html);

      // Should have exactly one style attribute with both values
      const styleMatches = result.match(/style="[^"]*text-align:center[^"]*"/);
      expect(styleMatches).not.toBeNull();
      expect(result).toContain('margin-bottom:8pt');

      // Must NOT have two separate style attributes
      expect(result).not.toMatch(/style="[^"]*"\s+style="[^"]*"/);
    });

    it('should not affect <ol> when styling <ol> does not break other tags', () => {
      const html = '<ol><li>First</li></ol>';
      const result = applyInlineStyles(html);

      expect(result).toContain(
        '<ol style="margin-bottom:8pt;padding-left:24pt"',
      );
    });
  });

  describe('exportToPdf', () => {
    it('should produce a non-empty buffer from sample HTML', async () => {
      const result = await service.exportToPdf(sampleHtml);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    }, 30000);

    it('should produce a valid PDF file (PDF magic bytes)', async () => {
      const result = await service.exportToPdf(sampleHtml);

      // PDF files start with %PDF
      const header = result.subarray(0, 4).toString('ascii');
      expect(header).toBe('%PDF');
    }, 30000);

    it('should handle minimal HTML', async () => {
      const result = await service.exportToPdf('<p>Hello</p>');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    }, 30000);

    it('should relaunch browser if disconnected', async () => {
      // Force-close the browser to simulate a crash
      await service.onModuleDestroy();

      const result = await service.exportToPdf('<p>After reconnect</p>');

      expect(result).toBeInstanceOf(Buffer);
      const header = result.subarray(0, 4).toString('ascii');
      expect(header).toBe('%PDF');
    }, 30000);
  });
});
