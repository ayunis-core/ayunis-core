import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArtifactResponseDto } from '@/shared/api';
import type { ArtifactPanelHandle } from '@/shared/model/artifact-panel';
import { ArtifactEditor } from './ArtifactEditor';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  onBack: vi.fn(),
  onClose: vi.fn(),
  onSave: vi.fn(),
  editor: {
    commands: { setContent: vi.fn() },
    getHTML: vi.fn(() => '<p>Edited</p>'),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@tiptap/react', () => ({
  useEditor: () => mocks.editor,
  EditorContent: () => null,
}));

vi.mock('@/features/feature-toggles', () => ({
  useIsLetterheadsEnabled: () => false,
}));

vi.mock('@/widgets/confirmation-modal', () => ({
  useConfirmation: () => ({ confirm: mocks.confirm }),
}));

vi.mock('./EditorToolbar', () => ({ EditorToolbar: () => null }));
vi.mock('./ExportButtons', () => ({ ExportButtons: () => null }));
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
      content: '<p>Saved</p>',
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
    mocks.editor.getHTML.mockReturnValue('<p>Edited</p>');
  });

  it('confirms and saves dirty content before returning to the list', async () => {
    renderEditor();

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
      onExport={vi.fn()}
      onClose={mocks.onClose}
      onBack={mocks.onBack}
    />,
  );
}
