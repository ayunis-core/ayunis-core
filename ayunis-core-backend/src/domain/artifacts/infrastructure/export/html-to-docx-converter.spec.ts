import { convertHtmlToDocx } from './html-to-docx-converter';
import * as JSZip from 'jszip';

/** Helper: extract document.xml from a DOCX buffer. */
async function extractDocumentXml(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const docXml = zip.file('word/document.xml');
  if (!docXml) throw new Error('No word/document.xml in DOCX');
  return docXml.async('text');
}

describe('convertHtmlToDocx', () => {
  it('should produce a valid DOCX (ZIP with document.xml)', async () => {
    const buffer = await convertHtmlToDocx('<p>Hello</p>');

    expect(buffer[0]).toBe(0x50); // P
    expect(buffer[1]).toBe(0x4b); // K

    const xml = await extractDocumentXml(buffer);
    expect(xml).toContain('Hello');
  });

  it('should render headings with Heading styles', async () => {
    const buffer = await convertHtmlToDocx('<h1>Title</h1><h2>Subtitle</h2>');
    const xml = await extractDocumentXml(buffer);

    expect(xml).toContain('Heading1');
    expect(xml).toContain('Title');
    expect(xml).toContain('Heading2');
    expect(xml).toContain('Subtitle');
  });

  it('should render paragraphs without heading styles', async () => {
    const buffer = await convertHtmlToDocx('<p>Normal text</p>');
    const xml = await extractDocumentXml(buffer);

    expect(xml).toContain('Normal text');
    expect(xml).not.toContain('Heading');
  });

  it('should not leak bold from headings to paragraphs', async () => {
    const buffer = await convertHtmlToDocx(
      '<h1>Bold Heading</h1><p>Normal paragraph</p>',
    );
    const xml = await extractDocumentXml(buffer);

    // The paragraph after the heading must NOT have <w:b/> in its run
    const afterHeading = xml.split('Normal paragraph')[0];
    const lastParagraph = afterHeading.split('<w:p>').pop()!;
    // The run properties for the normal paragraph should not contain bold
    expect(lastParagraph).not.toMatch(/<w:b\/>/);
  });

  it('should apply bold only to <strong> content', async () => {
    const buffer = await convertHtmlToDocx(
      '<p>Normal <strong>bold</strong> normal</p>',
    );
    const xml = await extractDocumentXml(buffer);

    expect(xml).toContain('Normal ');
    expect(xml).toContain('bold');
    // There should be a <w:b/> somewhere for the bold run
    expect(xml).toMatch(/<w:b\/>/);
  });

  it('should apply italic to <em> content', async () => {
    const buffer = await convertHtmlToDocx('<p><em>italic</em></p>');
    const xml = await extractDocumentXml(buffer);

    expect(xml).toContain('italic');
    expect(xml).toMatch(/<w:i\/>/);
  });

  it('should apply underline to <u> content', async () => {
    const buffer = await convertHtmlToDocx('<p><u>underlined</u></p>');
    const xml = await extractDocumentXml(buffer);

    expect(xml).toContain('underlined');
    expect(xml).toMatch(/<w:u /);
  });

  it('should apply strikethrough to <s> content', async () => {
    const buffer = await convertHtmlToDocx('<p><s>deleted</s></p>');
    const xml = await extractDocumentXml(buffer);

    expect(xml).toContain('deleted');
    expect(xml).toMatch(/<w:strike\/>/);
  });

  it('should render bullet lists', async () => {
    const buffer = await convertHtmlToDocx(
      '<ul><li><p>Item 1</p></li><li><p>Item 2</p></li></ul>',
    );
    const xml = await extractDocumentXml(buffer);

    expect(xml).toContain('Item 1');
    expect(xml).toContain('Item 2');
  });

  it('should render ordered lists', async () => {
    const buffer = await convertHtmlToDocx(
      '<ol><li><p>First</p></li><li><p>Second</p></li></ol>',
    );
    const xml = await extractDocumentXml(buffer);

    expect(xml).toContain('First');
    expect(xml).toContain('Second');
    // Ordered lists use <w:numPr> with a numbering reference
    expect(xml).toContain('w:numId');
  });

  it('should render tables with header styling', async () => {
    const buffer = await convertHtmlToDocx(
      '<table><tr><th>Name</th></tr><tr><td>Alice</td></tr></table>',
    );
    const xml = await extractDocumentXml(buffer);

    expect(xml).toContain('Name');
    expect(xml).toContain('Alice');
  });

  it('should render links as external hyperlinks', async () => {
    const buffer = await convertHtmlToDocx(
      '<p><a href="https://example.com">Click here</a></p>',
    );
    const xml = await extractDocumentXml(buffer);

    expect(xml).toContain('Click here');
    // External hyperlinks use relationship IDs
    expect(xml).toContain('hyperlink');
  });

  it('should render code blocks with monospace font', async () => {
    const buffer = await convertHtmlToDocx(
      '<pre><code>const x = 1;</code></pre>',
    );
    const xml = await extractDocumentXml(buffer);

    expect(xml).toContain('const x = 1;');
    expect(xml).toContain('Courier New');
  });

  it('should render blockquotes with indent', async () => {
    const buffer = await convertHtmlToDocx(
      '<blockquote><p>Quoted text</p></blockquote>',
    );
    const xml = await extractDocumentXml(buffer);

    expect(xml).toContain('Quoted text');
    expect(xml).toMatch(/<w:ind /);
  });

  it('should handle empty input', async () => {
    const buffer = await convertHtmlToDocx('');

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('should preserve text-align on paragraphs', async () => {
    const buffer = await convertHtmlToDocx(
      '<p style="text-align: center">Centered</p>',
    );
    const xml = await extractDocumentXml(buffer);

    expect(xml).toContain('Centered');
    expect(xml).toContain('center');
  });

  it('should preserve text-align on headings', async () => {
    const buffer = await convertHtmlToDocx(
      '<h1 style="text-align: right">Right Heading</h1>',
    );
    const xml = await extractDocumentXml(buffer);

    expect(xml).toContain('Right Heading');
    expect(xml).toContain('right');
  });

  it('should render line-height: 1 as single line spacing', async () => {
    const buffer = await convertHtmlToDocx(
      '<p style="line-height: 1">Single spaced</p>',
    );
    const xml = await extractDocumentXml(buffer);

    expect(xml).toContain('Single spaced');
    expect(xml).toMatch(/<w:spacing[^>]*w:line="240"[^>]*w:lineRule="auto"/);
  });

  it('should render line-height: 1.5 as one-and-a-half line spacing', async () => {
    const buffer = await convertHtmlToDocx(
      '<p style="line-height: 1.5">Loose</p>',
    );
    const xml = await extractDocumentXml(buffer);

    expect(xml).toMatch(/<w:spacing[^>]*w:line="360"[^>]*w:lineRule="auto"/);
  });

  it('should render margin-bottom as spacing after the paragraph', async () => {
    const buffer = await convertHtmlToDocx(
      '<p style="margin-bottom: 0pt">No gap after</p>',
    );
    const xml = await extractDocumentXml(buffer);

    expect(xml).toContain('No gap after');
    expect(xml).toMatch(/<w:spacing[^>]*w:after="0"/);
  });

  it('should render margin-top as spacing before the paragraph', async () => {
    const buffer = await convertHtmlToDocx(
      '<p style="margin-top: 6pt">Gap before</p>',
    );
    const xml = await extractDocumentXml(buffer);

    expect(xml).toMatch(/<w:spacing[^>]*w:before="120"/);
  });

  it('should preserve all paragraph spacing from combined inline styles', async () => {
    const buffer = await convertHtmlToDocx(
      '<p style="font-size: 12pt; line-height: 1; margin-top: 0pt; margin-bottom: 0pt; padding-top: 0; padding-bottom: 0; text-align: justify;">Body</p>',
    );
    const xml = await extractDocumentXml(buffer);

    expect(xml).toContain('Body');
    expect(xml).toContain('both'); // JUSTIFIED alignment renders as w:val="both"
    expect(xml).toMatch(/w:line="240"/);
    expect(xml).toMatch(/w:lineRule="auto"/);
    expect(xml).toMatch(/w:after="0"/);
    expect(xml).toMatch(/w:before="0"/);
  });

  it('should preserve spacing on headings, list items, and table cells', async () => {
    const buffer = await convertHtmlToDocx(
      '<h1 style="margin-bottom: 0pt">Heading</h1>' +
        '<ul><li><p style="line-height: 1">Item</p></li></ul>' +
        '<table><tr><td style="margin-bottom: 0pt">Cell</td></tr></table>',
    );
    const xml = await extractDocumentXml(buffer);

    expect(xml).toContain('Heading');
    expect(xml).toContain('Item');
    expect(xml).toContain('Cell');
    expect(
      (xml.match(/<w:spacing[^>]*w:after="0"/g) ?? []).length,
    ).toBeGreaterThanOrEqual(2);
    expect(xml).toMatch(/<w:spacing[^>]*w:line="240"/);
  });

  it('should convert px margins to twips', async () => {
    const buffer = await convertHtmlToDocx(
      '<p style="margin-bottom: 16px">Pixels</p>',
    );
    const xml = await extractDocumentXml(buffer);

    // 16px * 15 twips/px = 240
    expect(xml).toMatch(/<w:spacing[^>]*w:after="240"/);
  });

  it('should render px line-height as exact line spacing', async () => {
    const buffer = await convertHtmlToDocx(
      '<p style="line-height: 16px">Fixed</p>',
    );
    const xml = await extractDocumentXml(buffer);

    // 16px * 15 twips/px = 240, exact line rule
    expect(xml).toMatch(/<w:spacing[^>]*w:line="240"[^>]*w:lineRule="exact"/);
  });

  it('should read table cell spacing from the nested paragraph', async () => {
    const buffer = await convertHtmlToDocx(
      '<table><tr><td><p style="line-height: 1; margin-bottom: 0pt; text-align: right">Cell</p></td></tr></table>',
    );
    const xml = await extractDocumentXml(buffer);

    expect(xml).toContain('Cell');
    expect(xml).toMatch(/<w:spacing[^>]*w:line="240"[^>]*w:lineRule="auto"/);
    expect(xml).toMatch(/<w:spacing[^>]*w:after="0"/);
    expect(xml).toContain('right');
  });
});
