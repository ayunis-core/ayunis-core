import type { RowDefinition } from '@revolist/react-datagrid';
import { isFormulaValue } from '@/widgets/spreadsheet-editor/model/formula-values';
import type { GridRow } from '@/widgets/spreadsheet-editor/model/spreadsheet-grid-state';
import { columnKey } from '@/widgets/spreadsheet-editor/model/spreadsheet-grid-state';
import type { TextMeasurer } from './column-auto-fit';

export interface RowHeightMetrics {
  measureText: TextMeasurer;
  measureFormula: TextMeasurer;
  lineHeight: number;
  horizontalPadding: number;
  verticalPadding: number;
}

// Words repeat across thousands of rows, so each distinct string is measured once.
export function memoizeMeasurer(measure: TextMeasurer): TextMeasurer {
  const widths = new Map<string, number>();
  return (text) => {
    let width = widths.get(text);
    if (width === undefined) {
      width = measure(text);
      widths.set(text, width);
    }
    return width;
  };
}

// Mirrors `overflow-wrap: anywhere`: a word wider than the line breaks
// between characters instead of overflowing.
function breakWord(word: string, width: number, measure: TextMeasurer) {
  let lines = 1;
  let lineWidth = 0;
  for (const char of word) {
    const charWidth = measure(char);
    if (lineWidth > 0 && lineWidth + charWidth > width) {
      lines++;
      lineWidth = 0;
    }
    lineWidth += charWidth;
  }
  return { lines, lineWidth };
}

// Mirrors `white-space: pre-wrap`: spaces before a wrapped word hang at the
// end of the previous line, so only the word itself has to fit.
function countParagraphLines(
  paragraph: string,
  width: number,
  measure: TextMeasurer,
): number {
  if (measure(paragraph) <= width) {
    return 1;
  }
  let lines = 1;
  let lineWidth = 0;
  for (const segment of paragraph.split(/(\s+)/)) {
    const segmentWidth = measure(segment);
    if (segment.trim() === '') {
      lineWidth += segmentWidth;
      continue;
    }
    if (lineWidth > 0 && lineWidth + segmentWidth > width) {
      lines++;
      lineWidth = 0;
    }
    if (lineWidth === 0 && segmentWidth > width) {
      const broken = breakWord(segment, width, measure);
      lines += broken.lines - 1;
      lineWidth = broken.lineWidth;
    } else {
      lineWidth += segmentWidth;
    }
  }
  return lines;
}

export function countWrappedLines(
  text: string,
  width: number,
  measure: TextMeasurer,
): number {
  return text
    .split('\n')
    .reduce(
      (lines, paragraph) =>
        lines + countParagraphLines(paragraph, width, measure),
      0,
    );
}

function countRowLines(
  row: GridRow,
  rowDisplayValues: readonly string[] | undefined,
  columnWidths: readonly number[],
  metrics: RowHeightMetrics,
): number {
  let lines = 1;
  columnWidths.forEach((columnWidth, colIndex) => {
    const raw = row[columnKey(colIndex)];
    if (!raw) {
      return;
    }
    const isFormula = isFormulaValue(raw);
    const text = isFormula ? (rowDisplayValues?.[colIndex] ?? '') : raw;
    const measure = isFormula ? metrics.measureFormula : metrics.measureText;
    const width = columnWidth - metrics.horizontalPadding;
    lines = Math.max(lines, countWrappedLines(text, width, measure));
  });
  return lines;
}

/**
 * Heights for the rows whose wrapped text needs more than one line; every
 * other row keeps the theme's default height.
 */
export function computeRowDefinitions(
  rows: readonly GridRow[],
  displayValues: readonly string[][],
  columnWidths: readonly number[],
  metrics: RowHeightMetrics,
): RowDefinition[] {
  const definitions: RowDefinition[] = [];
  rows.forEach((row, index) => {
    const lines = countRowLines(
      row,
      displayValues.at(index),
      columnWidths,
      metrics,
    );
    if (lines > 1) {
      definitions.push({
        type: 'rgRow',
        index,
        size: lines * metrics.lineHeight + metrics.verticalPadding,
      });
    }
  });
  return definitions;
}
