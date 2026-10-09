import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
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
import {
  canRedo,
  canUndo,
  commitHistory,
  createHistory,
  redoHistory,
  undoHistory,
  type EditHistory,
} from './edit-history';

function loadGridState(content: string | undefined): {
  state: GridState;
  isValid: boolean;
} {
  const { data, isValid } = parseSpreadsheetContent(content ?? '');
  return { state: toGridState(data), isValid };
}

interface EditorHistoryState {
  history: EditHistory<GridState>;
  // Reference to the last loaded state; matching it means nothing is unsaved.
  saved: GridState;
}

type EditorHistoryAction =
  | { type: 'edit'; update: (state: GridState) => GridState }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'reset'; state: GridState };

function initEditorHistory(state: GridState): EditorHistoryState {
  return { history: createHistory(state), saved: state };
}

function editorHistoryReducer(
  state: EditorHistoryState,
  action: EditorHistoryAction,
): EditorHistoryState {
  switch (action.type) {
    case 'edit':
      return {
        ...state,
        history: commitHistory(
          state.history,
          action.update(state.history.present),
        ),
      };
    case 'undo':
      return { ...state, history: undoHistory(state.history) };
    case 'redo':
      return { ...state, history: redoHistory(state.history) };
    case 'reset':
      return initEditorHistory(action.state);
  }
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
  const [{ history, saved }, dispatch] = useReducer(
    editorHistoryReducer,
    loaded.state,
    initEditorHistory,
  );
  const gridState = history.present;
  const isDirty = gridState !== saved;
  const [isValid, setIsValid] = useState(loaded.isValid);

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
      dispatch({ type: 'reset', state: reloaded.state });
      setIsValid(reloaded.isValid);
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
    dispatch({ type: 'edit', update: updater });
  };

  return {
    displayedGridState,
    displayValues,
    isDirty,
    isValid: displayedIsValid,
    isViewingHistory,
    displayedVersionNumber,
    canUndo: !isViewingHistory && canUndo(history),
    canRedo: !isViewingHistory && canRedo(history),
    undo: () => {
      if (!isViewingHistory) {
        dispatch({ type: 'undo' });
      }
    },
    redo: () => {
      if (!isViewingHistory) {
        dispatch({ type: 'redo' });
      }
    },
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
