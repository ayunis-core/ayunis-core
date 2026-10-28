import { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TEXT_COLOR_EXTENSIONS } from './text-color';

let editor: Editor | undefined;

function roundTrip(content: string): string {
  editor = new Editor({
    extensions: [StarterKit, ...TEXT_COLOR_EXTENSIONS],
    content,
  });
  return editor.getHTML();
}

afterEach(() => {
  editor?.destroy();
  vi.unstubAllGlobals();
});

describe('TEXT_COLOR_EXTENSIONS', () => {
  it('keeps text and background colors on spans', () => {
    const html = roundTrip(
      '<p><span style="color: #1a7f37; background-color: #dafbe1">neu</span> ' +
        '<span style="color: #cf222e"><s>alt</s></span></p>',
    );

    expect(html).toBe(
      '<p><span style="color: rgb(26, 127, 55); background-color: rgb(218, 251, 225);">neu</span> ' +
        '<span style="color: rgb(207, 34, 46);"><s>alt</s></span></p>',
    );
  });

  it('keeps mark highlights', () => {
    expect(roundTrip('<p><mark>geändert</mark></p>')).toBe(
      '<p><mark>geändert</mark></p>',
    );
  });

  it('leaves typed ==text== as plain text', () => {
    roundTrip('<p>a ==b=</p>');
    const view = editor!.view;
    editor!.commands.focus('end');
    const { from, to } = view.state.selection;
    const insertDefault = () => view.state.tr.insertText('=', from, to);
    const handled = view.someProp('handleTextInput', (handle) =>
      handle(view, from, to, '=', insertDefault),
    );
    if (!handled) view.dispatch(insertDefault());

    expect(editor?.getHTML()).toBe('<p>a ==b==</p>');
  });

  it('leaves pasted ==text== as plain text', () => {
    // jsdom lacks ClipboardEvent, which TipTap's paste handling constructs.
    vi.stubGlobal('ClipboardEvent', class extends Event {});
    roundTrip('<p>a</p>');
    editor!.commands.focus('end');
    editor!.view.pasteText(' == b == c');

    expect(editor?.getHTML()).toBe('<p>a == b == c</p>');
  });

  it('does not bind a highlight shortcut', () => {
    roundTrip('<p>Text</p>');
    editor?.commands.selectAll();
    editor?.view.dom.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'h',
        ctrlKey: true,
        shiftKey: true,
      }),
    );

    expect(editor?.getHTML()).toBe('<p>Text</p>');
  });

  it('adds no markup to uncolored text', () => {
    expect(roundTrip('<p>Text</p>')).toBe('<p>Text</p>');
  });
});
