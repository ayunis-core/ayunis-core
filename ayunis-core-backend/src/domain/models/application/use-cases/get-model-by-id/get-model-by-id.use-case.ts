import { Injectable, Logger } from '@nestjs/common';
import { Model } from 'src/domain/models/domain/model.entity';
import { ModelsRepository } from '../../ports/models.repository';
import { GetModelByIdQuery } from './get-model-by-id.query';
import { ModelNotFoundByIdError } from '../../models.errors';

@Injectable()
export class GetModelByIdUseCase {
  private readonly logger = new Logger(GetModelByIdUseCase.name);

  constructor(private readonly modelsRepository: ModelsRepository) {}

  async execute(query: GetModelByIdQuery): Promise<Model> {
    this.logger.log('execute', { id: query.id });

    const model = await this.modelsRepository.findOne({ id: query.id });

    if (!model) {
      throw new ModelNotFoundByIdError(query.id);
    }

    return model;
  }
}
