declare module 'fast-formula-parser' {
  export interface CellRef {
    row: number;
    col: number;
    sheet?: string;
  }

  export interface RangeRef {
    from: { row: number; col: number };
    to: { row: number; col: number };
    sheet?: string;
  }

  export class FormulaError extends Error {
    constructor(error: string, msg?: string, details?: unknown);
    readonly error: string;
    readonly details?: unknown;
  }

  export type ParsedValue = string | number | boolean | null | FormulaError;

  interface FormulaParserConfig {
    onCell?: (ref: CellRef) => string | number | boolean | null;
    onRange?: (ref: RangeRef) => (string | number | boolean | null)[][];
  }

  export default class FormulaParser {
    constructor(config?: FormulaParserConfig);
    parse(formula: string, position: CellRef): ParsedValue;
  }
}
