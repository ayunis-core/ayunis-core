import { SetImageFairUseLimitUseCase } from './set-image-fair-use-limit.use-case';
import { SetImageFairUseLimitCommand } from './set-image-fair-use-limit.command';
import type { PlatformConfigRepositoryPort } from '../../ports/platform-config.repository';
import { PlatformConfigInvalidValueError } from '../../platform-config.errors';
import { PlatformConfigKey } from '../../../domain/platform-config-keys.enum';

describe('SetImageFairUseLimitUseCase', () => {
  let useCase: SetImageFairUseLimitUseCase;
  let repository: jest.Mocked<PlatformConfigRepositoryPort>;

  beforeEach(() => {
    repository = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      setMany: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<PlatformConfigRepositoryPort>;

    useCase = new SetImageFairUseLimitUseCase(repository);
  });

  it('should atomically write the images limit and window keys in a single setMany call', async () => {
    await useCase.execute(
      new SetImageFairUseLimitCommand({
        limit: 25,
        windowMs: 86400000,
      }),
    );

    expect(repository.set).not.toHaveBeenCalled();
    expect(repository.setMany).toHaveBeenCalledTimes(1);
    expect(repository.setMany).toHaveBeenCalledWith(
      new Map<PlatformConfigKey, string>([
        [PlatformConfigKey.FAIR_USE_IMAGES_LIMIT, '25'],
        [PlatformConfigKey.FAIR_USE_IMAGES_WINDOW_MS, '86400000'],
      ]),
    );
  });

  it('should reject a zero limit', async () => {
    await expect(
      useCase.execute(
        new SetImageFairUseLimitCommand({ limit: 0, windowMs: 86400000 }),
      ),
    ).rejects.toThrow(PlatformConfigInvalidValueError);
    expect(repository.setMany).not.toHaveBeenCalled();
  });

  it('should reject a negative limit', async () => {
    await expect(
      useCase.execute(
        new SetImageFairUseLimitCommand({ limit: -10, windowMs: 86400000 }),
      ),
    ).rejects.toThrow(PlatformConfigInvalidValueError);
    expect(repository.setMany).not.toHaveBeenCalled();
  });

  it('should reject a NaN limit', async () => {
    await expect(
      useCase.execute(
        new SetImageFairUseLimitCommand({ limit: NaN, windowMs: 86400000 }),
      ),
    ).rejects.toThrow(PlatformConfigInvalidValueError);
    expect(repository.setMany).not.toHaveBeenCalled();
  });

  it('should reject an Infinity limit', async () => {
    await expect(
      useCase.execute(
        new SetImageFairUseLimitCommand({
          limit: Infinity,
          windowMs: 86400000,
        }),
      ),
    ).rejects.toThrow(PlatformConfigInvalidValueError);
    expect(repository.setMany).not.toHaveBeenCalled();
  });

  it('should reject a fractional (non-integer) limit', async () => {
    await expect(
      useCase.execute(
        new SetImageFairUseLimitCommand({ limit: 50.5, windowMs: 86400000 }),
      ),
    ).rejects.toThrow(PlatformConfigInvalidValueError);
    expect(repository.setMany).not.toHaveBeenCalled();
  });

  it('should reject a zero windowMs', async () => {
    await expect(
      useCase.execute(
        new SetImageFairUseLimitCommand({ limit: 50, windowMs: 0 }),
      ),
    ).rejects.toThrow(PlatformConfigInvalidValueError);
    expect(repository.setMany).not.toHaveBeenCalled();
  });

  it('should reject a negative windowMs', async () => {
    await expect(
      useCase.execute(
        new SetImageFairUseLimitCommand({ limit: 50, windowMs: -1 }),
      ),
    ).rejects.toThrow(PlatformConfigInvalidValueError);
    expect(repository.setMany).not.toHaveBeenCalled();
  });

  it('should reject a NaN windowMs', async () => {
    await expect(
      useCase.execute(
        new SetImageFairUseLimitCommand({ limit: 50, windowMs: NaN }),
      ),
    ).rejects.toThrow(PlatformConfigInvalidValueError);
    expect(repository.setMany).not.toHaveBeenCalled();
  });

  it('should reject a fractional (non-integer) windowMs', async () => {
    await expect(
      useCase.execute(
        new SetImageFairUseLimitCommand({ limit: 50, windowMs: 86400000.25 }),
      ),
    ).rejects.toThrow(PlatformConfigInvalidValueError);
    expect(repository.setMany).not.toHaveBeenCalled();
  });
});
