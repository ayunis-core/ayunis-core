import { Injectable, Logger } from '@nestjs/common';
import { ModelWithConfig } from 'src/domain/models/domain/model-with-config.entity';
import { ModelsRepository } from '../../ports/models.repository';

@Injectable()
export class GetAllModelsUseCase {
  private readonly logger = new Logger(GetAllModelsUseCase.name);

  constructor(private readonly modelsRepository: ModelsRepository) {}

  async execute(): Promise<ModelWithConfig[]> {
    this.logger.log('execute');

    return await this.modelsRepository.findAll();
  }
}
