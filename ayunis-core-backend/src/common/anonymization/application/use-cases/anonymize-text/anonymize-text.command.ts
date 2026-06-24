import type { PiiMask } from '../../../domain/pii-mask';
import type { PiiWhitelistEntry } from '../../../domain/pii-whitelist-entry';

export class AnonymizeTextCommand {
  constructor(
    public readonly text: string,
    public readonly entities?: string[],
    public readonly whitelist?: PiiWhitelistEntry[],
    /**
     * When set (even if empty), detections are replaced with stable
     * `{{pii:CATEGORY_n}}` tokens dedup'd against these masks instead of the
     * legacy `[ENTITY_TYPE]` placeholders.
     */
    public readonly existingMasks?: PiiMask[],
  ) {}
}
