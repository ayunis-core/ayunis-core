import { GetAppAlertUseCase } from './get-app-alert.use-case';
import type { PlatformConfigRepositoryPort } from '../../ports/platform-config.repository';
import { PlatformConfig } from '../../../domain/platform-config.entity';
import { PlatformConfigKey } from '../../../domain/platform-config-keys.enum';

describe('GetAppAlertUseCase', () => {
  let useCase: GetAppAlertUseCase;
  let repository: jest.Mocked<PlatformConfigRepositoryPort>;

  beforeEach(() => {
    repository = {
      get: jest.fn(),
      set: jest.fn(),
      setMany: jest.fn(),
    };

    useCase = new GetAppAlertUseCase(repository);
  });

  it('should return the enabled flag and message from the repository', async () => {
    repository.get.mockImplementation((key) => {
      if (key === PlatformConfigKey.APP_ALERT_ENABLED) {
        return Promise.resolve(new PlatformConfig({ key, value: 'true' }));
      }
      return Promise.resolve(
        new PlatformConfig({
          key,
          value: 'Scheduled maintenance tonight at 22:00.',
        }),
      );
    });

    const result = await useCase.execute();

    expect(result).toEqual({
      enabled: true,
      message: 'Scheduled maintenance tonight at 22:00.',
    });
  });

  it('should default to disabled with an empty message when nothing is configured', async () => {
    repository.get.mockResolvedValue(null);

    const result = await useCase.execute();

    expect(result).toEqual({ enabled: false, message: '' });
  });

  it('should treat any stored value other than "true" as disabled', async () => {
    repository.get.mockImplementation((key) => {
      if (key === PlatformConfigKey.APP_ALERT_ENABLED) {
        return Promise.resolve(new PlatformConfig({ key, value: 'false' }));
      }
      return Promise.resolve(
        new PlatformConfig({ key, value: 'Old announcement' }),
      );
    });

    const result = await useCase.execute();

    expect(result).toEqual({ enabled: false, message: 'Old announcement' });
  });
});
