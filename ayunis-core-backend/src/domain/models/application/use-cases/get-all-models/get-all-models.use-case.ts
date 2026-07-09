import { Injectable } from '@nestjs/common';
import { BaseUseCase } from 'src/common/use-case/base-use-case';
import { ModelsRepository } from '../../ports/models.repository';
import { Model } from 'src/domain/models/domain/model.entity';

@Injectable()
export class GetAllModelsUseCase extends BaseUseCase {
  constructor(private readonly modelsRepository: ModelsRepository) {
    super();
  }

  async execute(): Promise<Model[]> {
    this.logger.log('execute');

    return await this.modelsRepository.findAll();
  }
}
