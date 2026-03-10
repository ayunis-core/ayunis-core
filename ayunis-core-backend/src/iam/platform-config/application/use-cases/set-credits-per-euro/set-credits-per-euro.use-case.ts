import { Injectable } from '@nestjs/common';
import { PlatformConfigRepositoryPort } from '../../ports/platform-config.repository';
import { PlatformConfigKey } from '../../../domain/platform-config-keys.enum';
import { PlatformConfigInvalidValueError } from '../../platform-config.errors';
import { SetCreditsPerEuroCommand } from './set-credits-per-euro.command';

@Injectable()
export class SetCreditsPerEuroUseCase {
  constructor(
    private readonly configRepository: PlatformConfigRepositoryPort,
  ) {}

  async execute(command: SetCreditsPerEuroCommand): Promise<void> {
    if (
      !Number.isFinite(command.creditsPerEuro) ||
      command.creditsPerEuro <= 0
    ) {
      throw new PlatformConfigInvalidValueError(
        PlatformConfigKey.CREDITS_PER_EURO,
        'must be greater than 0',
      );
    }

    await this.configRepository.set(
      PlatformConfigKey.CREDITS_PER_EURO,
      command.creditsPerEuro.toString(),
    );
  }
}
