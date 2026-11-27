import { Injectable } from '@nestjs/common';
import { PlatformConfigRepositoryPort } from 'src/iam/platform-config/application/ports/platform-config.repository';
import { PlatformConfigKey } from 'src/iam/platform-config/domain/platform-config-keys.enum';

@Injectable()
export class GetAdventCalendarEnabledUseCase {
  constructor(
    private readonly configRepository: PlatformConfigRepositoryPort,
  ) {}

  async execute(): Promise<boolean> {
    const config = await this.configRepository.get(
      PlatformConfigKey.ADVENT_CALENDAR_ENABLED,
    );
    return config?.value === 'true';
  }
}
