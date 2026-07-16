import { useEffect, useMemo, useRef, useState } from 'react';
import type { ArtifactResponseDto } from '@/shared/api';
import type { GridRow, GridState, RowOperation } from './spreadsheet-content';
import {
  addColumn,
  deleteColumn,
  fromGridState,
  parseSpreadsheetContent,
  renameColumn,
  rewriteFormulasForRowOperations,
  serializeSpreadsheetContent,
  toGridState,
} from './spreadsheet-content';
import { computeDisplayValues } from './formula-engine';

function loadGridState(content: string | undefined): {
  state: GridState;
  isValid: boolean;
} {
  const { data, isValid } = parseSpreadsheetContent(content ?? '');
  return { state: toGridState(data), isValid };
}

export function useSpreadsheetEditorState(artifact: ArtifactResponseDto) {
  // null = follow latest; set to a specific version number when the user
  // picks one from the history. Resets on artifact change via key prop.
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
  const selectedVersion = artifact.versions?.find(
    (v) => v.versionNumber === displayedVersionNumber,
  );

  const [loaded] = useState(() => loadGridState(currentVersion?.content));
  const [gridState, setGridState] = useState<GridState>(loaded.state);
  const [isDirty, setIsDirty] = useState(false);

  // Reload the editable state when a new version lands (save, revert, or an
  // assistant update), discarding unsaved edits in favor of the new version.
  const loadedVersionRef = useRef(artifact.currentVersionNumber);
  useEffect(() => {
    if (loadedVersionRef.current !== artifact.currentVersionNumber) {
      loadedVersionRef.current = artifact.currentVersionNumber;
      setGridState(loadGridState(currentVersion?.content).state);
      setIsDirty(false);
    }
  }, [artifact.currentVersionNumber, currentVersion]);

  const historicalGridState = useMemo(
    () =>
      isViewingHistory ? loadGridState(selectedVersion?.content).state : null,
    [isViewingHistory, selectedVersion],
  );

  const displayedGridState = historicalGridState ?? gridState;

  const displayValues = useMemo(
    () => computeDisplayValues(displayedGridState),
    [displayedGridState],
  );

  const edit = (updater: (state: GridState) => GridState) => {
    setGridState(updater);
    setIsDirty(true);
  };

  return {
    displayedGridState,
    displayValues,
    isDirty,
    isValid: loaded.isValid,
    isViewingHistory,
    displayedVersionNumber,
    selectVersion: (versionNumber: number) =>
      setUserSelectedVersion(
        versionNumber === artifact.currentVersionNumber ? null : versionNumber,
      ),
    setRows: (rows: GridRow[], operations: RowOperation[]) =>
      edit((state) => ({
        ...state,
        rows: rewriteFormulasForRowOperations(rows, operations),
      })),
    addColumn: (label: string) => edit((state) => addColumn(state, label)),
    renameColumn: (index: number, label: string) =>
      edit((state) => renameColumn(state, index, label)),
    deleteColumn: (index: number) =>
      edit((state) => deleteColumn(state, index)),
    getSerializedContent: () =>
      serializeSpreadsheetContent(fromGridState(gridState)),
  };
}
