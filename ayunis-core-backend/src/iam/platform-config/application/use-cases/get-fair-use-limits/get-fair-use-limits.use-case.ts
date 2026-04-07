import { Injectable, Logger } from '@nestjs/common';
import { PlatformConfigRepositoryPort } from '../../ports/platform-config.repository';
import { PlatformConfigKey } from '../../../domain/platform-config-keys.enum';
import { FairUseLimitsByTier } from '../../../domain/fair-use-limits';

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

/**
 * Baked-in defaults used whenever a platform-config key is missing or stores
 * an invalid value. These match the legacy hardcoded fair-use quota for the
 * medium tier (200 / 3h) and pick sensible bookends for low and high.
 */
const DEFAULT_FAIR_USE_LIMITS: FairUseLimitsByTier = {
  low: { limit: 1000, windowMs: THREE_HOURS_MS },
  medium: { limit: 200, windowMs: THREE_HOURS_MS },
  high: { limit: 50, windowMs: THREE_HOURS_MS },
};

@Injectable()
export class GetFairUseLimitsUseCase {
  private readonly logger = new Logger(GetFairUseLimitsUseCase.name);
  private readonly warnedKeys = new Set<PlatformConfigKey>();

  constructor(
    private readonly configRepository: PlatformConfigRepositoryPort,
  ) {}

  async execute(): Promise<FairUseLimitsByTier> {
    const [
      lowLimit,
      lowWindow,
      mediumLimit,
      mediumWindow,
      highLimit,
      highWindow,
    ] = await Promise.all([
      this.readPositiveNumber(
        PlatformConfigKey.FAIR_USE_LOW_LIMIT,
        DEFAULT_FAIR_USE_LIMITS.low.limit,
      ),
      this.readPositiveNumber(
        PlatformConfigKey.FAIR_USE_LOW_WINDOW_MS,
        DEFAULT_FAIR_USE_LIMITS.low.windowMs,
      ),
      this.readPositiveNumber(
        PlatformConfigKey.FAIR_USE_MEDIUM_LIMIT,
        DEFAULT_FAIR_USE_LIMITS.medium.limit,
      ),
      this.readPositiveNumber(
        PlatformConfigKey.FAIR_USE_MEDIUM_WINDOW_MS,
        DEFAULT_FAIR_USE_LIMITS.medium.windowMs,
      ),
      this.readPositiveNumber(
        PlatformConfigKey.FAIR_USE_HIGH_LIMIT,
        DEFAULT_FAIR_USE_LIMITS.high.limit,
      ),
      this.readPositiveNumber(
        PlatformConfigKey.FAIR_USE_HIGH_WINDOW_MS,
        DEFAULT_FAIR_USE_LIMITS.high.windowMs,
      ),
    ]);

    return {
      low: { limit: lowLimit, windowMs: lowWindow },
      medium: { limit: mediumLimit, windowMs: mediumWindow },
      high: { limit: highLimit, windowMs: highWindow },
    };
  }

  private async readPositiveNumber(
    key: PlatformConfigKey,
    defaultValue: number,
  ): Promise<number> {
    const config = await this.configRepository.get(key);

    if (!config) {
      this.warnOnce(key, () =>
        this.logger.warn(
          `Platform config key '${key}' is not set; falling back to default`,
          { key, defaultValue },
        ),
      );
      return defaultValue;
    }

    const parsed = Number.parseFloat(config.value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      this.warnOnce(key, () =>
        this.logger.warn(
          `Platform config key '${key}' has an invalid value; falling back to default`,
          { key, storedValue: config.value, defaultValue },
        ),
      );
      return defaultValue;
    }

    // A previously missing/invalid key is now valid — allow future misses to
    // warn again so operators aren't left guessing if config regresses.
    this.warnedKeys.delete(key);
    return parsed;
  }

  private warnOnce(key: PlatformConfigKey, emit: () => void): void {
    if (this.warnedKeys.has(key)) {
      return;
    }
    this.warnedKeys.add(key);
    emit();
  }
}
