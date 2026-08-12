import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { HasUsageForModelQuery } from 'src/domain/usage/application/use-cases/has-usage-for-model/has-usage-for-model.query';
import { HasUsageForModelUseCase } from 'src/domain/usage/application/use-cases/has-usage-for-model/has-usage-for-model.use-case';
import {
  ModelNotFoundByIdError,
  ModelReferencedByUsageError,
  ModelStillPermittedError,
  UnexpectedModelError,
} from '../../models.errors';
import { ModelsRepository } from '../../ports/models.repository';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { DeleteModelCommand } from './delete-model.command';

@Injectable()
export class DeleteModelUseCase {
  private readonly logger = new Logger(DeleteModelUseCase.name);

  constructor(
    private readonly modelsRepository: ModelsRepository,
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly hasUsageForModelUseCase: HasUsageForModelUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(command: DeleteModelCommand): Promise<void> {
    this.logger.log('Deleting catalog model', { modelId: command.id });

    await this.modelsRepository.withCatalogModelLocked(
      command.id,
      async (existingModel) => {
        if (!existingModel) {
          throw new ModelNotFoundByIdError(command.id);
        }

        const permittedModels =
          await this.permittedModelsRepository.findAllByCatalogModelId(
            command.id,
          );
        if (permittedModels.length > 0) {
          throw new ModelStillPermittedError(command.id);
        }

        const hasUsage = await this.hasUsageForModelUseCase.execute(
          new HasUsageForModelQuery(command.id),
        );
        if (hasUsage) {
          throw new ModelReferencedByUsageError(command.id);
        }

        await this.modelsRepository.delete(command.id);
      },
    );
  }
}
