import { SetAppAlertUseCase } from './set-app-alert.use-case';
import { SetAppAlertCommand } from './set-app-alert.command';
import type { PlatformConfigRepositoryPort } from '../../ports/platform-config.repository';
import { PlatformConfigInvalidValueError } from '../../platform-config.errors';
import { PlatformConfigKey } from 'src/iam/platform-config/domain/platform-config-keys.enum';
import { APP_ALERT_MESSAGE_MAX_LENGTH } from 'src/iam/platform-config/domain/app-alert';

describe('SetAppAlertUseCase', () => {
  let useCase: SetAppAlertUseCase;
  let repository: jest.Mocked<PlatformConfigRepositoryPort>;

  beforeEach(() => {
    repository = {
      get: jest.fn(),
      set: jest.fn(),
      setMany: jest.fn(),
    };

    useCase = new SetAppAlertUseCase(repository);
  });

  it('should persist the enabled flag and message as a single batch', async () => {
    await useCase.execute(
      new SetAppAlertCommand({
        enabled: true,
        message: 'The system is currently experiencing degraded performance.',
      }),
    );

    expect(repository.setMany).toHaveBeenCalledWith(
      new Map([
        [PlatformConfigKey.APP_ALERT_ENABLED, 'true'],
        [
          PlatformConfigKey.APP_ALERT_MESSAGE,
          'The system is currently experiencing degraded performance.',
        ],
      ]),
    );
  });

  it('should allow disabling the alert with an empty message', async () => {
    await useCase.execute(
      new SetAppAlertCommand({ enabled: false, message: '' }),
    );

    expect(repository.setMany).toHaveBeenCalledWith(
      new Map([
        [PlatformConfigKey.APP_ALERT_ENABLED, 'false'],
        [PlatformConfigKey.APP_ALERT_MESSAGE, ''],
      ]),
    );
  });

  it('should reject enabling the alert without a message', async () => {
    await expect(
      useCase.execute(
        new SetAppAlertCommand({ enabled: true, message: '   ' }),
      ),
    ).rejects.toThrow(PlatformConfigInvalidValueError);
    expect(repository.setMany).not.toHaveBeenCalled();
  });

  it('should reject a message longer than the maximum length', async () => {
    await expect(
      useCase.execute(
        new SetAppAlertCommand({
          enabled: true,
          message: 'a'.repeat(APP_ALERT_MESSAGE_MAX_LENGTH + 1),
        }),
      ),
    ).rejects.toThrow(PlatformConfigInvalidValueError);
    expect(repository.setMany).not.toHaveBeenCalled();
  });
});
