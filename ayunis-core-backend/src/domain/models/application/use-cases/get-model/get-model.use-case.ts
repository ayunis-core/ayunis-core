import { Injectable, Logger } from '@nestjs/common';
import { Model } from 'src/domain/models/domain/model.entity';
import { ModelsRepository } from '../../ports/models.repository';
import { GetModelQuery } from './get-model.query';
import { ModelNotFoundByNameAndProviderError } from '../../models.errors';

@Injectable()
export class GetModelUseCase {
  private readonly logger = new Logger(GetModelUseCase.name);

  constructor(private readonly modelsRepository: ModelsRepository) {}

  async execute(query: GetModelQuery): Promise<Model> {
    this.logger.log('execute', query);

    const model = await this.modelsRepository.findOne(query);

    if (!model) {
      throw new ModelNotFoundByNameAndProviderError(query.name, query.provider);
    }

    return model;
  }
}
