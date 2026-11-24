import { Injectable } from '@nestjs/common';
import { PlatformConfigRepositoryPort } from 'src/iam/platform-config/application/ports/platform-config.repository';
import { PlatformConfigKey } from 'src/iam/platform-config/domain/platform-config-keys.enum';
import { SetOparlEmbeddingModelIdCommand } from './set-oparl-embedding-model-id.command';

/** Stores the choice only; the OParl module checks the model and re-embeds. */
@Injectable()
export class SetOparlEmbeddingModelIdUseCase {
  constructor(
    private readonly configRepository: PlatformConfigRepositoryPort,
  ) {}

  async execute(command: SetOparlEmbeddingModelIdCommand): Promise<void> {
    await this.configRepository.set(
      PlatformConfigKey.OPARL_EMBEDDING_MODEL_ID,
      command.modelId,
    );
  }
}
