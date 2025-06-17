import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import {
  ModelInvalidInputError,
  PermittedModelNotFoundByIdError,
  PermittedModelNotFoundByNameAndProviderError,
} from '../../models.errors';
import {
  GetPermittedModelByIdQuery,
  GetPermittedModelByNameAndProviderQuery,
  GetPermittedModelQuery,
} from './get-permitted-model.query';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class GetPermittedModelUseCase {
  private readonly logger = new Logger(GetPermittedModelUseCase.name);
  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
  ) {}

  async execute(query: GetPermittedModelQuery): Promise<PermittedModel> {
    this.logger.log('execute', {
      query,
    });
    if (query instanceof GetPermittedModelByIdQuery) {
      this.logger.debug('GetPermittedModelByIdQuery', {
        query,
      });
      const model = await this.permittedModelsRepository.findOne({
        id: query.modelId,
        orgId: query.orgId,
      });
      if (!model) {
        this.logger.error('Permitted model not found', {
          query,
        });
        throw new PermittedModelNotFoundByIdError(query.modelId);
      }
      return model;
    }
    if (query instanceof GetPermittedModelByNameAndProviderQuery) {
      this.logger.debug('GetPermittedModelByNameAndProviderQuery', {
        query,
      });
      const model = await this.permittedModelsRepository.findOne({
        name: query.name,
        provider: query.provider,
        orgId: query.orgId,
      });
      if (!model) {
        this.logger.error('Permitted model not found', {
          query,
        });
        throw new PermittedModelNotFoundByNameAndProviderError(
          query.name,
          query.provider,
        );
      }
      return model;
    }
    this.logger.error('Invalid query', {
      query,
    });
    throw new ModelInvalidInputError('Invalid query', {
      query,
    });
  }
}
