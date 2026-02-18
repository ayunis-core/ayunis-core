import { Injectable, Logger } from '@nestjs/common';
import { ModelsRepository } from '../../ports/models.repository';
import { Model } from 'src/domain/models/domain/model.entity';

@Injectable()
export class GetAllModelsUseCase {
  private readonly logger = new Logger(GetAllModelsUseCase.name);

  constructor(private readonly modelsRepository: ModelsRepository) {}

  async execute(): Promise<Model[]> {
    this.logger.log('execute');

    return this.modelsRepository.findAll();
  }
}
