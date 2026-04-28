export interface FairUseLimit {
  limit: number;
  windowMs: number;
}

export interface FairUseLimitsByTier {
  low: FairUseLimit;
  medium: FairUseLimit;
  high: FairUseLimit;
  // Image generation has no model tiering today (most orgs run a single
  // image-gen model), so it gets a single global bucket alongside the per-tier
  // message buckets. See AYC-71.
  images: FairUseLimit;
}
