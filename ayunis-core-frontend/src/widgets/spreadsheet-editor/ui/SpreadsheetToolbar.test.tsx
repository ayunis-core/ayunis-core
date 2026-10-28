import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SpreadsheetToolbar } from './SpreadsheetToolbar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('./SpreadsheetColumnManager', () => ({
  SpreadsheetColumnManager: () => null,
}));

function renderToolbar(canUndo: boolean, canRedo: boolean) {
  const onUndo = vi.fn();
  const onRedo = vi.fn();
  render(
    <SpreadsheetToolbar
      gridState={{ columns: ['A'], rows: [] }}
      canUndo={canUndo}
      canRedo={canRedo}
      onUndo={onUndo}
      onRedo={onRedo}
      onAddRows={vi.fn()}
      onDeleteLastRow={vi.fn()}
      onAddColumn={vi.fn()}
      onRenameColumn={vi.fn()}
      onDeleteColumn={vi.fn()}
      onMoveColumn={vi.fn()}
    />,
  );
  return { onUndo, onRedo };
}

describe('SpreadsheetToolbar undo/redo', () => {
  it('disables the buttons when there is nothing to undo or redo', () => {
    renderToolbar(false, false);

    expect(
      screen.getByLabelText<HTMLButtonElement>('spreadsheet.toolbar.undo')
        .disabled,
    ).toBe(true);
    expect(
      screen.getByLabelText<HTMLButtonElement>('spreadsheet.toolbar.redo')
        .disabled,
    ).toBe(true);
  });

  it('calls the handlers when enabled', () => {
    const { onUndo, onRedo } = renderToolbar(true, true);

    screen.getByLabelText('spreadsheet.toolbar.undo').click();
    screen.getByLabelText('spreadsheet.toolbar.redo').click();

    expect(onUndo).toHaveBeenCalledOnce();
    expect(onRedo).toHaveBeenCalledOnce();
  });
});
