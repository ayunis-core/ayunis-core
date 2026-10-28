// Relative import on purpose: piscina loads this file directly in a worker
// thread, outside the app bootstrap that resolves `src/...` path aliases.
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { extractTextFromMsg } from '../../../../../common/util/msg';

export type MsgWorkerResult = { text: string } | { error: string };

// Piscina worker entry. Parse errors are returned rather than thrown so the
// adapter can tell an unreadable file apart from a failing worker.
export function extractText(data: Uint8Array): MsgWorkerResult {
  try {
    return { text: extractTextFromMsg(Buffer.from(data)) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
