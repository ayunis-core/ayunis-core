import { Injectable, Logger } from '@nestjs/common';
import { PlatformConfigRepositoryPort } from '../../ports/platform-config.repository';
import { PlatformConfigKey } from '../../../domain/platform-config-keys.enum';
import { FairUseLimitsByTier } from '../../../domain/fair-use-limits';

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Baked-in defaults used whenever a platform-config key is missing or stores
 * an invalid value. These match the legacy hardcoded fair-use quota for the
 * medium tier (200 / 3h) and pick sensible bookends for low and high.
 *
 * The image-generation default (10 / 24h) is conservative on purpose — image
 * calls are the most expensive single tool action we expose, and operators
 * can raise the cap via the super-admin UI without a deploy.
 *
 * `zero` carries the same shape as the other tiers so the response is
 * uniform across `ModelTier`. The default value is a placeholder — the
 * runtime fair-use check skips ZERO entirely (`tierToFairUseQuotaType`
 * returns `null`), so this row is never consulted during quota
 * enforcement. We pick a generous limit so that *if* a future change
 * starts honouring it, the behaviour is "no practical restriction"
 * rather than an accidental hard cap.
 */
const DEFAULT_FAIR_USE_LIMITS: FairUseLimitsByTier = {
  zero: { limit: 1_000_000, windowMs: THREE_HOURS_MS },
  low: { limit: 1000, windowMs: THREE_HOURS_MS },
  medium: { limit: 200, windowMs: THREE_HOURS_MS },
  high: { limit: 50, windowMs: THREE_HOURS_MS },
  images: { limit: 10, windowMs: TWENTY_FOUR_HOURS_MS },
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
      zeroLimit,
      zeroWindow,
      lowLimit,
      lowWindow,
      mediumLimit,
      mediumWindow,
      highLimit,
      highWindow,
      imagesLimit,
      imagesWindow,
    ] = await Promise.all([
      this.readPositiveNumber(
        PlatformConfigKey.FAIR_USE_ZERO_LIMIT,
        DEFAULT_FAIR_USE_LIMITS.zero.limit,
      ),
      this.readPositiveNumber(
        PlatformConfigKey.FAIR_USE_ZERO_WINDOW_MS,
        DEFAULT_FAIR_USE_LIMITS.zero.windowMs,
      ),
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
      this.readPositiveNumber(
        PlatformConfigKey.FAIR_USE_IMAGES_LIMIT,
        DEFAULT_FAIR_USE_LIMITS.images.limit,
      ),
      this.readPositiveNumber(
        PlatformConfigKey.FAIR_USE_IMAGES_WINDOW_MS,
        DEFAULT_FAIR_USE_LIMITS.images.windowMs,
      ),
    ]);

    return {
      zero: { limit: zeroLimit, windowMs: zeroWindow },
      low: { limit: lowLimit, windowMs: lowWindow },
      medium: { limit: mediumLimit, windowMs: mediumWindow },
      high: { limit: highLimit, windowMs: highWindow },
      images: { limit: imagesLimit, windowMs: imagesWindow },
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
