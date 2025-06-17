import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { ModelRegistry } from '../../registry/model.registry';
import { CreatePermittedModelCommand } from './create-permitted-model.command';
import { ModelNotFoundError } from '../../models.errors';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CreatePermittedModelUseCase {
  private readonly logger = new Logger(CreatePermittedModelUseCase.name);
  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly modelRegistry: ModelRegistry,
  ) {}

  async execute(command: CreatePermittedModelCommand): Promise<void> {
    this.logger.log('execute', {
      modelName: command.modelName,
      modelProvider: command.modelProvider,
      orgId: command.orgId,
    });
    try {
      const model = this.modelRegistry.getAvailableModel(
        command.modelName,
        command.modelProvider,
      );
      const permittedModel = new PermittedModel({
        model: model.model,
        orgId: command.orgId,
      });
      await this.permittedModelsRepository.create(permittedModel);
    } catch (error) {
      if (error instanceof ModelNotFoundError) {
        throw error;
      }
      this.logger.error('Error creating permitted model', error);
      throw error; // TODO: Handle this error
    }
  }
}
