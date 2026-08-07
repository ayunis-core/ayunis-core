import { useEffect, useMemo, useRef, useState } from 'react';
import type { ArtifactResponseDto } from '@/shared/api';
import type { GridRow, GridState } from './spreadsheet-grid-state';
import {
  addRows,
  addColumn,
  deleteRow,
  deleteColumn,
  moveColumn,
  renameColumn,
  rewriteFormulasForRowOperations,
  type RowOperation,
} from './spreadsheet-grid-operations';
import { fromGridState, toGridState } from './spreadsheet-grid-state';
import {
  parseSpreadsheetContent,
  serializeSpreadsheetContent,
} from './spreadsheet-content-format';
import { computeDisplayValues } from './formula-engine';

function loadGridState(content: string | undefined): {
  state: GridState;
  isValid: boolean;
} {
  const { data, isValid } = parseSpreadsheetContent(content ?? '');
  return { state: toGridState(data), isValid };
}

export function useSpreadsheetEditorState(artifact: ArtifactResponseDto) {
  // null follows the latest version; a number represents an explicit history
  // selection. The selection is cleared when the artifact or server content changes.
  const [userSelectedVersion, setUserSelectedVersion] = useState<number | null>(
    null,
  );

  const displayedVersionNumber =
    userSelectedVersion ?? artifact.currentVersionNumber;
  const isViewingHistory =
    displayedVersionNumber !== artifact.currentVersionNumber;

  const currentVersion = artifact.versions?.find(
    (v) => v.versionNumber === artifact.currentVersionNumber,
  );
  const currentContent = currentVersion?.content;
  const selectedVersion = artifact.versions?.find(
    (v) => v.versionNumber === displayedVersionNumber,
  );

  const [loaded] = useState(() => loadGridState(currentVersion?.content));
  const [gridState, setGridState] = useState<GridState>(loaded.state);
  const [isValid, setIsValid] = useState(loaded.isValid);
  const [isDirty, setIsDirty] = useState(false);

  // Reload the editable state when the artifact or current version changes,
  // discarding unsaved edits in favor of the server state.
  const loadedStateRef = useRef({
    artifactId: artifact.id,
    versionNumber: artifact.currentVersionNumber,
    content: currentContent,
  });
  useEffect(() => {
    const loadedState = loadedStateRef.current;
    const stateChanged =
      loadedState.artifactId !== artifact.id ||
      loadedState.versionNumber !== artifact.currentVersionNumber ||
      loadedState.content !== currentContent;

    if (stateChanged) {
      loadedStateRef.current = {
        artifactId: artifact.id,
        versionNumber: artifact.currentVersionNumber,
        content: currentContent,
      };
      const reloaded = loadGridState(currentContent);
      setUserSelectedVersion(null);
      setGridState(reloaded.state);
      setIsValid(reloaded.isValid);
      setIsDirty(false);
    }
  }, [artifact.id, artifact.currentVersionNumber, currentContent]);

  const historicalContentState = useMemo(
    () => (isViewingHistory ? loadGridState(selectedVersion?.content) : null),
    [isViewingHistory, selectedVersion],
  );

  const displayedGridState = historicalContentState?.state ?? gridState;
  const displayedIsValid = historicalContentState?.isValid ?? isValid;

  const displayValues = useMemo(
    () => computeDisplayValues(displayedGridState),
    [displayedGridState],
  );

  const edit = (updater: (state: GridState) => GridState) => {
    // The grid is read-only while browsing history, but grid change events
    // must never mutate the editable state or mark it dirty from that mode.
    if (isViewingHistory) {
      return;
    }
    setGridState(updater);
    setIsDirty(true);
  };

  return {
    displayedGridState,
    displayValues,
    isDirty,
    isValid: displayedIsValid,
    isViewingHistory,
    displayedVersionNumber,
    selectVersion: (versionNumber: number) => {
      if (isDirty) {
        return;
      }
      setUserSelectedVersion(
        versionNumber === artifact.currentVersionNumber ? null : versionNumber,
      );
    },
    setRows: (
      update: GridRow[] | ((rows: GridRow[]) => GridRow[]),
      operations: RowOperation[] = [],
    ) =>
      edit((state) => {
        const rows = typeof update === 'function' ? update(state.rows) : update;
        return {
          ...state,
          rows: rewriteFormulasForRowOperations(rows, operations),
        };
      }),
    addRows: (count: number) => edit((state) => addRows(state, count)),
    deleteLastRow: () =>
      edit((state) => deleteRow(state, state.rows.length - 1)),
    addColumn: (label: string) => edit((state) => addColumn(state, label)),
    renameColumn: (index: number, label: string) =>
      edit((state) => renameColumn(state, index, label)),
    deleteColumn: (index: number) =>
      edit((state) => deleteColumn(state, index)),
    moveColumn: (from: number, to: number) =>
      edit((state) => moveColumn(state, from, to)),
    getSerializedContent: () =>
      serializeSpreadsheetContent(fromGridState(gridState)),
    // Serializes what the user currently sees, including a browsed
    // historical version — used by export so downloads match the screen.
    getDisplayedSerializedContent: () =>
      serializeSpreadsheetContent(fromGridState(displayedGridState)),
  };
}
