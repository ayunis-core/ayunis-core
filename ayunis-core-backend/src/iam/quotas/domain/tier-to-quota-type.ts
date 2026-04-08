import { assertNever } from 'src/common/util/assert-never';
import { ModelTier } from 'src/domain/models/domain/value-objects/model-tier.enum';
import { QuotaType } from './quota-type.enum';

/**
 * Maps a `ModelTier` to its tiered fair-use quota bucket. Untiered models
 * (`tier === undefined`) fall back to MEDIUM — the safest choice given the
 * legacy single-bucket limit lived there.
 *
 * Lives next to `QuotaType` (rather than in runs) because the mapping is a
 * pure quotas concept — runs only knows it has a model and asks quotas which
 * bucket to charge.
 */
export function tierToFairUseQuotaType(tier: ModelTier | undefined): QuotaType {
  switch (tier) {
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
