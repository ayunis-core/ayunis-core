import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { ModelRegistry } from '../../registry/model.registry';
import { CreatePermittedModelCommand } from './create-permitted-model.command';
import {
  ModelNotFoundError,
  ModelProviderNotPermittedError,
} from '../../models.errors';
import { Injectable, Logger } from '@nestjs/common';
import { IsProviderPermittedUseCase } from '../is-provider-permitted/is-provider-permitted.use-case';
import { IsProviderPermittedQuery } from '../is-provider-permitted/is-provider-permitted.query';

@Injectable()
export class CreatePermittedModelUseCase {
  private readonly logger = new Logger(CreatePermittedModelUseCase.name);
  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly modelRegistry: ModelRegistry,
    private readonly isProviderPermittedUseCase: IsProviderPermittedUseCase,
  ) {}

  async execute(command: CreatePermittedModelCommand): Promise<PermittedModel> {
    this.logger.log('execute', {
      modelId: command.modelId,
      orgId: command.orgId,
    });
    try {
      const model = this.modelRegistry.getAvailableModel(command.modelId);
      const isProviderPermitted = await this.isProviderPermittedUseCase.execute(
        new IsProviderPermittedQuery(command.orgId, model.provider),
      );
      if (!isProviderPermitted) {
        throw new ModelProviderNotPermittedError(model.provider);
      }
      const permittedModel = new PermittedModel({
        model: model,
        orgId: command.orgId,
      });
      const created =
        await this.permittedModelsRepository.create(permittedModel);
      return created;
    } catch (error) {
      if (error instanceof ModelNotFoundError) {
        throw error;
      }
      this.logger.error('Error creating permitted model', error);
      throw error; // TODO: Handle this error
    }
  }
}
