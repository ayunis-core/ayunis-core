import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as TiptapReact from '@tiptap/react';
import type { ArtifactResponseDto } from '@/shared/api';
import type { ArtifactPanelHandle } from '@/shared/model/artifact-panel';
import { ArtifactEditor } from './ArtifactEditor';

// TipTap re-serializes stored HTML (style order, spacing, semicolons), so an
// untouched document never matches the stored version byte for byte.
const STORED_HTML = '<p style="line-height:1;text-align:justify">Saved</p>';
const LOADED_HTML = '<p style="text-align: justify; line-height: 1;">Saved</p>';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  onBack: vi.fn(),
  onClose: vi.fn(),
  onSave: vi.fn(),
  onExport: vi.fn(),
  editorCreated: false,
  exportButtons: { onExport: (_format: 'docx' | 'pdf') => {} },
  editor: {
    commands: { setContent: vi.fn() },
    getHTML: vi.fn<() => string>(),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@tiptap/react', async (importOriginal) => ({
  ...(await importOriginal<typeof TiptapReact>()),
  useEditor: (options: {
    onCreate: (props: { editor: typeof mocks.editor }) => void;
  }) => {
    if (!mocks.editorCreated) {
      mocks.editorCreated = true;
      options.onCreate({ editor: mocks.editor });
    }
    return mocks.editor;
  },
  EditorContent: () => null,
}));

vi.mock('@/widgets/confirmation-modal', () => ({
  useConfirmation: () => ({ confirm: mocks.confirm }),
}));

vi.mock('./EditorToolbar', () => ({ EditorToolbar: () => null }));
vi.mock('./ExportButtons', () => ({
  ExportButtons: (props: { onExport: (format: 'docx' | 'pdf') => void }) => {
    mocks.exportButtons.onExport = props.onExport;
    return null;
  },
}));
vi.mock('./VersionHistory', () => ({ VersionHistory: () => null }));

const artifact = {
  id: 'artifact-id',
  type: 'document',
  threadId: 'thread-id',
  userId: 'user-id',
  title: 'Document',
  currentVersionNumber: 1,
  versions: [
    {
      id: 'version-id',
      artifactId: 'artifact-id',
      versionNumber: 1,
      content: STORED_HTML,
      authorType: 'ASSISTANT',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} satisfies ArtifactResponseDto;

describe('ArtifactEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.editorCreated = false;
    mocks.editor.getHTML.mockReturnValue(LOADED_HTML);
  });

  it('leaves without a prompt when the loaded document is unchanged', () => {
    const ref = createRef<ArtifactPanelHandle>();
    const transition = vi.fn();
    renderEditor(ref);

    ref.current?.requestExit(transition);

    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(transition).toHaveBeenCalledOnce();
  });

  it('exports an unchanged document without saving a new version', () => {
    renderEditor();

    mocks.exportButtons.onExport('docx');

    expect(mocks.onExport).toHaveBeenCalledWith('docx', undefined);
  });

  it('exports edited content so it is saved first', () => {
    renderEditor();
    mocks.editor.getHTML.mockReturnValue('<p>Edited</p>');

    mocks.exportButtons.onExport('docx');

    expect(mocks.onExport).toHaveBeenCalledWith('docx', '<p>Edited</p>');
  });

  it('confirms and saves dirty content before returning to the list', async () => {
    renderEditor();
    mocks.editor.getHTML.mockReturnValue('<p>Edited</p>');

    fireEvent.click(screen.getByRole('button', { name: 'navigation.back' }));
    expect(mocks.confirm).toHaveBeenCalledOnce();

    await mocks.confirm.mock.calls[0][0].onConfirm();

    expect(mocks.onSave).toHaveBeenCalledWith('<p>Edited</p>');
    expect(mocks.onBack).toHaveBeenCalledOnce();
  });

  it('guards an external transition with the same confirmation', async () => {
    const ref = createRef<ArtifactPanelHandle>();
    const transition = vi.fn();
    renderEditor(ref);
    mocks.editor.getHTML.mockReturnValue('<p>Edited</p>');

    ref.current?.requestExit(transition);

    expect(mocks.confirm).toHaveBeenCalledOnce();
    expect(transition).not.toHaveBeenCalled();

    await mocks.confirm.mock.calls[0][0].onConfirm();

    expect(mocks.onSave).toHaveBeenCalledWith('<p>Edited</p>');
    expect(transition).toHaveBeenCalledOnce();
    expect(mocks.onClose).not.toHaveBeenCalled();
  });
});

function renderEditor(ref = createRef<ArtifactPanelHandle>()) {
  render(
    <ArtifactEditor
      ref={ref}
      artifact={artifact}
      onSave={mocks.onSave}
      onRevert={vi.fn()}
      onExport={mocks.onExport}
      onClose={mocks.onClose}
      onBack={mocks.onBack}
    />,
  );
}
