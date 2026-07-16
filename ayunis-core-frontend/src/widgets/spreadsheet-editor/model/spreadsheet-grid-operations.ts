import type { ReferenceAdjustment } from './formula-references';
import {
  adjustFormulaReferences,
  remapFormulaColumns,
} from './formula-references';
import { isFormulaValue } from './formula-values';
import type { GridRow, GridState } from './spreadsheet-grid-state';
import {
  columnKey,
  MAX_SPREADSHEET_COLUMNS,
  MAX_SPREADSHEET_ROWS,
} from './spreadsheet-grid-state';

export function addRows(state: GridState, count: number): GridState {
  const requestedRows = Number.isFinite(count)
    ? Math.max(0, Math.trunc(count))
    : 0;
  const rowsToAdd = Math.min(
    requestedRows,
    MAX_SPREADSHEET_ROWS - state.rows.length,
  );

  if (rowsToAdd <= 0) {
    return state;
  }

  return {
    ...state,
    rows: [...state.rows, ...Array.from({ length: rowsToAdd }, () => ({}))],
  };
}

export function addColumn(state: GridState, label: string): GridState {
  if (state.columns.length >= MAX_SPREADSHEET_COLUMNS) {
    return state;
  }

  return {
    columns: [...state.columns, label],
    rows: state.rows.map((row) => ({
      ...row,
      [columnKey(state.columns.length)]: null,
    })),
  };
}

export function renameColumn(
  state: GridState,
  index: number,
  label: string,
): GridState {
  return {
    columns: state.columns.map((c, i) => (i === index ? label : c)),
    rows: state.rows,
  };
}

function mapFormulaCells(
  rows: GridRow[],
  adjustment: ReferenceAdjustment,
): GridRow[] {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        isFormulaValue(value)
          ? adjustFormulaReferences(value, adjustment)
          : value,
      ]),
    ),
  );
}

export function deleteColumn(state: GridState, index: number): GridState {
  const rewritten = mapFormulaCells(state.rows, {
    axis: 'column',
    index,
    delta: -1,
  });
  const columns = state.columns.filter((_, i) => i !== index);
  return {
    columns,
    rows: rewritten.map((row) =>
      Object.fromEntries(
        columns.map((_, i) => [
          columnKey(i),
          row[columnKey(i < index ? i : i + 1)] ?? null,
        ]),
      ),
    ),
  };
}

export function moveColumn(
  state: GridState,
  from: number,
  to: number,
): GridState {
  const count = state.columns.length;
  if (from === to || from < 0 || to < 0 || from >= count || to >= count) {
    return state;
  }

  // order[newIndex] = oldIndex
  const order = state.columns.map((_, i) => i);
  order.splice(to, 0, ...order.splice(from, 1));
  const newIndexByOld = new Map(
    order.map((oldIdx, newIdx) => [oldIdx, newIdx]),
  );
  const mapIndex = (index: number) => newIndexByOld.get(index) ?? index;

  return {
    columns: order.map((oldIdx) => state.columns[oldIdx]),
    rows: state.rows.map((row) =>
      Object.fromEntries(
        order.map((oldIdx, newIdx) => {
          const value = row[columnKey(oldIdx)] ?? null;
          return [
            columnKey(newIdx),
            isFormulaValue(value)
              ? remapFormulaColumns(value, mapIndex)
              : value,
          ];
        }),
      ),
    ),
  };
}

export interface RowOperation {
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  fromRowIndex: number;
  toRowIndex: number;
}

/**
 * Rewrites formula references after grid row insertions/deletions. Applied to
 * the post-operation rows; each inserted/deleted row shifts references one
 * step, so multi-row operations are applied iteratively.
 */
export function rewriteFormulasForRowOperations(
  rows: GridRow[],
  operations: RowOperation[],
): GridRow[] {
  let result = rows;
  for (const operation of operations) {
    if (operation.type === 'UPDATE') {
      continue;
    }
    const count = operation.toRowIndex - operation.fromRowIndex;
    const delta = operation.type === 'CREATE' ? 1 : -1;
    for (let i = 0; i < count; i++) {
      result = mapFormulaCells(result, {
        axis: 'row',
        index: operation.fromRowIndex,
        delta,
      });
    }
  }
  return result;
}

export function deleteRow(state: GridState, index: number): GridState {
  if (index < 0 || index >= state.rows.length) {
    return state;
  }

  const rows = state.rows.filter((_, rowIndex) => rowIndex !== index);
  return {
    ...state,
    rows: rewriteFormulasForRowOperations(rows, [
      { type: 'DELETE', fromRowIndex: index, toRowIndex: index + 1 },
    ]),
  };
}

export function columnHasData(state: GridState, index: number): boolean {
  const key = columnKey(index);
  return state.rows.some((row) => Boolean(row[key]));
}
