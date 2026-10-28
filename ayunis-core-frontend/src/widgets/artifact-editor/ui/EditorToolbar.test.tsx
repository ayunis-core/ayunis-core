import { fireEvent, render, screen } from '@testing-library/react';
import type { Editor } from '@tiptap/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EditorToolbar } from './EditorToolbar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

type ToolbarEditor = {
  chain: ReturnType<typeof vi.fn>;
  isActive: ReturnType<typeof vi.fn>;
  getAttributes: ReturnType<typeof vi.fn>;
  run: ReturnType<typeof vi.fn>;
  setTextAlign: ReturnType<typeof vi.fn>;
};

function createEditor(): ToolbarEditor {
  const run = vi.fn();
  const setTextAlign = vi.fn();
  const chainApi = {
    focus: vi.fn(),
    toggleBold: vi.fn(),
    toggleItalic: vi.fn(),
    toggleUnderline: vi.fn(),
    toggleHeading: vi.fn(),
    toggleBulletList: vi.fn(),
    toggleOrderedList: vi.fn(),
    setTextAlign,
    extendMarkRange: vi.fn(),
    unsetLink: vi.fn(),
    setLink: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    run,
  };

  chainApi.focus.mockReturnValue(chainApi);
  chainApi.toggleBold.mockReturnValue(chainApi);
  chainApi.toggleItalic.mockReturnValue(chainApi);
  chainApi.toggleUnderline.mockReturnValue(chainApi);
  chainApi.toggleHeading.mockReturnValue(chainApi);
  chainApi.toggleBulletList.mockReturnValue(chainApi);
  chainApi.toggleOrderedList.mockReturnValue(chainApi);
  chainApi.setTextAlign.mockReturnValue(chainApi);
  chainApi.extendMarkRange.mockReturnValue(chainApi);
  chainApi.unsetLink.mockReturnValue(chainApi);
  chainApi.setLink.mockReturnValue(chainApi);
  chainApi.undo.mockReturnValue(chainApi);
  chainApi.redo.mockReturnValue(chainApi);

  return {
    chain: vi.fn(() => chainApi),
    isActive: vi.fn(() => false),
    getAttributes: vi.fn(() => ({})),
    run,
    setTextAlign,
  };
}

describe('EditorToolbar', () => {
  let editor: ToolbarEditor;

  beforeEach(() => {
    editor = createEditor();
  });

  it('applies justified alignment to the current block', () => {
    render(<EditorToolbar editor={editor as unknown as Editor} />);

    fireEvent.click(screen.getByTitle('editor.toolbar.alignJustify'));

    expect(editor.setTextAlign).toHaveBeenCalledWith('justify');
    expect(editor.run).toHaveBeenCalled();
  });

  it('marks the justify control active when the block is justified', () => {
    editor.isActive.mockImplementation(
      (attrs: { textAlign?: string } | string) =>
        typeof attrs === 'object' && attrs.textAlign === 'justify',
    );

    render(<EditorToolbar editor={editor as unknown as Editor} />);

    expect(
      screen.getByTitle('editor.toolbar.alignJustify').className,
    ).toContain('bg-secondary');
  });
});
