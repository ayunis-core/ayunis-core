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
      const protocol = 'javascript';
      const html = `<a href="${protocol}:alert(1)">Click</a>`;
      const result = sanitizeHtmlContent(html);
      expect(result).not.toContain(`${protocol}:`);
    });

    it('should strip data: URLs from images', () => {
      const html =
        '<img src="data:text/html,<script>alert(1)</script>" alt="xss">';
      const result = sanitizeHtmlContent(html);
      expect(result).not.toContain('data:');
    });
  });

  describe('safe Tiptap HTML preservation', () => {
    it.each([
      {
        name: 'headings',
        html: '<h1>Title</h1><h2>Subtitle</h2><h3>Section</h3><h4>Sub</h4>',
      },
      {
        name: 'paragraphs with inline formatting',
        html: '<p>This is <strong>bold</strong>, <em>italic</em>, <u>underlined</u>, and <s>strikethrough</s> text.</p>',
      },
      {
        name: 'unordered and ordered lists',
        html: '<ul><li>Item 1</li><li>Item 2</li></ul><ol><li>First</li><li>Second</li></ol>',
      },
      {
        name: 'links with href and target',
        html: '<p><a href="https://example.com" target="_blank">Link text</a></p>',
      },
      {
        name: 'tables with headers and rows',
        html: '<table><thead><tr><th>Name</th><th>Value</th></tr></thead><tbody><tr><td>Row 1</td><td>Data 1</td></tr></tbody></table>',
      },
      {
        name: 'code blocks',
        html: '<pre><code class="language-typescript">const x = 42;</code></pre>',
      },
      {
        name: 'inline code',
        html: '<p>Use the <code>console.log()</code> function.</p>',
      },
      {
        name: 'blockquotes',
        html: '<blockquote><p>A wise quote</p></blockquote>',
      },
      { name: 'horizontal rules', html: '<p>Above</p><hr /><p>Below</p>' },
      {
        name: 'table cells with colspan and rowspan',
        html: '<table><tr><td colspan="2">Merged</td></tr><tr><td>A</td><td>B</td></tr></table>',
      },
      {
        name: 'text-align styles',
        html: '<p style="text-align:center">Centered text</p>',
      },
    ])('should preserve $name', ({ html }) => {
      expect(sanitizeHtmlContent(html)).toBe(html);
    });

    it('should preserve images with src and alt', () => {
      const html = '<img src="https://example.com/photo.jpg" alt="A photo" />';
      const result = sanitizeHtmlContent(html);
      expect(result).toContain('src="https://example.com/photo.jpg"');
      expect(result).toContain('alt="A photo"');
    });

    it.each([
      [
        'paragraph spacing styles for export',
        '<p style="line-height:1;margin-top:0pt;margin-bottom:0pt">Text</p>',
      ],
      [
        'paragraph spacing styles on list items',
        '<ul><li style="line-height:1;margin-top:0pt;margin-bottom:0pt">Item</li></ul>',
      ],
      [
        'auto vertical margins produced by the editor',
        '<p style="margin-top:auto;margin-bottom:auto">Text</p>',
      ],
    ])('should preserve %s', (_name, html) => {
      expect(sanitizeHtmlContent(html)).toBe(html);
    });

    it('should strip spacing styles with unsupported units', () => {
      const html = '<p style="line-height:1.5em;margin-bottom:2rem">Text</p>';
      const result = sanitizeHtmlContent(html);
      expect(result).not.toContain('line-height');
      expect(result).not.toContain('margin-bottom');
    });

    it('should preserve margin shorthand and percentage line-height', () => {
      const html =
        '<p style="margin:0;line-height:100%">A</p><p style="margin:6pt 0 12pt">B</p><p style="margin:0 auto">C</p>';

      expect(sanitizeHtmlContent(html)).toBe(html);
    });

    it('should strip margin shorthand with unsafe or unsupported values', () => {
      for (const value of [
        'expression(alert(1))',
        '0 url(x)',
        '1em',
        '0 0 0 0 0',
      ]) {
        expect(sanitizeHtmlContent(`<p style="margin:${value}">T</p>`)).toBe(
          '<p>T</p>',
        );
      }
    });

    it('should handle empty HTML', () => {
      expect(sanitizeHtmlContent('')).toBe('');
    });
  });
});
