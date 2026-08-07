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
      result.current.setRows(() => [{ c0: 'edited' }]);
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
      result.current.setRows((rows) => [...rows, { c0: 'second' }]);
      result.current.setRows((rows) =>
        rows.map((row, index) =>
          index === 0 ? { ...row, c0: 'updated' } : row,
        ),
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
});
