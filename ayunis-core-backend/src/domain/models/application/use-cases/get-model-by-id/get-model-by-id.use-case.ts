import { Injectable } from '@nestjs/common';
import { BaseUseCase } from 'src/common/use-case/base-use-case';
import { Model } from 'src/domain/models/domain/model.entity';
import { ModelsRepository } from '../../ports/models.repository';
import { GetModelByIdQuery } from './get-model-by-id.query';
import { ModelNotFoundByIdError } from '../../models.errors';

@Injectable()
export class GetModelByIdUseCase extends BaseUseCase {
  constructor(private readonly modelsRepository: ModelsRepository) {
    super();
  }

  async execute(query: GetModelByIdQuery): Promise<Model> {
    this.logger.log('execute', { id: query.id });

    const model = await this.modelsRepository.findOne({ id: query.id });

    if (!model) {
      throw new ModelNotFoundByIdError(query.id);
    }

    return model;
  }
}
