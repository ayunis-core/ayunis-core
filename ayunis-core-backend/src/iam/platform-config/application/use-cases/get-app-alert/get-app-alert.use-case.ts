import { Injectable } from '@nestjs/common';
import { PlatformConfigRepositoryPort } from '../../ports/platform-config.repository';
import { PlatformConfigKey } from '../../../domain/platform-config-keys.enum';
import { AppAlert } from '../../../domain/app-alert';

@Injectable()
export class GetAppAlertUseCase {
  constructor(
    private readonly configRepository: PlatformConfigRepositoryPort,
  ) {}

  async execute(): Promise<AppAlert> {
    const [enabledConfig, messageConfig] = await Promise.all([
      this.configRepository.get(PlatformConfigKey.APP_ALERT_ENABLED),
      this.configRepository.get(PlatformConfigKey.APP_ALERT_MESSAGE),
    ]);

    return {
      enabled: enabledConfig?.value === 'true',
      message: messageConfig?.value ?? '',
    };
  }
}
