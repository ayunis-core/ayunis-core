import { ModelRegistry } from '../../registry/model.registry';
import { GetAvailableModelQuery } from './get-available-model.query';
import { ModelWithConfig } from 'src/domain/models/domain/model-with-config.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GetAvailableModelUseCase {
  constructor(private readonly modelRegistry: ModelRegistry) {}

  execute(query: GetAvailableModelQuery): ModelWithConfig {
    const model = this.modelRegistry.getAvailableModel(query.modelId);
    return model;
  }
}
