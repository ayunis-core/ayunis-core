import { createHash } from 'crypto';
import type { UUID } from 'crypto';

/**
 * Deterministic message ids for one runtime turn, derived from the run id and
 * iteration. The streamed copy (event adapter) and the persisted copy (the
 * persistence hook) compute the id independently, so a persisted message keeps
 * the id that the live stream exposed before reload.
 */
export function assistantMessageId(runId: string, iteration: number): UUID {
  return deterministicId(runId, iteration, 'assistant');
}

export function toolResultMessageId(runId: string, iteration: number): UUID {
  return deterministicId(runId, iteration, 'tool_result');
}

function deterministicId(runId: string, iteration: number, kind: string): UUID {
  const digest = createHash('sha256')
    .update(`${runId}:${iteration}:${kind}`)
    .digest('hex');
  return formatAsUuid(digest);
}

/** Shapes 32 hex chars into a v4-formatted UUID (version + variant nibbles). */
function formatAsUuid(hex: string): UUID {
  const chars = hex.slice(0, 32).split('');
  chars[12] = '4';
  chars[16] = ((parseInt(chars[16], 16) & 0x3) | 0x8).toString(16);
  const h = chars.join('');
  const uuid: UUID = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
  return uuid;
}
