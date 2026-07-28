// Relative imports on purpose: piscina loads this file directly in a worker
// thread, outside the app bootstrap that resolves `src/...` path aliases.
import { countPdfPages, extractPdfPageTexts } from './pdf-text-parser';

// Piscina worker entry: tasks are selected by export name via pool.run's
// `name` option. Buffers arrive as structured-clone Uint8Arrays.

export async function countPages(data: Uint8Array): Promise<number> {
  return countPdfPages(Buffer.from(data));
}

export async function extractPageTexts(data: Uint8Array): Promise<string[]> {
  return extractPdfPageTexts(Buffer.from(data));
}
