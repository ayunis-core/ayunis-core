import { sanitizeHtmlContent } from './sanitize-html-content';

describe('sanitizeHtmlContent', () => {
  describe('dangerous content removal', () => {
    it('should strip script tags and their contents', () => {
      const html = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
      const result = sanitizeHtmlContent(html);
      expect(result).toBe('<p>Hello</p><p>World</p>');
      expect(result).not.toContain('<script');
      expect(result).not.toContain('alert');
    });

    it('should strip iframe elements', () => {
      const html =
        '<p>Content</p><iframe src="https://evil.com"></iframe><p>More</p>';
      const result = sanitizeHtmlContent(html);
      expect(result).toBe('<p>Content</p><p>More</p>');
      expect(result).not.toContain('<iframe');
    });

    it('should strip event handler attributes', () => {
      const html = '<p onclick="alert(1)">Click me</p>';
      const result = sanitizeHtmlContent(html);
      expect(result).toBe('<p>Click me</p>');
      expect(result).not.toContain('onclick');
    });

    it('should strip onerror attributes on images', () => {
      const html = '<img src="x" onerror="alert(1)" alt="broken">';
      const result = sanitizeHtmlContent(html);
      expect(result).not.toContain('onerror');
      expect(result).toContain('alt="broken"');
    });

    it('should strip onload attributes', () => {
      const html = '<img src="photo.jpg" onload="stealCookies()" alt="Photo">';
      const result = sanitizeHtmlContent(html);
      expect(result).not.toContain('onload');
      expect(result).toContain('src="photo.jpg"');
    });

    it('should strip object and embed elements', () => {
      const html =
        '<object data="evil.swf"></object><embed src="evil.swf"><p>Safe</p>';
      const result = sanitizeHtmlContent(html);
      expect(result).toBe('<p>Safe</p>');
    });

    it('should strip form elements', () => {
      const html =
        '<form action="https://evil.com"><input type="text"><button>Submit</button></form><p>Content</p>';
      const result = sanitizeHtmlContent(html);
      expect(result).not.toContain('<form');
      expect(result).not.toContain('<input');
      expect(result).toContain('<p>Content</p>');
    });

    it('should strip javascript: URLs from links', () => {
      const html = '<a href="javascript:alert(1)">Click</a>';
      const result = sanitizeHtmlContent(html);
      expect(result).not.toContain('javascript:');
    });

    it('should strip data: URLs from images', () => {
      const html =
        '<img src="data:text/html,<script>alert(1)</script>" alt="xss">';
      const result = sanitizeHtmlContent(html);
      expect(result).not.toContain('data:');
    });
  });

  describe('safe Tiptap HTML preservation', () => {
    it('should preserve headings', () => {
      const html =
        '<h1>Title</h1><h2>Subtitle</h2><h3>Section</h3><h4>Sub</h4>';
      expect(sanitizeHtmlContent(html)).toBe(html);
    });

    it('should preserve paragraphs with inline formatting', () => {
      const html =
        '<p>This is <strong>bold</strong>, <em>italic</em>, <u>underlined</u>, and <s>strikethrough</s> text.</p>';
      expect(sanitizeHtmlContent(html)).toBe(html);
    });

    it('should preserve unordered and ordered lists', () => {
      const html =
        '<ul><li>Item 1</li><li>Item 2</li></ul><ol><li>First</li><li>Second</li></ol>';
      expect(sanitizeHtmlContent(html)).toBe(html);
    });

    it('should preserve links with href and target', () => {
      const html =
        '<p><a href="https://example.com" target="_blank">Link text</a></p>';
      expect(sanitizeHtmlContent(html)).toBe(html);
    });

    it('should preserve images with src and alt', () => {
      const html = '<img src="https://example.com/photo.jpg" alt="A photo" />';
      const result = sanitizeHtmlContent(html);
      expect(result).toContain('src="https://example.com/photo.jpg"');
      expect(result).toContain('alt="A photo"');
    });

    it('should preserve tables with headers and rows', () => {
      const html =
        '<table><thead><tr><th>Name</th><th>Value</th></tr></thead><tbody><tr><td>Row 1</td><td>Data 1</td></tr></tbody></table>';
      expect(sanitizeHtmlContent(html)).toBe(html);
    });

    it('should preserve code blocks', () => {
      const html =
        '<pre><code class="language-typescript">const x = 42;</code></pre>';
      expect(sanitizeHtmlContent(html)).toBe(html);
    });

    it('should preserve inline code', () => {
      const html = '<p>Use the <code>console.log()</code> function.</p>';
      expect(sanitizeHtmlContent(html)).toBe(html);
    });

    it('should preserve blockquotes', () => {
      const html = '<blockquote><p>A wise quote</p></blockquote>';
      expect(sanitizeHtmlContent(html)).toBe(html);
    });

    it('should preserve horizontal rules', () => {
      const html = '<p>Above</p><hr /><p>Below</p>';
      expect(sanitizeHtmlContent(html)).toBe(html);
    });

    it('should preserve table cells with colspan and rowspan', () => {
      const html =
        '<table><tr><td colspan="2">Merged</td></tr><tr><td>A</td><td>B</td></tr></table>';
      expect(sanitizeHtmlContent(html)).toBe(html);
    });

    it('should preserve text-align styles', () => {
      const html = '<p style="text-align:center">Centered text</p>';
      expect(sanitizeHtmlContent(html)).toBe(html);
    });

    it('should handle empty HTML', () => {
      expect(sanitizeHtmlContent('')).toBe('');
    });
  });
});
