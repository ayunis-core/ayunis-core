import { Logger } from '@nestjs/common';
import { GetFairUseLimitsUseCase } from './get-fair-use-limits.use-case';
import type { PlatformConfigRepositoryPort } from '../../ports/platform-config.repository';
import { PlatformConfig } from '../../../domain/platform-config.entity';
import { PlatformConfigKey } from '../../../domain/platform-config-keys.enum';

describe('GetFairUseLimitsUseCase', () => {
  let useCase: GetFairUseLimitsUseCase;
  let repository: jest.Mocked<PlatformConfigRepositoryPort>;
  let warnSpy: jest.SpyInstance;

  const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

  beforeEach(() => {
    repository = {
      get: jest.fn(),
      set: jest.fn(),
      setMany: jest.fn(),
    } as jest.Mocked<PlatformConfigRepositoryPort>;

    useCase = new GetFairUseLimitsUseCase(repository);
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  const stubConfig = (values: Partial<Record<PlatformConfigKey, string>>) => {
    repository.get.mockImplementation(async (key: PlatformConfigKey) => {
      const value = values[key];
      return value !== undefined ? new PlatformConfig({ key, value }) : null;
    });
  };

  it('should return all configured values when every key is present', async () => {
    stubConfig({
      [PlatformConfigKey.FAIR_USE_ZERO_LIMIT]: '999999',
      [PlatformConfigKey.FAIR_USE_ZERO_WINDOW_MS]: '3600000',
      [PlatformConfigKey.FAIR_USE_LOW_LIMIT]: '1500',
      [PlatformConfigKey.FAIR_USE_LOW_WINDOW_MS]: '3600000',
      [PlatformConfigKey.FAIR_USE_MEDIUM_LIMIT]: '300',
      [PlatformConfigKey.FAIR_USE_MEDIUM_WINDOW_MS]: '7200000',
      [PlatformConfigKey.FAIR_USE_HIGH_LIMIT]: '75',
      [PlatformConfigKey.FAIR_USE_HIGH_WINDOW_MS]: '10800000',
      [PlatformConfigKey.FAIR_USE_IMAGES_LIMIT]: '25',
      [PlatformConfigKey.FAIR_USE_IMAGES_WINDOW_MS]: '86400000',
    });

    const result = await useCase.execute();

    expect(result).toEqual({
      zero: { limit: 999999, windowMs: 3600000 },
      low: { limit: 1500, windowMs: 3600000 },
      medium: { limit: 300, windowMs: 7200000 },
      high: { limit: 75, windowMs: 10800000 },
      images: { limit: 25, windowMs: 86400000 },
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('should fall back to baked-in defaults and warn once per key when every key is missing', async () => {
    repository.get.mockResolvedValue(null);

    const result = await useCase.execute();

    expect(result).toEqual({
      zero: { limit: 1_000_000, windowMs: THREE_HOURS_MS },
      low: { limit: 1000, windowMs: THREE_HOURS_MS },
      medium: { limit: 200, windowMs: THREE_HOURS_MS },
      high: { limit: 50, windowMs: THREE_HOURS_MS },
      images: { limit: 10, windowMs: TWENTY_FOUR_HOURS_MS },
    });
    expect(warnSpy).toHaveBeenCalledTimes(10);

    // Calling again with the same (still-missing) state must not re-warn —
    // otherwise the quota resolver would flood logs on every chat message.
    warnSpy.mockClear();
    await useCase.execute();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('should substitute defaults for individual missing keys while keeping configured ones', async () => {
    stubConfig({
      [PlatformConfigKey.FAIR_USE_MEDIUM_LIMIT]: '250',
      [PlatformConfigKey.FAIR_USE_HIGH_WINDOW_MS]: '21600000',
    });

    const result = await useCase.execute();

    expect(result.zero).toEqual({ limit: 1_000_000, windowMs: THREE_HOURS_MS });
    expect(result.low).toEqual({ limit: 1000, windowMs: THREE_HOURS_MS });
    expect(result.medium).toEqual({ limit: 250, windowMs: THREE_HOURS_MS });
    expect(result.high).toEqual({ limit: 50, windowMs: 21600000 });
    expect(warnSpy).toHaveBeenCalled();
  });

  it('should fall back to default and warn when a stored value is not numeric', async () => {
    stubConfig({
      [PlatformConfigKey.FAIR_USE_ZERO_LIMIT]: '1000000',
      [PlatformConfigKey.FAIR_USE_ZERO_WINDOW_MS]: '3600000',
      [PlatformConfigKey.FAIR_USE_LOW_LIMIT]: 'not-a-number',
      [PlatformConfigKey.FAIR_USE_LOW_WINDOW_MS]: '3600000',
      [PlatformConfigKey.FAIR_USE_MEDIUM_LIMIT]: '200',
      [PlatformConfigKey.FAIR_USE_MEDIUM_WINDOW_MS]: '3600000',
      [PlatformConfigKey.FAIR_USE_HIGH_LIMIT]: '50',
      [PlatformConfigKey.FAIR_USE_HIGH_WINDOW_MS]: '3600000',
    });

    const result = await useCase.execute();

    expect(result.low.limit).toBe(1000);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(PlatformConfigKey.FAIR_USE_LOW_LIMIT),
      expect.objectContaining({
        key: PlatformConfigKey.FAIR_USE_LOW_LIMIT,
        storedValue: 'not-a-number',
      }),
    );
  });

  it('should re-warn after a key recovers and then regresses to missing again', async () => {
    // First run: every key is missing, so each produces one warn.
    repository.get.mockResolvedValue(null);
    await useCase.execute();
    expect(warnSpy).toHaveBeenCalledTimes(10);

    // Second run: every key is now valid. No new warns, AND crucially the
    // success branch must `warnedKeys.delete(key)` so a future regression
    // can warn again. This assertion alone still passes if `delete` is
    // dropped — the *third* run is what locks the contract in.
    warnSpy.mockClear();
    stubConfig({
      [PlatformConfigKey.FAIR_USE_ZERO_LIMIT]: '999999',
      [PlatformConfigKey.FAIR_USE_ZERO_WINDOW_MS]: '3600000',
      [PlatformConfigKey.FAIR_USE_LOW_LIMIT]: '1500',
      [PlatformConfigKey.FAIR_USE_LOW_WINDOW_MS]: '3600000',
      [PlatformConfigKey.FAIR_USE_MEDIUM_LIMIT]: '300',
      [PlatformConfigKey.FAIR_USE_MEDIUM_WINDOW_MS]: '7200000',
      [PlatformConfigKey.FAIR_USE_HIGH_LIMIT]: '75',
      [PlatformConfigKey.FAIR_USE_HIGH_WINDOW_MS]: '10800000',
      [PlatformConfigKey.FAIR_USE_IMAGES_LIMIT]: '25',
      [PlatformConfigKey.FAIR_USE_IMAGES_WINDOW_MS]: '86400000',
    });
    await useCase.execute();
    expect(warnSpy).toHaveBeenCalledTimes(0);

    // Third run: config has been wiped again. Because the previous run
    // cleared `warnedKeys`, each key must re-warn so operators aren't left
    // guessing when config silently regresses. If the `delete` line is
    // dropped from the use case, this assertion fails (0 vs 10).
    warnSpy.mockClear();
    repository.get.mockResolvedValue(null);
    await useCase.execute();
    expect(warnSpy).toHaveBeenCalledTimes(10);
  });

  it('should expose the configured images limit when set and fall back independently of message tiers', async () => {
    // Only the per-tier message keys are configured; the images keys remain
    // missing. The images bucket should fall back to its baked-in default
    // (10 / 24h) without affecting the configured message tiers.
    stubConfig({
      [PlatformConfigKey.FAIR_USE_LOW_LIMIT]: '1500',
      [PlatformConfigKey.FAIR_USE_LOW_WINDOW_MS]: '3600000',
      [PlatformConfigKey.FAIR_USE_MEDIUM_LIMIT]: '300',
      [PlatformConfigKey.FAIR_USE_MEDIUM_WINDOW_MS]: '7200000',
      [PlatformConfigKey.FAIR_USE_HIGH_LIMIT]: '75',
      [PlatformConfigKey.FAIR_USE_HIGH_WINDOW_MS]: '10800000',
    });

    const result = await useCase.execute();

    expect(result.images).toEqual({
      limit: 10,
      windowMs: TWENTY_FOUR_HOURS_MS,
    });
    expect(result.low).toEqual({ limit: 1500, windowMs: 3600000 });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(PlatformConfigKey.FAIR_USE_IMAGES_LIMIT),
      expect.objectContaining({
        key: PlatformConfigKey.FAIR_USE_IMAGES_LIMIT,
      }),
    );
  });

  it('should fall back to default and warn when a stored value is negative or zero', async () => {
    stubConfig({
      [PlatformConfigKey.FAIR_USE_ZERO_LIMIT]: '1000000',
      [PlatformConfigKey.FAIR_USE_ZERO_WINDOW_MS]: '3600000',
      [PlatformConfigKey.FAIR_USE_LOW_LIMIT]: '1000',
      [PlatformConfigKey.FAIR_USE_LOW_WINDOW_MS]: '3600000',
      [PlatformConfigKey.FAIR_USE_MEDIUM_LIMIT]: '0',
      [PlatformConfigKey.FAIR_USE_MEDIUM_WINDOW_MS]: '3600000',
      [PlatformConfigKey.FAIR_USE_HIGH_LIMIT]: '50',
      [PlatformConfigKey.FAIR_USE_HIGH_WINDOW_MS]: '-5',
    });

    const result = await useCase.execute();

    expect(result.medium.limit).toBe(200);
    expect(result.high.windowMs).toBe(THREE_HOURS_MS);
    expect(warnSpy).toHaveBeenCalled();
  });
});
