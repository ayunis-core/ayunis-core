import { useEffect, useMemo, useState } from 'react';
import type { RefObject } from 'react';
import type { RowDefinition } from '@revolist/react-datagrid';
import type { GridRow } from '@/widgets/spreadsheet-editor/model/spreadsheet-grid-state';
import { readElementMetrics, readFormulaMetrics } from './column-auto-fit';
import {
  computeRowDefinitions,
  memoizeMeasurer,
  type RowHeightMetrics,
} from './row-auto-height';

function readRowHeightMetrics(grid: HTMLElement): RowHeightMetrics | undefined {
  const cell = grid.querySelector('revogr-data[col-type="rgCol"] .rgCell');
  const cellMetrics = cell ? readElementMetrics(cell) : undefined;
  const formulaMetrics = cell ? readFormulaMetrics(cell) : undefined;
  if (!cell || !cellMetrics || !formulaMetrics) {
    return undefined;
  }
  const style = getComputedStyle(cell);
  return {
    measureText: memoizeMeasurer(cellMetrics.measure),
    measureFormula: memoizeMeasurer(formulaMetrics.measure),
    lineHeight: parseFloat(style.lineHeight),
    horizontalPadding: cellMetrics.padding,
    verticalPadding:
      (parseFloat(style.paddingTop) || 0) +
      (parseFloat(style.paddingBottom) || 0),
  };
}

/**
 * RevoGrid rows have a fixed height, so wrapped cell text is measured up
 * front and passed back as per-row heights.
 */
export function useRowAutoHeight(
  gridRef: RefObject<HTMLElement | null>,
  rows: GridRow[],
  displayValues: string[][],
  columnWidths: number[],
): RowDefinition[] {
  const [metrics, setMetrics] = useState<RowHeightMetrics>();
  const hasRows = rows.length > 0 && columnWidths.length > 0;

  // Font and padding come from a rendered data cell, which only exists once
  // RevoGrid has rendered at least one row.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || metrics || !hasRows) {
      return;
    }
    const read = () => {
      const next = readRowHeightMetrics(grid);
      if (next) {
        setMetrics(next);
      }
    };
    read();
    grid.addEventListener('afterrender', read);
    return () => grid.removeEventListener('afterrender', read);
  }, [gridRef, metrics, hasRows]);

  return useMemo(
    () =>
      metrics
        ? computeRowDefinitions(rows, displayValues, columnWidths, metrics)
        : [],
    [metrics, rows, displayValues, columnWidths],
  );
}
