import { Injectable, Logger } from '@nestjs/common';
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
 * Resolves the platform-config key pair for a given tier. `ZERO` returns
 * `null` to signal "no configurable fair-use limit" — the same null-bucket
 * convention used by `tierToFairUseQuotaType`. Callers must treat `null`
 * as a no-op (no row to write, no deduction at runtime).
 *
 * The exhaustive switch keeps `ModelTier` first-class — adding a new tier
 * requires a deliberate decision here rather than silently falling through
 * a `Partial<Record>` lookup.
 */
function tierToConfigKeys(tier: ModelTier): TierKeyPair | null {
  switch (tier) {
    case ModelTier.ZERO:
      return null;
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
  private readonly logger = new Logger(SetFairUseLimitUseCase.name);

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
      // `metadata.key` from confusing this with genuine LOW-tier corruption.
      // The bad tier value lives in the reason string.
      throw new PlatformConfigInvalidValueError(
        null,
        `unknown model tier '${String(command.tier)}'`,
      );
    }

    const tierKeys = tierToConfigKeys(command.tier);
    if (tierKeys === null) {
      // ZERO is exempt from fair-use enforcement (no quota bucket, no
      // deduction at runtime — see `tierToFairUseQuotaType`). Configuring
      // a limit for it is a no-op rather than an error: the caller's
      // intent ("set the limit for this tier") is satisfied vacuously,
      // and idempotent no-op semantics keep super-admin tooling that
      // bulk-applies limits across all tiers from special-casing ZERO.
      this.logger.debug(
        'Ignoring fair-use limit set for ZERO tier (no quota bucket)',
        { tier: command.tier },
      );
      return;
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
