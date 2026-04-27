import { ModelTier } from 'src/domain/models/domain/value-objects/model-tier.enum';
import { SetFairUseLimitUseCase } from './set-fair-use-limit.use-case';
import { SetFairUseLimitCommand } from './set-fair-use-limit.command';
import type { PlatformConfigRepositoryPort } from '../../ports/platform-config.repository';
import { PlatformConfigInvalidValueError } from '../../platform-config.errors';
import { PlatformConfigKey } from '../../../domain/platform-config-keys.enum';

describe('SetFairUseLimitUseCase', () => {
  let useCase: SetFairUseLimitUseCase;
  let repository: jest.Mocked<PlatformConfigRepositoryPort>;

  beforeEach(() => {
    repository = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      setMany: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<PlatformConfigRepositoryPort>;

    useCase = new SetFairUseLimitUseCase(repository);
  });

  it('should atomically write the limit and window keys for the LOW tier in a single setMany call', async () => {
    await useCase.execute(
      new SetFairUseLimitCommand({
        tier: ModelTier.LOW,
        limit: 1500,
        windowMs: 3600000,
      }),
    );

    expect(repository.set).not.toHaveBeenCalled();
    expect(repository.setMany).toHaveBeenCalledTimes(1);
    expect(repository.setMany).toHaveBeenCalledWith(
      new Map<PlatformConfigKey, string>([
        [PlatformConfigKey.FAIR_USE_LOW_LIMIT, '1500'],
        [PlatformConfigKey.FAIR_USE_LOW_WINDOW_MS, '3600000'],
      ]),
    );
  });

  it('should atomically write the limit and window keys for the MEDIUM tier', async () => {
    await useCase.execute(
      new SetFairUseLimitCommand({
        tier: ModelTier.MEDIUM,
        limit: 250,
        windowMs: 7200000,
      }),
    );

    expect(repository.setMany).toHaveBeenCalledTimes(1);
    expect(repository.setMany).toHaveBeenCalledWith(
      new Map<PlatformConfigKey, string>([
        [PlatformConfigKey.FAIR_USE_MEDIUM_LIMIT, '250'],
        [PlatformConfigKey.FAIR_USE_MEDIUM_WINDOW_MS, '7200000'],
      ]),
    );
  });

  it('should atomically write the limit and window keys for the HIGH tier', async () => {
    await useCase.execute(
      new SetFairUseLimitCommand({
        tier: ModelTier.HIGH,
        limit: 60,
        windowMs: 10800000,
      }),
    );

    expect(repository.setMany).toHaveBeenCalledTimes(1);
    expect(repository.setMany).toHaveBeenCalledWith(
      new Map<PlatformConfigKey, string>([
        [PlatformConfigKey.FAIR_USE_HIGH_LIMIT, '60'],
        [PlatformConfigKey.FAIR_USE_HIGH_WINDOW_MS, '10800000'],
      ]),
    );
  });

  it('should reject a zero limit', async () => {
    await expect(
      useCase.execute(
        new SetFairUseLimitCommand({
          tier: ModelTier.LOW,
          limit: 0,
          windowMs: 3600000,
        }),
      ),
    ).rejects.toThrow(PlatformConfigInvalidValueError);
    expect(repository.setMany).not.toHaveBeenCalled();
  });

  it('should reject a negative limit', async () => {
    await expect(
      useCase.execute(
        new SetFairUseLimitCommand({
          tier: ModelTier.MEDIUM,
          limit: -10,
          windowMs: 3600000,
        }),
      ),
    ).rejects.toThrow(PlatformConfigInvalidValueError);
    expect(repository.setMany).not.toHaveBeenCalled();
  });

  it('should reject a NaN limit', async () => {
    await expect(
      useCase.execute(
        new SetFairUseLimitCommand({
          tier: ModelTier.HIGH,
          limit: NaN,
          windowMs: 3600000,
        }),
      ),
    ).rejects.toThrow(PlatformConfigInvalidValueError);
    expect(repository.setMany).not.toHaveBeenCalled();
  });

  it('should reject an Infinity limit', async () => {
    await expect(
      useCase.execute(
        new SetFairUseLimitCommand({
          tier: ModelTier.LOW,
          limit: Infinity,
          windowMs: 3600000,
        }),
      ),
    ).rejects.toThrow(PlatformConfigInvalidValueError);
    expect(repository.setMany).not.toHaveBeenCalled();
  });

  it('should reject a fractional (non-integer) limit', async () => {
    await expect(
      useCase.execute(
        new SetFairUseLimitCommand({
          tier: ModelTier.MEDIUM,
          limit: 200.5,
          windowMs: 3600000,
        }),
      ),
    ).rejects.toThrow(PlatformConfigInvalidValueError);
    expect(repository.setMany).not.toHaveBeenCalled();
  });

  it('should reject a zero windowMs', async () => {
    await expect(
      useCase.execute(
        new SetFairUseLimitCommand({
          tier: ModelTier.LOW,
          limit: 100,
          windowMs: 0,
        }),
      ),
    ).rejects.toThrow(PlatformConfigInvalidValueError);
    expect(repository.setMany).not.toHaveBeenCalled();
  });

  it('should reject a negative windowMs', async () => {
    await expect(
      useCase.execute(
        new SetFairUseLimitCommand({
          tier: ModelTier.MEDIUM,
          limit: 100,
          windowMs: -1,
        }),
      ),
    ).rejects.toThrow(PlatformConfigInvalidValueError);
    expect(repository.setMany).not.toHaveBeenCalled();
  });

  it('should reject a NaN windowMs', async () => {
    await expect(
      useCase.execute(
        new SetFairUseLimitCommand({
          tier: ModelTier.HIGH,
          limit: 100,
          windowMs: NaN,
        }),
      ),
    ).rejects.toThrow(PlatformConfigInvalidValueError);
    expect(repository.setMany).not.toHaveBeenCalled();
  });

  it('should reject a fractional (non-integer) windowMs', async () => {
    await expect(
      useCase.execute(
        new SetFairUseLimitCommand({
          tier: ModelTier.HIGH,
          limit: 100,
          windowMs: 3600000.25,
        }),
      ),
    ).rejects.toThrow(PlatformConfigInvalidValueError);
    expect(repository.setMany).not.toHaveBeenCalled();
  });

  it('should reject the ZERO tier — it has no fair-use limit to configure', async () => {
    let caught: PlatformConfigInvalidValueError | null = null;
    try {
      await useCase.execute(
        new SetFairUseLimitCommand({
          tier: ModelTier.ZERO,
          limit: 100,
          windowMs: 3600000,
        }),
      );
    } catch (error) {
      caught = error as PlatformConfigInvalidValueError;
    }

    expect(caught).toBeInstanceOf(PlatformConfigInvalidValueError);
    expect(caught?.metadata).toEqual({
      key: null,
      reason: "unknown model tier 'zero'",
    });
    expect(repository.setMany).not.toHaveBeenCalled();
  });

  it('should reject an unknown tier before touching the repository', async () => {
    let caught: PlatformConfigInvalidValueError | null = null;
    try {
      await useCase.execute(
        new SetFairUseLimitCommand({
          tier: 'bogus' as ModelTier,
          limit: 100,
          windowMs: 3600000,
        }),
      );
    } catch (error) {
      caught = error as PlatformConfigInvalidValueError;
    }

    expect(caught).toBeInstanceOf(PlatformConfigInvalidValueError);
    // The metadata.key must be `null` for command-level rejections so
    // operators paged on this error don't inspect a real (and healthy)
    // platform-config row, and so dashboards grouping by `metadata.key`
    // don't conflate this with genuine per-key corruption. The bad tier
    // value belongs in the reason string instead.
    expect(caught?.metadata).toEqual({
      key: null,
      reason: "unknown model tier 'bogus'",
    });
    expect(repository.setMany).not.toHaveBeenCalled();
  });
});
