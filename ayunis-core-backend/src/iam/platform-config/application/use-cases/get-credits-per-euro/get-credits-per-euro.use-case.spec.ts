import { GetCreditsPerEuroUseCase } from './get-credits-per-euro.use-case';
import type { PlatformConfigRepositoryPort } from '../../ports/platform-config.repository';
import { PlatformConfig } from '../../../domain/platform-config.entity';
import {
  PlatformConfigInvalidValueError,
  PlatformConfigNotFoundError,
} from '../../platform-config.errors';
import { PlatformConfigKey } from '../../../domain/platform-config-keys.enum';

describe('GetCreditsPerEuroUseCase', () => {
  let useCase: GetCreditsPerEuroUseCase;
  let repository: jest.Mocked<PlatformConfigRepositoryPort>;

  beforeEach(() => {
    repository = {
      get: jest.fn(),
      set: jest.fn(),
      setMany: jest.fn(),
    } as jest.Mocked<PlatformConfigRepositoryPort>;

    useCase = new GetCreditsPerEuroUseCase(repository);
  });

  it('should return the credits-per-euro value from the repository', async () => {
    repository.get.mockResolvedValue(
      new PlatformConfig({
        key: PlatformConfigKey.CREDITS_PER_EURO,
        value: '1000',
      }),
    );

    const result = await useCase.execute();

    expect(result).toBe(1000);
    expect(repository.get).toHaveBeenCalledWith(
      PlatformConfigKey.CREDITS_PER_EURO,
    );
  });

  it('should return a decimal credits-per-euro value correctly', async () => {
    repository.get.mockResolvedValue(
      new PlatformConfig({
        key: PlatformConfigKey.CREDITS_PER_EURO,
        value: '1500.5',
      }),
    );

    const result = await useCase.execute();

    expect(result).toBe(1500.5);
  });

  it('should throw PlatformConfigNotFoundError when credits-per-euro is not configured', async () => {
    repository.get.mockResolvedValue(null);

    await expect(useCase.execute()).rejects.toThrow(
      PlatformConfigNotFoundError,
    );
  });

  it('should throw PlatformConfigInvalidValueError when stored value is corrupted', async () => {
    repository.get.mockResolvedValue(
      new PlatformConfig({
        key: PlatformConfigKey.CREDITS_PER_EURO,
        value: 'abc',
      }),
    );

    await expect(useCase.execute()).rejects.toThrow(
      PlatformConfigInvalidValueError,
    );
  });
});
