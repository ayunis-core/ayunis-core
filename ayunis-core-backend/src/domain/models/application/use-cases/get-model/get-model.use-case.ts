import { Injectable, Logger } from '@nestjs/common';
import { ModelWithConfig } from 'src/domain/models/domain/model-with-config.entity';
import { ModelsRepository } from '../../ports/models.repository';
import { GetModelQuery } from './get-model.query';
import {
  ModelNotFoundByIdError,
  ModelNotFoundByNameAndProviderError,
} from '../../models.errors';

@Injectable()
export class GetModelUseCase {
  private readonly logger = new Logger(GetModelUseCase.name);

  constructor(private readonly modelsRepository: ModelsRepository) {}

  async execute(query: GetModelQuery): Promise<ModelWithConfig> {
    this.logger.log('execute', query);

    const model = await this.modelsRepository.findOne(query);

    if (!model) {
      throw new ModelNotFoundByNameAndProviderError(query.name, query.provider);
    }

    return model;
  }
}
