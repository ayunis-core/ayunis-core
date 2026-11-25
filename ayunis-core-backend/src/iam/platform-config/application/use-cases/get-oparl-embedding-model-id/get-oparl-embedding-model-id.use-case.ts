import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { PlatformConfigRepositoryPort } from 'src/iam/platform-config/application/ports/platform-config.repository';
import { PlatformConfigKey } from 'src/iam/platform-config/domain/platform-config-keys.enum';

/** The model chosen for the OParl mirror, `null` while none was chosen. */
@Injectable()
export class GetOparlEmbeddingModelIdUseCase {
  constructor(
    private readonly configRepository: PlatformConfigRepositoryPort,
  ) {}

  async execute(): Promise<UUID | null> {
    const config = await this.configRepository.get(
      PlatformConfigKey.OPARL_EMBEDDING_MODEL_ID,
    );
    return config ? (config.value as UUID) : null;
  }
}
