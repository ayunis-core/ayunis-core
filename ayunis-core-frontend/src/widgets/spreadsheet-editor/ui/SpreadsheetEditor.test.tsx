import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArtifactResponseDto } from '@/shared/api';
import { SpreadsheetEditor } from './SpreadsheetEditor';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  onClose: vi.fn(),
  onExport: vi.fn(),
  onRevert: vi.fn(),
  onSave: vi.fn(),
  editor: {
    displayedGridState: { columns: [''], rows: [] },
    displayedVersionNumber: 1,
    getDisplayedSerializedContent: vi.fn(),
    getSerializedContent: vi.fn(() =>
      JSON.stringify({ format: 'spreadsheet-v1', columns: [], rows: [] }),
    ),
    isDirty: true,
    isValid: true,
    isViewingHistory: false,
    addColumn: vi.fn(),
    deleteColumn: vi.fn(),
    renameColumn: vi.fn(),
    selectVersion: vi.fn(),
    setRows: vi.fn(),
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

vi.mock('../model/useSpreadsheetEditorState', () => ({
  useSpreadsheetEditorState: () => mocks.editor,
}));

vi.mock('./SpreadsheetExportMenu', () => ({
  SpreadsheetExportMenu: () => null,
}));

vi.mock('./SpreadsheetGrid', () => ({
  SpreadsheetGrid: () => null,
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
      />,
    );

    const buttons = screen.getAllByRole('button');
    buttons[buttons.length - 1].click();

    expect(mocks.confirm).toHaveBeenCalledOnce();
    const confirmation = mocks.confirm.mock.calls[0][0];
    confirmation.onConfirm();

    expect(mocks.onSave).not.toHaveBeenCalled();
    expect(confirmation.confirmText).toBe(
      'spreadsheet.unsavedChanges.discardAndClose',
    );
    expect(mocks.onClose).toHaveBeenCalledOnce();
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
});
