import { SetAcademyMinimumModuleSecondsUseCase } from './set-academy-minimum-module-seconds.use-case';
import { SetAcademyMinimumModuleSecondsCommand } from './set-academy-minimum-module-seconds.command';
import type { PlatformConfigRepositoryPort } from 'src/iam/platform-config/application/ports/platform-config.repository';
import { PlatformConfigInvalidValueError } from 'src/iam/platform-config/application/platform-config.errors';
import { PlatformConfigKey } from 'src/iam/platform-config/domain/platform-config-keys.enum';

describe('SetAcademyMinimumModuleSecondsUseCase', () => {
  let useCase: SetAcademyMinimumModuleSecondsUseCase;
  let repository: jest.Mocked<PlatformConfigRepositoryPort>;

  beforeEach(() => {
    repository = {
      get: jest.fn(),
      set: jest.fn(),
      setMany: jest.fn(),
    };

    useCase = new SetAcademyMinimumModuleSecondsUseCase(repository);
  });

  it.each([0, 60, 300])('stores %p seconds', async (seconds) => {
    await useCase.execute(
      new SetAcademyMinimumModuleSecondsCommand({ seconds }),
    );

    expect(repository.set).toHaveBeenCalledWith(
      PlatformConfigKey.ACADEMY_MINIMUM_MODULE_SECONDS,
      String(seconds),
    );
  });

  it.each([-1, 1.5, NaN, Infinity])('rejects %p', async (seconds) => {
    await expect(
      useCase.execute(new SetAcademyMinimumModuleSecondsCommand({ seconds })),
    ).rejects.toThrow(PlatformConfigInvalidValueError);
    expect(repository.set).not.toHaveBeenCalled();
  });
});
