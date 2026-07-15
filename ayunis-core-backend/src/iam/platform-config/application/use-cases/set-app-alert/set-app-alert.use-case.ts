import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedPlatformConfigError } from 'src/iam/platform-config/application/platform-config.errors';
import { Injectable } from '@nestjs/common';
import { PlatformConfigRepositoryPort } from '../../ports/platform-config.repository';
import { PlatformConfigKey } from '../../../domain/platform-config-keys.enum';
import { PlatformConfigInvalidValueError } from '../../platform-config.errors';
import { APP_ALERT_MESSAGE_MAX_LENGTH } from '../../../domain/app-alert';
import { SetAppAlertCommand } from './set-app-alert.command';

@Injectable()
export class SetAppAlertUseCase {
  constructor(
    private readonly configRepository: PlatformConfigRepositoryPort,
  ) {}

  @HandleUnexpectedErrors(UnexpectedPlatformConfigError)
  async execute(command: SetAppAlertCommand): Promise<void> {
    if (command.message.length > APP_ALERT_MESSAGE_MAX_LENGTH) {
      throw new PlatformConfigInvalidValueError(
        PlatformConfigKey.APP_ALERT_MESSAGE,
        `must be at most ${APP_ALERT_MESSAGE_MAX_LENGTH} characters`,
      );
    }

    // The banner is meaningless without text, so a request to enable it must
    // carry a non-empty message. Disabling it may clear the message.
    if (command.enabled && command.message.trim().length === 0) {
      throw new PlatformConfigInvalidValueError(
        PlatformConfigKey.APP_ALERT_MESSAGE,
        'message is required when the alert is enabled',
      );
    }

    await this.configRepository.setMany(
      new Map<PlatformConfigKey, string>([
        [
          PlatformConfigKey.APP_ALERT_ENABLED,
          command.enabled ? 'true' : 'false',
        ],
        [PlatformConfigKey.APP_ALERT_MESSAGE, command.message],
      ]),
    );
  }
}
