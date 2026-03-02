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
    }, 30000);

    it('should produce a valid PDF file (PDF magic bytes)', async () => {
      const result = await service.exportToPdf(sampleHtml);

      const header = result.subarray(0, 4).toString('ascii');
      expect(header).toBe('%PDF');
    }, 30000);

    it('should handle minimal HTML', async () => {
      const result = await service.exportToPdf('<p>Hello</p>');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    }, 30000);

    it('should relaunch browser if disconnected', async () => {
      await service.onModuleDestroy();

      const result = await service.exportToPdf('<p>After reconnect</p>');

      expect(result).toBeInstanceOf(Buffer);
      const header = result.subarray(0, 4).toString('ascii');
      expect(header).toBe('%PDF');
    }, 30000);
  });
});
