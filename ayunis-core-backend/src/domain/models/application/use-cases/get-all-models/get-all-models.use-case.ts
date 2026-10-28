import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ModelsRepository } from 'src/domain/models/application/ports/models.repository';
import { Model } from 'src/domain/models/domain/model.entity';
import { UnexpectedModelError } from 'src/domain/models/application/models.errors';

@Injectable()
export class GetAllModelsUseCase {
  private readonly logger = new Logger(GetAllModelsUseCase.name);

  constructor(private readonly modelsRepository: ModelsRepository) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(): Promise<Model[]> {
    this.logger.log('execute');

    return this.modelsRepository.findAll();
  }
}
