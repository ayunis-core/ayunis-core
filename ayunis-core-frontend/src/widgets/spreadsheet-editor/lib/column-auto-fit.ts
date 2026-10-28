export const AUTO_FIT_MIN_WIDTH = 60;
export const AUTO_FIT_MAX_WIDTH = 400;

export type TextMeasurer = (text: string) => number;

export function fitColumnWidth(
  headerWidth: number,
  cellTextWidths: readonly number[],
  cellPadding: number,
): number {
  const content = cellTextWidths.reduce(
    (widest, width) => Math.max(widest, width + cellPadding),
    headerWidth,
  );
  return Math.min(
    AUTO_FIT_MAX_WIDTH,
    Math.max(AUTO_FIT_MIN_WIDTH, Math.ceil(content)),
  );
}

interface ElementMetrics {
  measure: TextMeasurer;
  padding: number;
}

// Rows are virtualized, so off-screen cells have no DOM to read widths from;
// measure the text on a canvas using the font of a rendered cell instead.
export function readElementMetrics(
  element: Element,
): ElementMetrics | undefined {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) {
    return undefined;
  }
  const style = getComputedStyle(element);
  context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  return {
    measure: (text) => context.measureText(text).width,
    padding:
      (parseFloat(style.paddingLeft) || 0) +
      (parseFloat(style.paddingRight) || 0),
  };
}
