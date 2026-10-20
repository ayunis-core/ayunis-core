import { Injectable } from '@nestjs/common';
import { PlatformConfigRepositoryPort } from 'src/iam/platform-config/application/ports/platform-config.repository';
import { PlatformConfigKey } from 'src/iam/platform-config/domain/platform-config-keys.enum';
import { isValidAcademyMinimumModuleSeconds } from 'src/iam/platform-config/domain/academy-minimum-module-seconds';
import { PlatformConfigInvalidValueError } from 'src/iam/platform-config/application/platform-config.errors';
import { SetAcademyMinimumModuleSecondsCommand } from './set-academy-minimum-module-seconds.command';

@Injectable()
export class SetAcademyMinimumModuleSecondsUseCase {
  constructor(
    private readonly configRepository: PlatformConfigRepositoryPort,
  ) {}

  async execute(command: SetAcademyMinimumModuleSecondsCommand): Promise<void> {
    if (!isValidAcademyMinimumModuleSeconds(command.seconds)) {
      throw new PlatformConfigInvalidValueError(
        PlatformConfigKey.ACADEMY_MINIMUM_MODULE_SECONDS,
        'must be a non-negative integer',
      );
    }

    await this.configRepository.set(
      PlatformConfigKey.ACADEMY_MINIMUM_MODULE_SECONDS,
      String(command.seconds),
    );
  }
}
