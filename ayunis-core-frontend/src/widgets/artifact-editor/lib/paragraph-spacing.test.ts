import { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { TableKit } from '@tiptap/extension-table';
import { afterEach, describe, expect, it } from 'vitest';
import { BLOCK_STYLE_TYPES, ParagraphSpacing } from './paragraph-spacing';

let editor: Editor | undefined;

function roundTrip(content: string): string {
  editor = new Editor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: BLOCK_STYLE_TYPES }),
      TableKit,
      ParagraphSpacing,
    ],
    content,
  });
  return editor.getHTML();
}

afterEach(() => editor?.destroy());

describe('ParagraphSpacing', () => {
  it('keeps line-height and vertical margins on paragraphs and headings', () => {
    const html = roundTrip(
      '<h2 style="line-height: 1; margin-top: 0pt; margin-bottom: 0pt">Aktenvermerk</h2>' +
        '<p style="line-height: 1; margin-top: 0pt; margin-bottom: 0pt; text-align: justify">Text</p>',
    );

    expect(html).toBe(
      '<h2 style="line-height: 1; margin-top: 0pt; margin-bottom: 0pt;">Aktenvermerk</h2>' +
        '<p style="text-align: justify; line-height: 1; margin-top: 0pt; margin-bottom: 0pt;">Text</p>',
    );
  });

  it('keeps spacing on list items and table cells', () => {
    const html = roundTrip(
      '<ul><li style="line-height: 1"><p>Item</p></li></ul>' +
        '<table><tbody><tr><td style="margin-bottom: 0pt"><p>Cell</p></td></tr></tbody></table>',
    );

    expect(html).toContain('<li style="line-height: 1;">');
    expect(html).toMatch(/<td[^>]*style="margin-bottom: 0pt;"/);
  });

  it('keeps text alignment on list items and table cells', () => {
    const html = roundTrip(
      '<ul><li style="text-align: justify"><p>Item</p></li></ul>' +
        '<table><tbody><tr><td style="text-align: right"><p>Cell</p></td></tr></tbody></table>',
    );

    expect(html).toContain('<li style="text-align: justify;">');
    expect(html).toMatch(/<td[^>]*style="text-align: right;"/);
  });

  it('keeps toolbar alignment working inside a list', () => {
    roundTrip('<ul><li><p>Item</p></li></ul>');
    editor?.chain().setTextSelection(3).setTextAlign('center').run();

    expect(editor?.isActive({ textAlign: 'center' })).toBe(true);
    expect(editor?.getHTML()).toContain('<p style="text-align: center;">Item');
  });

  it('adds no style attribute to unstyled content', () => {
    expect(roundTrip('<p>Plain</p>')).toBe('<p>Plain</p>');
  });
});
