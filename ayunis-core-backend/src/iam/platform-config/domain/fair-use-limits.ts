export interface FairUseLimit {
  limit: number;
  windowMs: number;
}

export interface FairUseLimitsByTier {
  low: FairUseLimit;
  medium: FairUseLimit;
  high: FairUseLimit;
}
