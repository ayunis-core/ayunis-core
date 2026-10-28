import { Injectable, Logger } from '@nestjs/common';
import { PlatformConfigRepositoryPort } from 'src/iam/platform-config/application/ports/platform-config.repository';
import { PlatformConfigKey } from 'src/iam/platform-config/domain/platform-config-keys.enum';
import {
  FairUseLimit,
  FairUseLimitsByTier,
} from 'src/iam/platform-config/domain/fair-use-limits';

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
    const [zero, low, medium, high, images] = await Promise.all([
      this.readLimits(
        PlatformConfigKey.FAIR_USE_ZERO_LIMIT,
        PlatformConfigKey.FAIR_USE_ZERO_WINDOW_MS,
        DEFAULT_FAIR_USE_LIMITS.zero,
      ),
      this.readLimits(
        PlatformConfigKey.FAIR_USE_LOW_LIMIT,
        PlatformConfigKey.FAIR_USE_LOW_WINDOW_MS,
        DEFAULT_FAIR_USE_LIMITS.low,
      ),
      this.readLimits(
        PlatformConfigKey.FAIR_USE_MEDIUM_LIMIT,
        PlatformConfigKey.FAIR_USE_MEDIUM_WINDOW_MS,
        DEFAULT_FAIR_USE_LIMITS.medium,
      ),
      this.readLimits(
        PlatformConfigKey.FAIR_USE_HIGH_LIMIT,
        PlatformConfigKey.FAIR_USE_HIGH_WINDOW_MS,
        DEFAULT_FAIR_USE_LIMITS.high,
      ),
      this.readLimits(
        PlatformConfigKey.FAIR_USE_IMAGES_LIMIT,
        PlatformConfigKey.FAIR_USE_IMAGES_WINDOW_MS,
        DEFAULT_FAIR_USE_LIMITS.images,
      ),
    ]);
    return { zero, low, medium, high, images };
  }

  private async readLimits(
    limitKey: PlatformConfigKey,
    windowKey: PlatformConfigKey,
    defaults: FairUseLimit,
  ): Promise<FairUseLimit> {
    const [limit, windowMs] = await Promise.all([
      this.readPositiveNumber(limitKey, defaults.limit),
      this.readPositiveNumber(windowKey, defaults.windowMs),
    ]);
    return { limit, windowMs };
  }

  private async readPositiveNumber(
    key: PlatformConfigKey,
    defaultValue: number,
  ): Promise<number> {
    const config = await this.configRepository.get(key);

    if (!config) {
      this.warnOnce(key, () =>
        this.logger.warn(
          { key, defaultValue },
          'Platform config key is not set; falling back to default',
        ),
      );
      return defaultValue;
    }

    const parsed = Number.parseFloat(config.value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      this.warnOnce(key, () =>
        this.logger.warn(
          { key, storedValue: config.value, defaultValue },
          'Platform config key has an invalid value; falling back to default',
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
