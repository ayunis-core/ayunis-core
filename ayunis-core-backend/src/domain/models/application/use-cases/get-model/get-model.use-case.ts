import { Injectable } from '@nestjs/common';
import { BaseUseCase } from 'src/common/use-case/base-use-case';
import { Model } from 'src/domain/models/domain/model.entity';
import { ModelsRepository } from '../../ports/models.repository';
import { GetModelQuery } from './get-model.query';
import { ModelNotFoundByNameAndProviderError } from '../../models.errors';

@Injectable()
export class GetModelUseCase extends BaseUseCase {
  constructor(private readonly modelsRepository: ModelsRepository) {
    super();
  }

  async execute(query: GetModelQuery): Promise<Model> {
    this.logger.log('execute', query);

    const model = await this.modelsRepository.findOne(query);

    if (!model) {
      throw new ModelNotFoundByNameAndProviderError(query.name, query.provider);
    }

    return model;
  }
}
