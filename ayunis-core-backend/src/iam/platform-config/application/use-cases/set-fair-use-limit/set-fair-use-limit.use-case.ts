import { Injectable } from '@nestjs/common';
import { assertNever } from 'src/common/util/assert-never';
import { ModelTier } from 'src/domain/models/domain/value-objects/model-tier.enum';
import { PlatformConfigRepositoryPort } from '../../ports/platform-config.repository';
import { PlatformConfigKey } from '../../../domain/platform-config-keys.enum';
import { PlatformConfigInvalidValueError } from '../../platform-config.errors';
import { SetFairUseLimitCommand } from './set-fair-use-limit.command';

interface TierKeyPair {
  limitKey: PlatformConfigKey;
  windowKey: PlatformConfigKey;
}

/**
 * Resolves the platform-config key pair for a given tier. Every tier —
 * including ZERO — maps to a real key pair so the super-admin UI can
 * configure each tier uniformly.
 *
 * ZERO's stored value is informational: the runtime fair-use check skips
 * ZERO-tier models entirely (`tierToFairUseQuotaType` returns `null`), so
 * the value never participates in a quota deduction. We still persist it
 * so the configuration round-trips through Get/Set without surprising the
 * operator (no silent drops on save).
 *
 * The exhaustive switch keeps `ModelTier` first-class — adding a new tier
 * requires a deliberate decision here.
 */
function tierToConfigKeys(tier: ModelTier): TierKeyPair {
  switch (tier) {
    case ModelTier.ZERO:
      return {
        limitKey: PlatformConfigKey.FAIR_USE_ZERO_LIMIT,
        windowKey: PlatformConfigKey.FAIR_USE_ZERO_WINDOW_MS,
      };
    case ModelTier.LOW:
      return {
        limitKey: PlatformConfigKey.FAIR_USE_LOW_LIMIT,
        windowKey: PlatformConfigKey.FAIR_USE_LOW_WINDOW_MS,
      };
    case ModelTier.MEDIUM:
      return {
        limitKey: PlatformConfigKey.FAIR_USE_MEDIUM_LIMIT,
        windowKey: PlatformConfigKey.FAIR_USE_MEDIUM_WINDOW_MS,
      };
    case ModelTier.HIGH:
      return {
        limitKey: PlatformConfigKey.FAIR_USE_HIGH_LIMIT,
        windowKey: PlatformConfigKey.FAIR_USE_HIGH_WINDOW_MS,
      };
    default:
      return assertNever(tier);
  }
}

@Injectable()
export class SetFairUseLimitUseCase {
  constructor(
    private readonly configRepository: PlatformConfigRepositoryPort,
  ) {}

  async execute(command: SetFairUseLimitCommand): Promise<void> {
    // Validate the tier value is within the enum before doing anything else.
    // Non-HTTP callers (e.g., internal scripts) bypass DTO validation, so we
    // re-check here to fail fast on bogus values like 'foo'.
    if (!Object.values(ModelTier).includes(command.tier)) {
      // No real PlatformConfigKey corresponds to this rejection — it's an
      // invalid *command argument*, not an invalid stored value. Passing
      // `null` for the key prevents operators and dashboards grouping by
      // `metadata.key` from confusing this with genuine per-key corruption.
      // The bad tier value lives in the reason string.
      throw new PlatformConfigInvalidValueError(
        null,
        `unknown model tier '${String(command.tier)}'`,
      );
    }

    const { limitKey, windowKey } = tierToConfigKeys(command.tier);

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
