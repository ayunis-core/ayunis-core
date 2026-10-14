import { GetAcademyMinimumModuleSecondsUseCase } from './get-academy-minimum-module-seconds.use-case';
import type { PlatformConfigRepositoryPort } from 'src/iam/platform-config/application/ports/platform-config.repository';
import { PlatformConfig } from 'src/iam/platform-config/domain/platform-config.entity';
import { PlatformConfigInvalidValueError } from 'src/iam/platform-config/application/platform-config.errors';
import { PlatformConfigKey } from 'src/iam/platform-config/domain/platform-config-keys.enum';

describe('GetAcademyMinimumModuleSecondsUseCase', () => {
  let useCase: GetAcademyMinimumModuleSecondsUseCase;
  let repository: jest.Mocked<PlatformConfigRepositoryPort>;

  beforeEach(() => {
    repository = {
      get: jest.fn(),
      set: jest.fn(),
      setMany: jest.fn(),
    };

    useCase = new GetAcademyMinimumModuleSecondsUseCase(repository);
  });

  it('defaults to 60 seconds when nothing is configured', async () => {
    repository.get.mockResolvedValue(null);

    await expect(useCase.execute()).resolves.toBe(60);
    expect(repository.get).toHaveBeenCalledWith(
      PlatformConfigKey.ACADEMY_MINIMUM_MODULE_SECONDS,
    );
  });

  it('returns the configured value', async () => {
    repository.get.mockResolvedValue(
      new PlatformConfig({
        key: PlatformConfigKey.ACADEMY_MINIMUM_MODULE_SECONDS,
        value: '0',
      }),
    );

    await expect(useCase.execute()).resolves.toBe(0);
  });

  it('rejects a corrupted stored value', async () => {
    repository.get.mockResolvedValue(
      new PlatformConfig({
        key: PlatformConfigKey.ACADEMY_MINIMUM_MODULE_SECONDS,
        value: 'abc',
      }),
    );

    await expect(useCase.execute()).rejects.toThrow(
      PlatformConfigInvalidValueError,
    );
  });
});
