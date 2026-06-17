import { assertNever } from 'src/common/util/assert-never';
import { ModelTier } from 'src/domain/models/domain/value-objects/model-tier.enum';
import { QuotaType } from './quota-type.enum';

/**
 * Maps a `ModelTier` to its tiered fair-use quota bucket. Untiered models
 * (`tier === undefined`) fall back to MEDIUM — the safest choice given the
 * legacy single-bucket limit lived there.
 *
 * `ZERO` returns `null` to signal "no quota bucket" — the tier is exempt from
 * fair-use enforcement entirely (no row in `usage_quotas`, no limit lookup).
 * Callers must skip the quota check when the result is `null`.
 *
 * Lives next to `QuotaType` (rather than in runs) because the mapping is a
 * pure quotas concept — runs only knows it has a model and asks quotas which
 * bucket to charge.
 */
export function tierToFairUseQuotaType(
  tier: ModelTier | undefined,
): QuotaType | null {
  switch (tier) {
    case ModelTier.ZERO:
      return null;
    case ModelTier.LOW:
      return QuotaType.FAIR_USE_MESSAGES_LOW;
    case ModelTier.HIGH:
      return QuotaType.FAIR_USE_MESSAGES_HIGH;
    case ModelTier.MEDIUM:
    case undefined:
      return QuotaType.FAIR_USE_MESSAGES_MEDIUM;
    default:
      return assertNever(tier);
  }
}
