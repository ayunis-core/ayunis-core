import { Injectable } from '@nestjs/common';
import { PlatformConfigRepositoryPort } from 'src/iam/platform-config/application/ports/platform-config.repository';
import { PlatformConfigKey } from 'src/iam/platform-config/domain/platform-config-keys.enum';
import {
  DEFAULT_ACADEMY_MINIMUM_MODULE_SECONDS,
  isValidAcademyMinimumModuleSeconds,
} from 'src/iam/platform-config/domain/academy-minimum-module-seconds';
import { PlatformConfigInvalidValueError } from 'src/iam/platform-config/application/platform-config.errors';

@Injectable()
export class GetAcademyMinimumModuleSecondsUseCase {
  constructor(
    private readonly configRepository: PlatformConfigRepositoryPort,
  ) {}

  async execute(): Promise<number> {
    const config = await this.configRepository.get(
      PlatformConfigKey.ACADEMY_MINIMUM_MODULE_SECONDS,
    );
    if (!config) {
      return DEFAULT_ACADEMY_MINIMUM_MODULE_SECONDS;
    }

    const seconds = Number(config.value);
    if (!isValidAcademyMinimumModuleSeconds(seconds)) {
      throw new PlatformConfigInvalidValueError(
        PlatformConfigKey.ACADEMY_MINIMUM_MODULE_SECONDS,
        'stored value is not a non-negative integer',
      );
    }
    return seconds;
  }
}
