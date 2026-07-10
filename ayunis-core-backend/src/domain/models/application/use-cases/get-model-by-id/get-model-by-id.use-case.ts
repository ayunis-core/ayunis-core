import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Model } from 'src/domain/models/domain/model.entity';
import { ModelsRepository } from '../../ports/models.repository';
import { GetModelByIdQuery } from './get-model-by-id.query';
import {
  ModelNotFoundByIdError,
  UnexpectedModelError,
} from '../../models.errors';

@Injectable()
export class GetModelByIdUseCase {
  private readonly logger = new Logger(GetModelByIdUseCase.name);

  constructor(private readonly modelsRepository: ModelsRepository) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(query: GetModelByIdQuery): Promise<Model> {
    this.logger.log('execute', { id: query.id });

    const model = await this.modelsRepository.findOne({ id: query.id });
    if (!model) {
      throw new ModelNotFoundByIdError(query.id);
    }

    return model;
  }
}
