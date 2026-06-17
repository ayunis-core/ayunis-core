import type { PiiCategory } from './pii-category.enum';

/**
 * A stable pseudonym for one original PII value within a thread. The same
 * (category, value) pair always resolves to the same token, so the LLM can
 * refer to entities coherently across messages.
 */
export interface PiiMask {
  category: PiiCategory;
  /** 1-based, numbered per category within a thread. */
  maskIndex: number;
  /** The original (sensitive) text the token stands in for. */
  value: string;
}

export function formatPiiToken(
  mask: Pick<PiiMask, 'category' | 'maskIndex'>,
): string {
  return `{{pii:${mask.category.toUpperCase()}_${mask.maskIndex}}}`;
}
