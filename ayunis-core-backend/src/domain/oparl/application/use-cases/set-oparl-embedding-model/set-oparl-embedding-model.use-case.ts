import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ModelNotFoundByIdError } from 'src/domain/models/application/models.errors';
import { GetModelByIdQuery } from 'src/domain/models/application/use-cases/get-model-by-id/get-model-by-id.query';
import { GetModelByIdUseCase } from 'src/domain/models/application/use-cases/get-model-by-id/get-model-by-id.use-case';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import { SetOparlEmbeddingModelIdCommand } from 'src/iam/platform-config/application/use-cases/set-oparl-embedding-model-id/set-oparl-embedding-model-id.command';
import { SetOparlEmbeddingModelIdUseCase } from 'src/iam/platform-config/application/use-cases/set-oparl-embedding-model-id/set-oparl-embedding-model-id.use-case';
import { OparlSyncJobsPort } from 'src/domain/oparl/application/ports/oparl-sync-jobs.port';
import { OparlSystemsRepository } from 'src/domain/oparl/application/ports/oparl-systems.repository';
import {
  OparlEmbeddingModelNotFoundError,
  UnexpectedOparlError,
} from 'src/domain/oparl/application/oparl.errors';
import { OparlChunkEmbedder } from 'src/domain/oparl/application/services/oparl-chunk-embedder.service';
import { SetOparlEmbeddingModelCommand } from './set-oparl-embedding-model.command';

/**
 * Chooses the catalog embedding model of the whole mirror. A change embeds
 * every chunk again in the background (each system's document job); until
 * then search ignores the vectors of the previous model.
 */
@Injectable()
export class SetOparlEmbeddingModelUseCase {
  private readonly logger = new Logger(SetOparlEmbeddingModelUseCase.name);

  constructor(
    private readonly getModelById: GetModelByIdUseCase,
    private readonly embedder: OparlChunkEmbedder,
    private readonly setModelId: SetOparlEmbeddingModelIdUseCase,
    private readonly systems: OparlSystemsRepository,
    private readonly jobs: OparlSyncJobsPort,
  ) {}

  @HandleUnexpectedErrors(UnexpectedOparlError)
  async execute(
    command: SetOparlEmbeddingModelCommand,
  ): Promise<EmbeddingModel> {
    this.logger.log(
      { modelId: command.modelId },
      'Setting the OParl embedding model',
    );
    const model = await this.catalogEmbeddingModel(command.modelId);
    const previous = await this.embedder.currentModel();
    await this.setModelId.execute(
      new SetOparlEmbeddingModelIdCommand(model.id),
    );
    if (previous?.id !== model.id) {
      const systems = await this.systems.findAll();
      await this.jobs.enqueueDocuments(systems.map((system) => system.id));
    }
    return model;
  }

  private async catalogEmbeddingModel(
    modelId: SetOparlEmbeddingModelCommand['modelId'],
  ): Promise<EmbeddingModel> {
    try {
      const model = await this.getModelById.execute(
        new GetModelByIdQuery(modelId),
      );
      if (model instanceof EmbeddingModel && !model.isArchived) return model;
    } catch (error) {
      if (!(error instanceof ModelNotFoundByIdError)) throw error;
    }
    throw new OparlEmbeddingModelNotFoundError(modelId);
  }
}
