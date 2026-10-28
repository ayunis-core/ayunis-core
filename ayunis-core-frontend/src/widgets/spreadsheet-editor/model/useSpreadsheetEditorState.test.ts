import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ArtifactResponseDto } from '@/shared/api';
import { ArtifactVersionResponseDtoAuthorType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useSpreadsheetEditorState } from './useSpreadsheetEditorState';

function content(columns: string[], rows: unknown[][]): string {
  return JSON.stringify({ format: 'spreadsheet-v1', columns, rows });
}

function artifact(
  id: string,
  currentVersionNumber: number,
  currentContent: string,
  previousContent?: string,
): ArtifactResponseDto {
  const versions = [
    {
      id: `${id}-current-version`,
      artifactId: id,
      versionNumber: currentVersionNumber,
      content: currentContent,
      authorType: ArtifactVersionResponseDtoAuthorType.USER,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  if (previousContent) {
    versions.push({
      id: `${id}-previous-version`,
      artifactId: id,
      versionNumber: currentVersionNumber - 1,
      content: previousContent,
      authorType: ArtifactVersionResponseDtoAuthorType.USER,
      createdAt: '2025-12-31T00:00:00.000Z',
    });
  }

  return {
    id,
    type: 'spreadsheet',
    threadId: 'thread-id',
    userId: 'user-id',
    title: id,
    currentVersionNumber,
    versions,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('useSpreadsheetEditorState', () => {
  it('reloads when the artifact changes even if both artifacts are at version one', () => {
    const firstArtifact = artifact(
      'first-artifact',
      1,
      content(['First'], [['one']]),
    );
    const secondArtifact = artifact(
      'second-artifact',
      1,
      content(['Second'], [['two']]),
    );

    const { result, rerender } = renderHook(
      ({ currentArtifact }) => useSpreadsheetEditorState(currentArtifact),
      { initialProps: { currentArtifact: firstArtifact } },
    );

    rerender({ currentArtifact: secondArtifact });

    expect(result.current.displayedGridState).toEqual({
      columns: ['Second'],
      rows: [{ c0: 'two' }],
    });
  });

  it('does not enter history while there are unsaved edits', () => {
    const currentArtifact = artifact(
      'artifact',
      2,
      content(['Current'], [['current']]),
      content(['Previous'], [['previous']]),
    );

    const { result } = renderHook(() =>
      useSpreadsheetEditorState(currentArtifact),
    );

    act(() => {
      result.current.setRows(() => [{ c0: 'edited' }], []);
    });
    act(() => {
      result.current.selectVersion(1);
    });

    expect(result.current.isDirty).toBe(true);
    expect(result.current.isViewingHistory).toBe(false);
    expect(result.current.displayedGridState.columns).toEqual(['Current']);
  });

  it('applies row updates to the latest state', () => {
    const currentArtifact = artifact(
      'artifact',
      1,
      content(['Value'], [['first']]),
    );

    const { result } = renderHook(() =>
      useSpreadsheetEditorState(currentArtifact),
    );

    act(() => {
      result.current.setRows((rows) => [...rows, { c0: 'second' }], []);
      result.current.setRows(
        (rows) =>
          rows.map((row, index) =>
            index === 0 ? { ...row, c0: 'updated' } : row,
          ),
        [],
      );
    });

    expect(result.current.displayedGridState.rows).toEqual([
      { c0: 'updated' },
      { c0: 'second' },
    ]);
  });

  it('uses the selected history version validity for the warning', () => {
    const currentArtifact = artifact(
      'artifact',
      2,
      'not valid spreadsheet json',
      content(['Previous'], [['previous']]),
    );

    const { result } = renderHook(() =>
      useSpreadsheetEditorState(currentArtifact),
    );

    act(() => {
      result.current.selectVersion(1);
    });

    expect(result.current.isValid).toBe(true);
  });

  describe('undo and redo', () => {
    type Editor = ReturnType<typeof useSpreadsheetEditorState>;

    const initialContent = content(['A', 'B'], [[1, '=A2']]);

    function renderEditor(
      currentArtifact = artifact('artifact', 1, initialContent),
    ) {
      return renderHook(({ current }) => useSpreadsheetEditorState(current), {
        initialProps: { current: currentArtifact },
      });
    }

    it.each<[string, (editor: Editor) => void]>([
      ['cell edit', (e) => e.setRows((rows) => [{ ...rows[0], c0: '2' }], [])],
      ['add rows', (e) => e.addRows(2)],
      ['delete row', (e) => e.deleteLastRow()],
      ['add column', (e) => e.addColumn('C')],
      ['rename column', (e) => e.renameColumn(0, 'Renamed')],
      ['delete column', (e) => e.deleteColumn(0)],
      ['reorder column', (e) => e.moveColumn(0, 1)],
    ])('restores and re-applies a %s', (_name, mutate) => {
      const { result } = renderEditor();
      const original = result.current.displayedGridState;

      act(() => mutate(result.current));
      const edited = result.current.displayedGridState;
      expect(edited).not.toEqual(original);

      act(() => result.current.undo());
      expect(result.current.displayedGridState).toEqual(original);
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(true);

      act(() => result.current.redo());
      expect(result.current.displayedGridState).toEqual(edited);
      expect(result.current.canRedo).toBe(false);
    });

    it('restores formula references rewritten by a column reorder', () => {
      const { result } = renderEditor();

      act(() => result.current.moveColumn(1, 0));
      expect(result.current.displayedGridState.rows[0].c0).not.toBe('=A2');

      act(() => result.current.undo());
      expect(result.current.displayedGridState.rows[0]).toEqual({
        c0: '1',
        c1: '=A2',
      });
    });

    it('is clean again after undoing back to the saved state', () => {
      const { result } = renderEditor();

      act(() => result.current.addRows(1));
      expect(result.current.isDirty).toBe(true);

      act(() => result.current.undo());
      expect(result.current.isDirty).toBe(false);
    });

    it('serializes the state reached by an undo/redo sequence', () => {
      const { result } = renderEditor();

      act(() => result.current.addColumn('C'));
      act(() => result.current.renameColumn(0, 'First'));
      act(() => result.current.undo());
      act(() => result.current.undo());
      act(() => result.current.redo());

      expect(JSON.parse(result.current.getSerializedContent())).toMatchObject({
        columns: ['A', 'B', 'C'],
        rows: [[1, '=A2', null]],
      });
    });

    it('clears the history when the server content changes', () => {
      const { result, rerender } = renderEditor();

      act(() => result.current.addRows(1));
      rerender({
        current: artifact('artifact', 2, content(['A', 'B'], [[1, '=A2'], []])),
      });

      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
      expect(result.current.isDirty).toBe(false);
    });

    it('does not redo while viewing a historical version', () => {
      const { result } = renderEditor(
        artifact('artifact', 2, initialContent, content(['Old'], [['old']])),
      );

      act(() => result.current.addRows(1));
      act(() => result.current.undo());
      act(() => result.current.selectVersion(1));
      expect(result.current.canRedo).toBe(false);

      act(() => result.current.redo());
      act(() => result.current.selectVersion(2));

      expect(result.current.isDirty).toBe(false);
      expect(result.current.canRedo).toBe(true);
    });
  });
});
