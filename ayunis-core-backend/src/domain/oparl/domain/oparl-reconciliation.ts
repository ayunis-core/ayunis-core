import type { OparlEntityType } from './oparl-entity-type.enum';

/** A full listing removes at most this share of a type's rows; more looks like a broken listing. */
export const MAX_RECONCILIATION_DELETE_SHARE = 0.1;

export interface OparlTypeReconciliation {
  type: OparlEntityType;
  /** Rows of the type in the mirror. */
  total: number;
  /** Rows removing what the listing did not contain would remove, with what cascades from them. */
  removed: number;
}

export type OparlReconciliationVerdict =
  { deletes: true } | { deletes: false; reason: string };

/**
 * Whether a full listing may remove what it no longer lists: only after a
 * complete, error-free listing, and only if no type would lose more than
 * 10 % of its rows. Otherwise nothing is removed.
 */
export function reconciliationVerdict(
  listingError: string | null,
  counts: OparlTypeReconciliation[],
): OparlReconciliationVerdict {
  if (listingError) {
    return { deletes: false, reason: `Listing incomplete: ${listingError}` };
  }
  const excessive = counts.filter(
    ({ total, removed }) =>
      removed > 0 && removed > total * MAX_RECONCILIATION_DELETE_SHARE,
  );
  if (excessive.length === 0) return { deletes: true };
  const detail = excessive
    .map(({ type, total, removed }) => `${type} ${removed} of ${total}`)
    .join(', ');
  return {
    deletes: false,
    reason: `Would remove more than 10 % of the rows: ${detail}`,
  };
}
