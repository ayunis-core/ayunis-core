import type { IOptions } from 'sanitize-html';
import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
  // Block elements
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'blockquote',
  'pre',
  'hr',
  'br',
  'div',
  // Lists
  'ul',
  'ol',
  'li',
  // Inline formatting
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'del',
  'sub',
  'sup',
  'code',
  'mark',
  'span',
  // Links & media
  'a',
  'img',
  // Tables
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'colgroup',
  'col',
  // Details
  'details',
  'summary',
];

const SANITIZE_OPTIONS: IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    td: ['colspan', 'rowspan', 'style'],
    th: ['colspan', 'rowspan', 'style'],
    col: ['span'],
    colgroup: ['span'],
    h1: ['style', 'class'],
    h2: ['style', 'class'],
    h3: ['style', 'class'],
    h4: ['style', 'class'],
    h5: ['style', 'class'],
    h6: ['style', 'class'],
    span: ['style', 'class'],
    p: ['style', 'class'],
    div: ['style', 'class'],
    blockquote: ['style', 'class'],
    pre: ['class'],
    code: ['class'],
    '*': ['data-*'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedStyles: {
    '*': {
      'text-align': [/^(left|right|center|justify)$/],
      'background-color': [/.*/],
      color: [/.*/],
    },
  },
};

/**
 * Sanitizes HTML content for safe storage and rendering.
 *
 * Strips dangerous elements (script, iframe, object, embed, form) and
 * event-handler attributes (onclick, onerror, onload, etc.) while
 * preserving Tiptap-compatible HTML structure: headings, paragraphs,
 * lists, tables, formatting, links, images, and code blocks.
 */
export function sanitizeHtmlContent(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}
