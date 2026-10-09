import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArtifactResponseDto } from '@/shared/api';
import type { ArtifactPanelHandle } from '@/shared/model/artifact-panel';
import { SpreadsheetEditor } from './SpreadsheetEditor';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  onClose: vi.fn(),
  onBack: vi.fn(),
  onExport: vi.fn(),
  onRevert: vi.fn(),
  onSave: vi.fn(),
  editor: {
    displayedGridState: { columns: [''], rows: [] },
    displayValues: [],
    displayedVersionNumber: 1,
    getDisplayedSerializedContent: vi.fn(),
    getSerializedContent: vi.fn(() =>
      JSON.stringify({ format: 'spreadsheet-v1', columns: [], rows: [] }),
    ),
    isDirty: true,
    isValid: true,
    isViewingHistory: false,
    addColumn: vi.fn(),
    addRows: vi.fn(),
    deleteColumn: vi.fn(),
    renameColumn: vi.fn(),
    selectVersion: vi.fn(),
    setRows: vi.fn(),
    moveColumn: vi.fn(),
    canUndo: true,
    canRedo: true,
    undo: vi.fn(),
    redo: vi.fn(),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/widgets/artifact-editor', () => ({
  VersionHistory: () => null,
}));

vi.mock('@/widgets/confirmation-modal', () => ({
  useConfirmation: () => ({ confirm: mocks.confirm }),
}));

vi.mock('@/widgets/spreadsheet-editor/model/useSpreadsheetEditorState', () => ({
  useSpreadsheetEditorState: () => mocks.editor,
}));

vi.mock('./SpreadsheetExportMenu', () => ({
  SpreadsheetExportMenu: () => null,
}));

vi.mock('./SpreadsheetGrid', () => ({
  SpreadsheetGrid: () => (
    <div data-testid="grid">
      <input aria-label="cell editor" />
    </div>
  ),
}));

vi.mock('./SpreadsheetToolbar', () => ({
  SpreadsheetToolbar: () => null,
}));

const artifact = {
  id: 'artifact-id',
  type: 'spreadsheet',
  threadId: 'thread-id',
  userId: 'user-id',
  title: 'Budget',
  currentVersionNumber: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} satisfies ArtifactResponseDto;

describe('SpreadsheetEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.editor.displayedGridState.columns = [];
    mocks.editor.isDirty = true;
    mocks.editor.isViewingHistory = false;
  });

  it('discards an empty dirty sheet from the close confirmation', () => {
    render(
      <SpreadsheetEditor
        artifact={artifact}
        onSave={mocks.onSave}
        onRevert={mocks.onRevert}
        onExport={mocks.onExport}
        onClose={mocks.onClose}
        onBack={mocks.onBack}
      />,
    );

    const buttons = screen.getAllByRole('button');
    buttons[buttons.length - 1].click();

    expect(mocks.confirm).toHaveBeenCalledOnce();
    const confirmation = mocks.confirm.mock.calls[0][0];
    confirmation.onConfirm();

    expect(mocks.onSave).not.toHaveBeenCalled();
    expect(confirmation.confirmText).toBe(
      'spreadsheet.unsavedChanges.discardAndContinue',
    );
    expect(mocks.onClose).toHaveBeenCalledOnce();
  });

  it('guards an external transition', async () => {
    const ref = createRef<ArtifactPanelHandle>();
    const transition = vi.fn();
    mocks.editor.displayedGridState.columns = ['A'];
    render(
      <SpreadsheetEditor
        ref={ref}
        artifact={artifact}
        onSave={mocks.onSave}
        onRevert={mocks.onRevert}
        onExport={mocks.onExport}
        onClose={mocks.onClose}
        onBack={mocks.onBack}
      />,
    );

    ref.current?.requestExit(transition);

    expect(mocks.confirm).toHaveBeenCalledOnce();
    expect(transition).not.toHaveBeenCalled();

    await mocks.confirm.mock.calls[0][0].onConfirm();

    expect(mocks.onSave).toHaveBeenCalledOnce();
    expect(transition).toHaveBeenCalledOnce();
    expect(mocks.onClose).not.toHaveBeenCalled();
  });

  it('waits for the save to finish before closing', async () => {
    mocks.editor.displayedGridState.columns = ['A'];
    let resolveSave: () => void = () => undefined;
    const savePromise = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });
    mocks.onSave.mockReturnValue(savePromise);

    render(
      <SpreadsheetEditor
        artifact={artifact}
        onSave={mocks.onSave}
        onRevert={mocks.onRevert}
        onExport={mocks.onExport}
        onClose={mocks.onClose}
        onBack={mocks.onBack}
      />,
    );

    const buttons = screen.getAllByRole('button');
    buttons[buttons.length - 1].click();
    const confirmation = mocks.confirm.mock.calls[0][0];
    const confirmationPromise = confirmation.onConfirm();

    expect(mocks.onSave).toHaveBeenCalledOnce();
    expect(mocks.onClose).not.toHaveBeenCalled();

    resolveSave();
    await confirmationPromise;

    expect(mocks.onClose).toHaveBeenCalledOnce();
  });

  describe('undo/redo shortcuts', () => {
    function renderEditor() {
      render(
        <>
          <SpreadsheetEditor
            artifact={artifact}
            onSave={mocks.onSave}
            onRevert={mocks.onRevert}
            onExport={mocks.onExport}
            onClose={mocks.onClose}
            onBack={mocks.onBack}
          />
          <textarea aria-label="outside" />
        </>,
      );
    }

    it('undoes and redoes after the grid was clicked', () => {
      renderEditor();
      fireEvent.pointerDown(screen.getByTestId('grid'));

      fireEvent.keyDown(document.body, { key: 'z', metaKey: true });
      fireEvent.keyDown(document.body, {
        key: 'z',
        ctrlKey: true,
        shiftKey: true,
      });

      expect(mocks.editor.undo).toHaveBeenCalledOnce();
      expect(mocks.editor.redo).toHaveBeenCalledOnce();
    });

    it('leaves native undo to in-cell text editing', () => {
      renderEditor();
      const cellEditor = screen.getByLabelText('cell editor');
      fireEvent.pointerDown(cellEditor);

      const notPrevented = fireEvent.keyDown(cellEditor, {
        key: 'z',
        ctrlKey: true,
      });

      expect(notPrevented).toBe(true);
      expect(mocks.editor.undo).not.toHaveBeenCalled();
    });

    it('ignores shortcuts after interacting outside the editor', () => {
      renderEditor();
      fireEvent.pointerDown(screen.getByTestId('grid'));
      const outside = screen.getByLabelText('outside');
      fireEvent.pointerDown(outside);

      fireEvent.keyDown(outside, { key: 'z', ctrlKey: true });

      expect(mocks.editor.undo).not.toHaveBeenCalled();
    });
  });
});
