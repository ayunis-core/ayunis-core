import { PiiWhitelistEntry } from 'src/common/anonymization/domain/pii-whitelist-entry';
import type { ThreadPiiMask } from './thread-pii-mask.entity';

/**
 * Turns a manually unmasked mask into a thread-scoped whitelist entry, so the
 * exact value (case-insensitive, like all whitelist matching) is no longer
 * re-masked when it reappears in this thread.
 */
export function toUnmaskedWhitelistEntry(
  mask: ThreadPiiMask,
): PiiWhitelistEntry {
  return new PiiWhitelistEntry(mask.category, escapeRegExp(mask.value));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
