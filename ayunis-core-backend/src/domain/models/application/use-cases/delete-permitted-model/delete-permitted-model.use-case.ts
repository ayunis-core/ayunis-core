import { Injectable, Logger } from '@nestjs/common';

import { DeletePermittedModelCommand } from './delete-permitted-model.command';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { PermittedModelDeletionFailedError } from '../../models.errors';

@Injectable()
export class DeletePermittedModelUseCase {
  private readonly logger = new Logger(DeletePermittedModelUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
  ) {}

  async execute(command: DeletePermittedModelCommand): Promise<void> {
    this.logger.log('execute', {
      modelId: command.modelId,
      orgId: command.orgId,
    });
    try {
      await this.permittedModelsRepository.delete({
        id: command.modelId,
        orgId: command.orgId,
      });
    } catch (error) {
      this.logger.error('Error deleting permitted model', error);
      throw new PermittedModelDeletionFailedError(error.message);
    }
  }
}
