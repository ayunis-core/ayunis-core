import type { ModelTier } from 'src/domain/models/domain/value-objects/model-tier.enum';

export class SetFairUseLimitCommand {
  readonly tier: ModelTier;
  readonly limit: number;
  readonly windowMs: number;

  constructor(params: { tier: ModelTier; limit: number; windowMs: number }) {
    this.tier = params.tier;
    this.limit = params.limit;
    this.windowMs = params.windowMs;
  }
}
