import { Injectable } from '@nestjs/common';
import { PlatformConfigRepositoryPort } from 'src/iam/platform-config/application/ports/platform-config.repository';
import { PlatformConfigKey } from 'src/iam/platform-config/domain/platform-config-keys.enum';
import { SetAdventCalendarEnabledCommand } from './set-advent-calendar-enabled.command';

@Injectable()
export class SetAdventCalendarEnabledUseCase {
  constructor(
    private readonly configRepository: PlatformConfigRepositoryPort,
  ) {}

  async execute(command: SetAdventCalendarEnabledCommand): Promise<void> {
    await this.configRepository.set(
      PlatformConfigKey.ADVENT_CALENDAR_ENABLED,
      command.enabled ? 'true' : 'false',
    );
  }
}
