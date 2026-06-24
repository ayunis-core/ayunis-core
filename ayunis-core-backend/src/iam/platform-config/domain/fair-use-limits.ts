export interface FairUseLimit {
  limit: number;
  windowMs: number;
}

export interface FairUseLimitsByTier {
  // `zero` is included so the super-admin UI can configure every
  // `ModelTier` value uniformly. The run-time fair-use check skips ZERO
  // (`tierToFairUseQuotaType` returns `null`), so this value is purely
  // informational — it round-trips through the API but is never read by
  // `QuotaLimitResolverService`.
  zero: FairUseLimit;
  low: FairUseLimit;
  medium: FairUseLimit;
  high: FairUseLimit;
  // Image generation has no model tiering today (most orgs run a single
  // image-gen model), so it gets a single global bucket alongside the per-tier
  // message buckets. See AYC-71.
  images: FairUseLimit;
}
