import { Injectable, Logger } from '@nestjs/common';
import { PlatformConfigRepositoryPort } from 'src/iam/platform-config/application/ports/platform-config.repository';
import { PlatformConfigInvalidValueError } from 'src/iam/platform-config/application/platform-config.errors';
import { PlatformConfigKey } from 'src/iam/platform-config/domain/platform-config-keys.enum';
import { SetRecordingFairUseLimitCommand } from './set-recording-fair-use-limit.command';

@Injectable()
export class SetRecordingFairUseLimitUseCase {
  private readonly logger = new Logger(SetRecordingFairUseLimitUseCase.name);

  constructor(
    private readonly configRepository: PlatformConfigRepositoryPort,
  ) {}

  async execute(command: SetRecordingFairUseLimitCommand): Promise<void> {
    this.logger.log(
      { limit: command.limit, windowMs: command.windowMs },
      'Setting recording fair-use limit',
    );
    if (!Number.isInteger(command.limit) || command.limit <= 0) {
      throw new PlatformConfigInvalidValueError(
        PlatformConfigKey.FAIR_USE_RECORDINGS_LIMIT,
        'must be a positive integer',
      );
    }
    if (!Number.isInteger(command.windowMs) || command.windowMs <= 0) {
      throw new PlatformConfigInvalidValueError(
        PlatformConfigKey.FAIR_USE_RECORDINGS_WINDOW_MS,
        'must be a positive integer',
      );
    }

    await this.configRepository.setMany(
      new Map<PlatformConfigKey, string>([
        [PlatformConfigKey.FAIR_USE_RECORDINGS_LIMIT, command.limit.toString()],
        [
          PlatformConfigKey.FAIR_USE_RECORDINGS_WINDOW_MS,
          command.windowMs.toString(),
        ],
      ]),
    );
  }
}
