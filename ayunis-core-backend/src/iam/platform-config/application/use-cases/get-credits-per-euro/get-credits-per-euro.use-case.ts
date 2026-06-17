import { Injectable } from '@nestjs/common';
import { PlatformConfigRepositoryPort } from '../../ports/platform-config.repository';
import { PlatformConfigKey } from '../../../domain/platform-config-keys.enum';
import {
  PlatformConfigInvalidValueError,
  PlatformConfigNotFoundError,
} from '../../platform-config.errors';

@Injectable()
export class GetCreditsPerEuroUseCase {
  constructor(
    private readonly configRepository: PlatformConfigRepositoryPort,
  ) {}

  async execute(): Promise<number> {
    const config = await this.configRepository.get(
      PlatformConfigKey.CREDITS_PER_EURO,
    );

    if (!config) {
      throw new PlatformConfigNotFoundError(PlatformConfigKey.CREDITS_PER_EURO);
    }

    const result = parseFloat(config.value);

    if (!Number.isFinite(result)) {
      throw new PlatformConfigInvalidValueError(
        PlatformConfigKey.CREDITS_PER_EURO,
        'stored value is not a valid number',
      );
    }

    return result;
  }
}
