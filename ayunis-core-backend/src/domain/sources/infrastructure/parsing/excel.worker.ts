import type {
  ParsedCsvData,
  ParsedSheet,
} from 'src/domain/sources/application/ports/spreadsheet-parser.port';
import { listDataSheetNames, parseExcelBuffer } from './excel-parser';
// Relative value imports on purpose: piscina loads this file directly in a
// worker thread, outside the app bootstrap that resolves `src/...` path
// aliases. Type-only imports are erased at compile time, so they stay absolute.
import { parseCSV } from '../../../../common/util/csv';

// Piscina worker entry: tasks are selected by export name via pool.run's
// `name` option. Buffers arrive as structured-clone Uint8Arrays.

export function parseWorkbook(data: Uint8Array): ParsedSheet[] {
  return parseExcelBuffer(Buffer.from(data));
}

export function listDataSheets(data: Uint8Array): string[] {
  return listDataSheetNames(Buffer.from(data));
}

export function parseCsv(text: string): ParsedCsvData {
  const { headers, data } = parseCSV(text);
  return { headers, rows: data };
}
