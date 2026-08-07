import type { GridState } from './spreadsheet-grid-state';
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

export function deleteColumn(state: GridState, index: number): GridState {
  const columns = state.columns.filter((_, i) => i !== index);
  return {
    columns,
    rows: state.rows.map((row) =>
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

  const order = state.columns.map((_, index) => index);
  order.splice(to, 0, ...order.splice(from, 1));

  return {
    columns: order.map((oldIndex) => state.columns[oldIndex]),
    rows: state.rows.map((row) =>
      Object.fromEntries(
        order.map((oldIndex, newIndex) => [
          columnKey(newIndex),
          row[columnKey(oldIndex)] ?? null,
        ]),
      ),
    ),
  };
}

export function columnHasData(state: GridState, index: number): boolean {
  const key = columnKey(index);
  return state.rows.some((row) => Boolean(row[key]));
}
