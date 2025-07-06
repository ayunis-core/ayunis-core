import { Injectable, Logger } from '@nestjs/common';
import { ModelsRepository } from '../../ports/models.repository';
import { DeleteModelCommand } from './delete-model.command';
import {
  ModelNotFoundByIdError,
  ModelDeletionFailedError,
} from '../../models.errors';
import { GetPermittedModelsUseCase } from '../get-permitted-models/get-permitted-models.use-case';
import { GetPermittedModelsQuery } from '../get-permitted-models/get-permitted-models.query';
import { DeletePermittedModelUseCase } from '../delete-permitted-model/delete-permitted-model.use-case';
import { DeletePermittedModelCommand } from '../delete-permitted-model/delete-permitted-model.command';
import { FindAllOrgIdsUseCase } from 'src/iam/orgs/application/use-cases/find-all-org-ids/find-all-org-ids.use-case';

@Injectable()
export class DeleteModelUseCase {
  private readonly logger = new Logger(DeleteModelUseCase.name);

  constructor(
    private readonly modelsRepository: ModelsRepository,
    private readonly findAllOrgIdsUseCase: FindAllOrgIdsUseCase,
    private readonly getPermittedModelsUseCase: GetPermittedModelsUseCase,
    private readonly deletePermittedModelUseCase: DeletePermittedModelUseCase,
  ) {}

  async execute(command: DeleteModelCommand): Promise<void> {
    this.logger.log('execute', {
      id: command.id,
    });

    try {
      // Check if model exists
      const existingModel = await this.modelsRepository.findOne({
        id: command.id,
      });

      if (!existingModel) {
        throw new ModelNotFoundByIdError(command.id);
      }

      const orgIds = await this.findAllOrgIdsUseCase.execute();

      // Delete all permitted models that reference this model
      for await (const orgId of orgIds) {
        const permittedModels = await this.getPermittedModelsUseCase.execute(
          new GetPermittedModelsQuery(orgId, {
            modelId: command.id,
          }),
        );

        for await (const permittedModel of permittedModels) {
          await this.deletePermittedModelUseCase.execute(
            new DeletePermittedModelCommand({
              orgId: permittedModel.orgId,
              permittedModelId: permittedModel.id,
            }),
          );
        }
      }

      await this.modelsRepository.delete(command.id);
    } catch (error) {
      if (error instanceof ModelNotFoundByIdError) {
        throw error;
      }
      this.logger.error('Error deleting model', error);
      throw new ModelDeletionFailedError(error.message);
    }
  }
}
