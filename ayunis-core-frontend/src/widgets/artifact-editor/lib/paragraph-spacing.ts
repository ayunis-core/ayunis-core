import { Extension } from '@tiptap/react';

// The block nodes whose inline styles the DOCX/PDF export reads.
export const BLOCK_STYLE_TYPES = [
  'paragraph',
  'heading',
  'listItem',
  'blockquote',
  'tableCell',
  'tableHeader',
];

function styleAttribute(cssProperty: string, attribute: string) {
  return {
    default: null,
    parseHTML: (element: HTMLElement) =>
      element.style.getPropertyValue(cssProperty) || null,
    renderHTML: (attributes: Record<string, unknown>) => {
      const value = attributes[attribute];
      return typeof value === 'string'
        ? { style: `${cssProperty}: ${value}` }
        : {};
    },
  };
}

/**
 * Preserves the paragraph spacing the DOCX/PDF export reads. Without it TipTap
 * drops these styles on load, and the next save or export persists the
 * stripped HTML, so Word falls back to its 1.5-line / 8pt-after defaults.
 */
export const ParagraphSpacing = Extension.create({
  name: 'paragraphSpacing',

  addGlobalAttributes() {
    return [
      {
        types: BLOCK_STYLE_TYPES,
        attributes: {
          lineHeight: styleAttribute('line-height', 'lineHeight'),
          marginTop: styleAttribute('margin-top', 'marginTop'),
          marginBottom: styleAttribute('margin-bottom', 'marginBottom'),
        },
      },
    ];
  },
});
