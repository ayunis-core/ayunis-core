import { ModelRegistry } from '../../registry/model.registry';
import { GetAvailableModelQuery } from './get-available-model.query';
import { Model } from 'src/domain/models/domain/model.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GetAvailableModelUseCase {
  constructor(private readonly modelRegistry: ModelRegistry) {}

  execute(query: GetAvailableModelQuery): Model {
    const model = this.modelRegistry.getAvailableModel(query.modelId);
    return model;
  }
}
