import type { ParsedSheet } from '../../application/ports/spreadsheet-parser.port';
import { parseExcelBuffer } from './excel-parser';

// Piscina worker entry: the buffer arrives as a structured-clone Uint8Array.
export default function parseExcelWorker(data: Uint8Array): ParsedSheet[] {
  return parseExcelBuffer(Buffer.from(data));
}
