import { createHash } from 'crypto';
import type { UUID } from 'crypto';

/**
 * Deterministic id for an assistant turn, derived from the run id and the
 * iteration index. The streamed copy (event adapter) and the persisted copy
 * (persistence hook) both compute it independently, so the live message keeps
 * its id after a reload — matching the legacy loop, where a single message
 * instance was both streamed and saved.
 */
export function assistantMessageId(runId: string, iteration: number): UUID {
  const digest = createHash('sha256')
    .update(`${runId}:${iteration}:assistant`)
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
