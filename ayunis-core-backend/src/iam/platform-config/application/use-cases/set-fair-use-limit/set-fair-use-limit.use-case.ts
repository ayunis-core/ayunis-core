import { Injectable } from '@nestjs/common';
import { ModelTier } from 'src/domain/models/domain/value-objects/model-tier.enum';
import { PlatformConfigRepositoryPort } from '../../ports/platform-config.repository';
import { PlatformConfigKey } from '../../../domain/platform-config-keys.enum';
import { PlatformConfigInvalidValueError } from '../../platform-config.errors';
import { SetFairUseLimitCommand } from './set-fair-use-limit.command';

interface TierKeyPair {
  limitKey: PlatformConfigKey;
  windowKey: PlatformConfigKey;
}

// `ZERO` is intentionally absent — it has no fair-use limit to configure;
// passing it through `SetFairUseLimitCommand` is rejected with the same
// "unknown model tier" path used for genuinely invalid values.
const TIER_KEYS: Partial<Record<ModelTier, TierKeyPair>> = {
  [ModelTier.LOW]: {
    limitKey: PlatformConfigKey.FAIR_USE_LOW_LIMIT,
    windowKey: PlatformConfigKey.FAIR_USE_LOW_WINDOW_MS,
  },
  [ModelTier.MEDIUM]: {
    limitKey: PlatformConfigKey.FAIR_USE_MEDIUM_LIMIT,
    windowKey: PlatformConfigKey.FAIR_USE_MEDIUM_WINDOW_MS,
  },
  [ModelTier.HIGH]: {
    limitKey: PlatformConfigKey.FAIR_USE_HIGH_LIMIT,
    windowKey: PlatformConfigKey.FAIR_USE_HIGH_WINDOW_MS,
  },
};

@Injectable()
export class SetFairUseLimitUseCase {
  constructor(
    private readonly configRepository: PlatformConfigRepositoryPort,
  ) {}

  async execute(command: SetFairUseLimitCommand): Promise<void> {
    // `Partial<Record<ModelTier, …>>` returns `undefined` for tiers without
    // a configurable limit (currently `ZERO`) and for non-HTTP callers that
    // pass a value outside the enum entirely.
    const tierKeys = TIER_KEYS[command.tier];
    if (!tierKeys) {
      // No real PlatformConfigKey corresponds to this rejection — it's an
      // invalid *command argument*, not an invalid stored value. Passing
      // `null` for the key prevents operators and dashboards grouping by
      // `metadata.key` from confusing this with genuine LOW-tier corruption.
      // The bad tier value lives in the reason string.
      throw new PlatformConfigInvalidValueError(
        null,
        `unknown model tier '${String(command.tier)}'`,
      );
    }
    const { limitKey, windowKey } = tierKeys;

    if (!Number.isInteger(command.limit) || command.limit <= 0) {
      throw new PlatformConfigInvalidValueError(
        limitKey,
        'must be a positive integer',
      );
    }

    if (!Number.isInteger(command.windowMs) || command.windowMs <= 0) {
      throw new PlatformConfigInvalidValueError(
        windowKey,
        'must be a positive integer',
      );
    }

    await this.configRepository.setMany(
      new Map<PlatformConfigKey, string>([
        [limitKey, command.limit.toString()],
        [windowKey, command.windowMs.toString()],
      ]),
    );
  }
}
