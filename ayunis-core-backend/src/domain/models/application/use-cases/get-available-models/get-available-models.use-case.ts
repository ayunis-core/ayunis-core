import { Injectable, Logger } from '@nestjs/common';
import { GetAvailableModelsQuery } from './get-available-models.query';
import { ModelRegistry } from '../../registry/model.registry';
import { Model } from 'src/domain/models/domain/model.entity';

@Injectable()
export class GetAvailableModelsUseCase {
  private readonly logger = new Logger(GetAvailableModelsUseCase.name);

  constructor(private readonly modelRegistry: ModelRegistry) {}

  execute(query: GetAvailableModelsQuery): Model[] {
    this.logger.log('getAvailableModels', query);
    const allModels = this.modelRegistry.getAllAvailableModels();
    this.logger.debug('All available models', {
      allModels,
    });
    return allModels;
  }
}
