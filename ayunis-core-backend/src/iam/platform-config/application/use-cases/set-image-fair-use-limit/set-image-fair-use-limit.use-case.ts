import { Injectable } from '@nestjs/common';
import { PlatformConfigRepositoryPort } from '../../ports/platform-config.repository';
import { PlatformConfigKey } from '../../../domain/platform-config-keys.enum';
import { PlatformConfigInvalidValueError } from '../../platform-config.errors';
import { SetImageFairUseLimitCommand } from './set-image-fair-use-limit.command';

@Injectable()
export class SetImageFairUseLimitUseCase {
  constructor(
    private readonly configRepository: PlatformConfigRepositoryPort,
  ) {}

  async execute(command: SetImageFairUseLimitCommand): Promise<void> {
    if (!Number.isInteger(command.limit) || command.limit <= 0) {
      throw new PlatformConfigInvalidValueError(
        PlatformConfigKey.FAIR_USE_IMAGES_LIMIT,
        'must be a positive integer',
      );
    }

    if (!Number.isInteger(command.windowMs) || command.windowMs <= 0) {
      throw new PlatformConfigInvalidValueError(
        PlatformConfigKey.FAIR_USE_IMAGES_WINDOW_MS,
        'must be a positive integer',
      );
    }

    await this.configRepository.setMany(
      new Map<PlatformConfigKey, string>([
        [PlatformConfigKey.FAIR_USE_IMAGES_LIMIT, command.limit.toString()],
        [
          PlatformConfigKey.FAIR_USE_IMAGES_WINDOW_MS,
          command.windowMs.toString(),
        ],
      ]),
    );
  }
}
