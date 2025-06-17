import { Injectable, Logger } from '@nestjs/common';
import { GetAvailableModelsQuery } from './get-available-models.query';
import { ModelRegistry } from '../../registry/model.registry';
import { ModelWithConfig } from 'src/domain/models/domain/model-with-config.entity';

@Injectable()
export class GetAvailableModelsUseCase {
  private readonly logger = new Logger(GetAvailableModelsUseCase.name);

  constructor(private readonly modelRegistry: ModelRegistry) {}

  execute(query: GetAvailableModelsQuery): ModelWithConfig[] {
    this.logger.log('getAvailableModels', query);
    const allModelsWithConfig = this.modelRegistry.getAllAvailableModels();
    this.logger.debug('All available models with config', {
      allModelsWithConfig,
    });
    return allModelsWithConfig;
  }
}
