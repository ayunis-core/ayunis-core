import { SetCreditsPerEuroUseCase } from './set-credits-per-euro.use-case';
import { SetCreditsPerEuroCommand } from './set-credits-per-euro.command';
import type { PlatformConfigRepositoryPort } from '../../ports/platform-config.repository';
import { PlatformConfigInvalidValueError } from '../../platform-config.errors';
import { PlatformConfigKey } from '../../../domain/platform-config-keys.enum';

describe('SetCreditsPerEuroUseCase', () => {
  let useCase: SetCreditsPerEuroUseCase;
  let repository: jest.Mocked<PlatformConfigRepositoryPort>;

  beforeEach(() => {
    repository = {
      get: jest.fn(),
      set: jest.fn(),
    } as jest.Mocked<PlatformConfigRepositoryPort>;

    useCase = new SetCreditsPerEuroUseCase(repository);
  });

  it('should store the credits-per-euro value in the repository', async () => {
    repository.set.mockResolvedValue(undefined);

    const command = new SetCreditsPerEuroCommand({ creditsPerEuro: 1000 });
    await useCase.execute(command);

    expect(repository.set).toHaveBeenCalledWith(
      PlatformConfigKey.CREDITS_PER_EURO,
      '1000',
    );
  });

  it('should store a decimal credits-per-euro value', async () => {
    repository.set.mockResolvedValue(undefined);

    const command = new SetCreditsPerEuroCommand({ creditsPerEuro: 1500.75 });
    await useCase.execute(command);

    expect(repository.set).toHaveBeenCalledWith(
      PlatformConfigKey.CREDITS_PER_EURO,
      '1500.75',
    );
  });

  it('should reject credits-per-euro value of zero', async () => {
    const command = new SetCreditsPerEuroCommand({ creditsPerEuro: 0 });

    await expect(useCase.execute(command)).rejects.toThrow(
      PlatformConfigInvalidValueError,
    );
    expect(repository.set).not.toHaveBeenCalled();
  });

  it('should reject negative credits-per-euro value', async () => {
    const command = new SetCreditsPerEuroCommand({ creditsPerEuro: -50 });

    await expect(useCase.execute(command)).rejects.toThrow(
      PlatformConfigInvalidValueError,
    );
    expect(repository.set).not.toHaveBeenCalled();
  });

  it('should reject NaN credits-per-euro value', async () => {
    const command = new SetCreditsPerEuroCommand({ creditsPerEuro: NaN });

    await expect(useCase.execute(command)).rejects.toThrow(
      PlatformConfigInvalidValueError,
    );
    expect(repository.set).not.toHaveBeenCalled();
  });

  it('should reject Infinity credits-per-euro value', async () => {
    const command = new SetCreditsPerEuroCommand({ creditsPerEuro: Infinity });

    await expect(useCase.execute(command)).rejects.toThrow(
      PlatformConfigInvalidValueError,
    );
    expect(repository.set).not.toHaveBeenCalled();
  });
});
